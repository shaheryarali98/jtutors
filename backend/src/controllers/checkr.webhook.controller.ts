import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getReport, getCandidate, mapCheckrStatus } from '../services/checkr.service';
import { sendEmail } from '../services/email.service';
import { calculateProfileCompletion } from './tutor.controller';

const prisma = new PrismaClient();

/**
 * Called when a tutor clicks "Start Background Check".
 * Creates a minimal BackgroundCheck placeholder so the webhook can match
 * the tutor later by email when they complete the Checkr apply-link form.
 * Also returns the CHECKR_APPLY_URL so the frontend can redirect the tutor.
 */
export const startBackgroundCheck = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    console.log('[startBackgroundCheck] Starting for userId:', userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, tutor: { select: { id: true, firstName: true } } },
    });

    if (!user) {
      console.error('[startBackgroundCheck] User not found:', userId);
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (!user.tutor) {
      console.error('[startBackgroundCheck] Tutor profile not found for userId:', userId);
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const tutorId = user.tutor.id;
    const email = user.email;
    const firstName = user.tutor.firstName || 'Tutor';

    console.log('[startBackgroundCheck] Creating/updating background check for tutorId:', tutorId);

    // Create or update a minimal placeholder record
    const existing = await prisma.backgroundCheck.findUnique({ where: { tutorId } });
    if (!existing) {
      await prisma.backgroundCheck.create({
        data: {
          tutorId,
          email,
          fullLegalFirstName: firstName,
          status: 'PENDING',
        },
      });
      console.log('[startBackgroundCheck] Created new background check record');

      // Send welcome email on first submission
      await sendEmail({
        to: email,
        subject: '🎯 Background Check Started - JTutors',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f5a11a; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h2 style="margin: 0; font-size: 24px;">🎯 Background Check Started</h2>
            </div>
            <div style="background-color: #fffaf0; padding: 30px; border: 1px solid #fed7aa;">
              <p style="font-size: 16px; color: #1f2937; margin: 0 0 20px 0;">
                Hi ${firstName},
              </p>
              <p style="font-size: 14px; color: #1f2937; margin: 0 0 15px 0;">
                A Checkr form window should have opened in your browser. If not, you can <a href="${process.env.CHECKR_APPLY_URL}" style="color: #f5a11a; text-decoration: underline;">click here to open the form</a>.
              </p>
              <div style="background-color: white; border-left: 4px solid #f5a11a; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #374151; font-size: 14px;">
                  <strong>What you'll need:</strong>
                </p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #374151; font-size: 14px;">
                  <li>Your legal name & date of birth</li>
                  <li>Your Social Security Number</li>
                  <li>Your current address</li>
                  <li>Driver's License (if you have one)</li>
                </ul>
              </div>
              <p style="font-size: 14px; color: #1f2937; margin: 15px 0;">
                The process typically takes 5-10 minutes. Your information is encrypted and processed securely by Checkr.
              </p>
              <div style="background-color: #fef3c7; border: 1px solid #fcd34d; padding: 12px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 13px;">
                  <strong>💡 Tip:</strong> Have your information ready before starting. This makes the process faster!
                </p>
              </div>
              <div style="background-color: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 4px; margin-top: 20px; text-align: center;">
                <a href="${process.env.CHECKR_APPLY_URL}" style="background-color: #f5a11a; color: white; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Open Checkr Form
                </a>
              </div>
              <p style="font-size: 12px; color: #6b7280; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                After you submit the form, our admin team will review your background check within 1-3 business days. You'll receive an email with the results.
              </p>
            </div>
          </div>
        `,
        text: `Hi ${firstName}, a Checkr form has been opened for your background check. If the window didn't open, you can access it here: ${process.env.CHECKR_APPLY_URL}. The process takes 5-10 minutes. Have your legal name, date of birth, Social Security Number, current address, and driver's license (if applicable) ready. Our team will review within 1-3 business days.`,
      }).catch((err) => console.error('[startBackgroundCheck] Failed to send welcome email:', err));
    } else {
      console.log('[startBackgroundCheck] Background check already exists for tutorId:', tutorId);
    }

    const applyUrl = process.env.CHECKR_APPLY_URL;
    if (!applyUrl) {
      console.error('[startBackgroundCheck] CHECKR_APPLY_URL not configured in environment');
      return res.status(500).json({ error: 'Checkr is not configured. Please contact support.' });
    }

    console.log('[startBackgroundCheck] Returning applyUrl successfully');
    res.json({ applyUrl });
  } catch (error) {
    console.error('[startBackgroundCheck] Error:', error);
    res.status(500).json({ error: 'Failed to start background check. Please try again.' });
  }
};

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
    let emailContent = {
      subject: '',
      html: '',
      text: '',
    };

    if (internalStatus === 'APPROVED') {
      emailContent = {
        subject: '🎉 Your Background Check is Approved! - JTutors',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h2 style="margin: 0; font-size: 24px;">✓ Background Check Approved</h2>
            </div>
            <div style="background-color: #f0fdf4; padding: 30px; border: 1px solid #d1fae5;">
              <p style="font-size: 16px; color: #1f2937; margin: 0 0 20px 0;">
                Great news! Your background check has been successfully approved. 🎉
              </p>
              <div style="background-color: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #374151; font-size: 14px;">
                  <strong>What's next?</strong><br/>
                  Your profile is now fully active and visible to students. You can start accepting bookings right away!
                </p>
              </div>
              <ul style="color: #1f2937; font-size: 14px; margin: 20px 0; padding-left: 20px;">
                <li>Your verified status is now displayed on your profile</li>
                <li>Students can begin booking sessions with you</li>
                <li>Payments will be processed according to your Stripe payout schedule</li>
              </ul>
              <div style="background-color: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 4px; margin-top: 20px; text-align: center;">
                <a href="https://app.jtutor.com/dashboard" style="background-color: #10b981; color: white; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Go to Dashboard
                </a>
              </div>
              <p style="font-size: 12px; color: #6b7280; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                If you have any questions, please contact our support team at support@jtutor.com
              </p>
            </div>
          </div>
        `,
        text: 'Great news! Your background check has been successfully approved. Your profile is now fully active and visible to students. You can start accepting bookings right away! Go to your dashboard to view your updated profile.',
      };
    } else if (internalStatus === 'REVIEW') {
      emailContent = {
        subject: '⏳ Background Check Under Review - JTutors',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h2 style="margin: 0; font-size: 24px;">⏳ Under Review</h2>
            </div>
            <div style="background-color: #fffbeb; padding: 30px; border: 1px solid #fde68a;">
              <p style="font-size: 16px; color: #1f2937; margin: 0 0 20px 0;">
                Your background check requires additional verification and is currently under review by our team.
              </p>
              <div style="background-color: white; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #374151; font-size: 14px;">
                  <strong>What happens next?</strong><br/>
                  Our admin team will review your information. This typically takes 2-3 business days. If we need any clarification, we'll contact you directly.
                </p>
              </div>
              <p style="font-size: 14px; color: #1f2937; margin: 15px 0;">
                You'll receive another email once the review is complete. In the meantime, you can continue setting up your profile.
              </p>
              <div style="background-color: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 4px; margin-top: 20px; text-align: center;">
                <a href="https://app.jtutor.com/dashboard" style="background-color: #f59e0b; color: white; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
                  View Dashboard
                </a>
              </div>
              <p style="font-size: 12px; color: #6b7280; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                Questions? Contact support@jtutor.com
              </p>
            </div>
          </div>
        `,
        text: 'Your background check is under review by our admin team. This typically takes 2-3 business days. If we need any clarification, we\'ll reach out directly. You\'ll receive another email once the review is complete.',
      };
    } else {
      emailContent = {
        subject: '📋 Background Check Submitted - JTutors',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h2 style="margin: 0; font-size: 24px;">📋 Submitted</h2>
            </div>
            <div style="background-color: #eff6ff; padding: 30px; border: 1px solid #bfdbfe;">
              <p style="font-size: 16px; color: #1f2937; margin: 0 0 20px 0;">
                Thank you! Your background check has been received and is being processed.
              </p>
              <div style="background-color: white; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #374151; font-size: 14px;">
                  <strong>Processing Timeline</strong><br/>
                  Most background checks are completed within 1-3 business days. We'll send you an email once it's approved or if we need more information.
                </p>
              </div>
              <p style="font-size: 14px; color: #1f2937; margin: 15px 0;">
                While you wait, you can complete other sections of your profile like education, experience, and availability to maximize your chances of getting booked.
              </p>
              <div style="background-color: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 4px; margin-top: 20px; text-align: center;">
                <a href="https://app.jtutor.com/dashboard" style="background-color: #3b82f6; color: white; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Complete Your Profile
                </a>
              </div>
              <p style="font-size: 12px; color: #6b7280; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                Need help? Contact support@jtutor.com
              </p>
            </div>
          </div>
        `,
        text: 'Thank you! Your background check has been submitted. Most checks are completed within 1-3 business days. You\'ll receive an email once it\'s approved or if we need additional information.',
      };
    }

    await sendEmail({
      to: tutorEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
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
