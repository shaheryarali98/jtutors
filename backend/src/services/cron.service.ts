import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CRON_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const ALERT_COOLDOWN_MS = 12 * 60 * 60 * 1000; // one failure email per 12h at most
let lastFailureAlertAt = 0;

/**
 * Email the admin inbox when tutor payouts fail, so a broken payout never
 * sits unnoticed in the server log again.
 */
async function alertPayoutFailures(failures: { sessionId: string; error: string }[]) {
  if (failures.length === 0) return;
  if (Date.now() - lastFailureAlertAt < ALERT_COOLDOWN_MS) return;
  try {
    const { sendEmail } = await import('./email.service');
    const to = process.env.CONTACT_EMAIL || 'info@jtutors.com';
    const rows = failures.map(f => `<li>Session ${f.sessionId}: ${f.error}</li>`).join('');
    await sendEmail({
      to,
      subject: `[JTutors] ${failures.length} tutor payout(s) failed`,
      html: `<p>The automatic payout job could not pay the tutor for these sessions:</p><ul>${rows}</ul><p>Open Admin &rarr; Bookings to retry with "Release Payment". If the error says "balance insufficient", add funds to the Stripe Payments balance.</p>`,
      text: `Tutor payouts failed:\n${failures.map(f => `- ${f.sessionId}: ${f.error}`).join('\n')}`,
    });
    lastFailureAlertAt = Date.now();
  } catch (err: any) {
    console.error('[Cron] Could not send payout failure alert:', err.message);
  }
}

/**
 * Pull back duplicate payouts from tutors whose Stripe balance now has funds.
 */
async function runDuplicateRecovery() {
  try {
    const { attemptDuplicateRecovery } = await import('./duplicatePayout.service');
    const result = await attemptDuplicateRecovery();
    if (result.attempted > 0) {
      console.log(`[Cron] Duplicate recovery: ${result.attempted} attempted, $${result.recovered.toFixed(2)} recovered, ${result.stillOpen} still open.`);
    }
  } catch (err: any) {
    console.error('[Cron] Duplicate recovery error:', err.message);
  }
}

/**
 * Auto-release payments for sessions where the tutor has marked complete
 * but the student has not confirmed within the 24-hour window.
 */
async function runAutoRelease() {
  try {
    const overdue = await prisma.classSession.findMany({
      where: {
        status: 'COMPLETED',
        tutorApproved: true,
        paymentReleased: false,
        autoReleaseAt: { lte: new Date() },
      },
      include: {
        booking: { include: { payment: true } },
      },
      // Oldest debt first, so a tutor who has waited longest is paid before
      // newer sessions use up whatever balance is available.
      orderBy: { autoReleaseAt: 'asc' },
    });

    if (overdue.length === 0) return;

    console.log(`[Cron] Auto-release check: ${overdue.length} session(s) overdue.`);

    const { releasePaymentToTutor } = await import('./paymentRelease.service');
    const failures: { sessionId: string; error: string }[] = [];

    for (const session of overdue) {
      if (!session.booking.payment || session.booking.payment.paymentStatus !== 'PAID') {
        console.log(`[Cron] Skipping session ${session.id} — no paid payment.`);
        continue;
      }
      try {
        const result = await releasePaymentToTutor(session.id);
        if (result.success) {
          console.log(`[Cron] ✅ Auto-released payment for session ${session.id}`);
        } else {
          console.warn(`[Cron] ⚠️ Release failed for session ${session.id}: ${result.error}`);
          failures.push({ sessionId: session.id, error: result.error || 'unknown' });
        }
      } catch (err: any) {
        console.error(`[Cron] ❌ Error releasing session ${session.id}:`, err.message);
        failures.push({ sessionId: session.id, error: err.message });
      }
    }
    await alertPayoutFailures(failures);
  } catch (err: any) {
    console.error('[Cron] Auto-release error:', err.message);
  }
}

export function startCronJobs() {
  // Run once on startup (catches any missed releases from downtime)
  runAutoRelease().then(runDuplicateRecovery);
  // Then run every 30 minutes
  setInterval(() => runAutoRelease().then(runDuplicateRecovery), CRON_INTERVAL_MS);
  console.log('✅ Cron jobs started (auto-release + duplicate recovery every 30 min)');
}
