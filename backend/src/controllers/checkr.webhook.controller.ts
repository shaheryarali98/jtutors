import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getReport, getCandidate, mapCheckrStatus } from '../services/checkr.service';
import { sendEmail } from '../services/email.service';
import { calculateProfileCompletion } from './tutor.controller';

const prisma = new PrismaClient();

/**
 * Handle Checkr webhooks
 * Checkr sends POST requests to this endpoint for various events:
 * - report.completed
 * - report.upgraded  
 * - invitation.completed
 * - invitation.expired
 * etc.
 */
export const handleCheckrWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.body;
    
    console.log('[Checkr Webhook] Received event:', event.type, JSON.stringify(event, null, 2));

    switch (event.type) {
      case 'report.completed':
      case 'report.upgraded':
        await handleReportCompleted(event);
        break;

      case 'invitation.completed':
        await handleInvitationCompleted(event);
        break;

      case 'invitation.expired':
        await handleInvitationExpired(event);
        break;

      case 'candidate.created':
        console.log('[Checkr Webhook] Candidate created:', event.data?.object?.id);
        break;

      default:
        console.log('[Checkr Webhook] Unhandled event type:', event.type);
    }

    // Always respond 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Checkr Webhook] Error processing webhook:', error);
    // Still return 200 to prevent Checkr from retrying
    res.status(200).json({ received: true, error: 'Processing error' });
  }
};

async function handleReportCompleted(event: any) {
  const reportId = event.data?.object?.id;
  const candidateId = event.data?.object?.candidate_id;
  const reportStatus = event.data?.object?.status; // 'clear', 'consider', 'suspended'

  if (!reportId) {
    console.warn('[Checkr Webhook] Report completed but no report ID found');
    return;
  }

  console.log(`[Checkr Webhook] Report ${reportId} completed with status: ${reportStatus}`);

  // Find the background check by Checkr candidate ID or report ID
  let backgroundCheck = await prisma.backgroundCheck.findFirst({
    where: {
      OR: [
        { checkrReportId: reportId },
        { checkrCandidateId: candidateId },
      ],
    },
    include: {
      tutor: {
        include: {
          user: { select: { email: true } },
        },
      },
    },
  });

  // Fallback: if the tutor used the apply link (no candidate pre-created in our DB),
  // fetch the candidate's email from Checkr and match by the email stored on the
  // BackgroundCheck record.
  if (!backgroundCheck && candidateId) {
    try {
      const candidate = await getCandidate(candidateId);
      const candidateEmail = candidate?.email;
      if (candidateEmail) {
        console.log(`[Checkr Webhook] Trying email fallback match for: ${candidateEmail}`);
        backgroundCheck = await prisma.backgroundCheck.findFirst({
          where: { email: candidateEmail },
          include: {
            tutor: {
              include: {
                user: { select: { email: true } },
              },
            },
          },
        });
        // Stamp the candidate ID so future webhooks match directly
        if (backgroundCheck) {
          await prisma.backgroundCheck.update({
            where: { id: backgroundCheck.id },
            data: { checkrCandidateId: candidateId },
          });
        }
      }
    } catch (err) {
      console.warn('[Checkr Webhook] Could not fetch candidate for email fallback:', err);
    }
  }

  if (!backgroundCheck) {
    console.warn(`[Checkr Webhook] No background check found for report ${reportId} / candidate ${candidateId}`);
    return;
  }

  const internalStatus = mapCheckrStatus(reportStatus);

  await prisma.backgroundCheck.update({
    where: { id: backgroundCheck.id },
    data: {
      checkrReportId: reportId,
      checkrStatus: reportStatus,
      status: internalStatus,
      checkrCompletedAt: new Date(),
    },
  });

  // If approved (clear), mark tutor background check as completed
  if (internalStatus === 'APPROVED') {
    await prisma.tutor.update({
      where: { id: backgroundCheck.tutorId },
      data: { backgroundCheckCompleted: true },
    });
  }

  // Recalculate profile completion so profileCompleted / public listing stay in sync
  await calculateProfileCompletion(backgroundCheck.tutorId);

  // Send email notification to the tutor
  const tutorEmail = backgroundCheck.tutor?.user?.email;
  if (tutorEmail) {
    const statusMessage =
      internalStatus === 'APPROVED'
        ? 'Your background check has been approved! Your profile is now complete.'
        : internalStatus === 'REVIEW'
        ? 'Your background check requires additional review. Our team will reach out shortly.'
        : 'Your background check is still being processed.';

    await sendEmail({
      to: tutorEmail,
      subject: `JTutors Background Check Update`,
      html: `
        <h2>Background Check Update</h2>
        <p>${statusMessage}</p>
        <p>Log in to your dashboard to see the full status.</p>
        <p>Best regards,<br/>The JTutors Team</p>
      `,
      text: statusMessage,
    }).catch((err) => console.error('[Checkr Webhook] Failed to send email:', err));
  }

  console.log(`[Checkr Webhook] Background check ${backgroundCheck.id} updated to ${internalStatus}`);
}

async function handleInvitationCompleted(event: any) {
  const invitationId = event.data?.object?.id;
  const candidateId = event.data?.object?.candidate_id;
  const reportId = event.data?.object?.report_id;

  if (!invitationId) return;

  console.log(`[Checkr Webhook] Invitation ${invitationId} completed`);

  const backgroundCheck = await prisma.backgroundCheck.findFirst({
    where: {
      OR: [
        { checkrInvitationId: invitationId },
        { checkrCandidateId: candidateId },
      ],
    },
  });

  if (!backgroundCheck) {
    // Apply-link fallback: match by candidate email
    let matched = false;
    if (candidateId) {
      try {
        const candidate = await getCandidate(candidateId);
        if (candidate?.email) {
          const byEmail = await prisma.backgroundCheck.findFirst({ where: { email: candidate.email } });
          if (byEmail) {
            await prisma.backgroundCheck.update({
              where: { id: byEmail.id },
              data: {
                checkrCandidateId: candidateId,
                checkrInvitationId: invitationId,
                ...(reportId && { checkrReportId: reportId }),
                status: 'PENDING',
              },
            });
            matched = true;
          }
        }
      } catch (err) {
        console.warn('[Checkr Webhook] Could not fetch candidate for invitation email fallback:', err);
      }
    }
    if (!matched) {
      console.warn(`[Checkr Webhook] No background check found for invitation ${invitationId}`);
    }
    return;
  }

  // Update with the report ID if we have it
  await prisma.backgroundCheck.update({
    where: { id: backgroundCheck.id },
    data: {
      ...(reportId && { checkrReportId: reportId }),
      status: 'PENDING', // Report is now processing
    },
  });
}

async function handleInvitationExpired(event: any) {
  const invitationId = event.data?.object?.id;

  if (!invitationId) return;

  console.log(`[Checkr Webhook] Invitation ${invitationId} expired`);

  const backgroundCheck = await prisma.backgroundCheck.findFirst({
    where: { checkrInvitationId: invitationId },
  });

  if (!backgroundCheck) return;

  await prisma.backgroundCheck.update({
    where: { id: backgroundCheck.id },
    data: {
      status: 'EXPIRED',
    },
  });
}
