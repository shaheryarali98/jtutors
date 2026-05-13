import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CRON_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

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
    });

    if (overdue.length === 0) return;

    console.log(`[Cron] Auto-release check: ${overdue.length} session(s) overdue.`);

    const { releasePaymentToTutor } = await import('./paymentRelease.service');

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
        }
      } catch (err: any) {
        console.error(`[Cron] ❌ Error releasing session ${session.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('[Cron] Auto-release error:', err.message);
  }
}

export function startCronJobs() {
  // Run once on startup (catches any missed releases from downtime)
  runAutoRelease();
  // Then run every 30 minutes
  setInterval(runAutoRelease, CRON_INTERVAL_MS);
  console.log('✅ Cron jobs started (auto-release every 30 min)');
}
