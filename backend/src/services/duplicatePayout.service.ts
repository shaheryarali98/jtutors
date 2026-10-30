import { PrismaClient } from '@prisma/client';
import { getConnectedAvailableCents, reverseTransfer, retrieveCharge, confirmPaymentIntent, listTransfersToAccount } from './stripe.service';
import { sendTemplatedEmail } from './emailTemplate.service';

const prisma = new PrismaClient();

const toCents = (n: number) => Math.round(n * 100);
const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

/**
 * Every duplicate payout, grouped per tutor, with totals. Used by the admin
 * dashboard.
 */
export const listDuplicatePayouts = async () => {
  const rows = await prisma.duplicatePayout.findMany({
    include: { tutor: { include: { user: { select: { email: true } } } } },
    orderBy: [{ tutorId: 'asc' }, { sessionDate: 'asc' }],
  });

  const byTutor = new Map<string, any>();
  for (const r of rows) {
    const key = r.tutorId;
    if (!byTutor.has(key)) {
      byTutor.set(key, {
        tutorId: r.tutorId,
        tutorName: [r.tutor.firstName, r.tutor.lastName].filter(Boolean).join(' ').trim() || r.tutor.user.email,
        email: r.tutor.user.email,
        stripeAccountId: r.tutor.stripeAccountId,
        duplicateCount: 0,
        duplicateTotal: 0,
        recoveredTotal: 0,
        outstandingTotal: 0,
        writtenOffTotal: 0,
        lastAttemptAt: null as Date | null,
        lastError: null as string | null,
        noticeSentAt: null as Date | null,
        items: [] as any[],
      });
    }
    const t = byTutor.get(key);
    const outstanding = r.status === 'WRITTEN_OFF' ? 0 : Math.max(0, r.amount - r.recoveredAmount);
    t.duplicateCount += 1;
    t.duplicateTotal += r.amount;
    t.recoveredTotal += r.recoveredAmount;
    t.outstandingTotal += outstanding;
    if (r.status === 'WRITTEN_OFF') t.writtenOffTotal += r.amount - r.recoveredAmount;
    if (r.lastAttemptAt && (!t.lastAttemptAt || r.lastAttemptAt > t.lastAttemptAt)) {
      t.lastAttemptAt = r.lastAttemptAt;
      t.lastError = r.lastError;
    }
    if (r.noticeSentAt && (!t.noticeSentAt || r.noticeSentAt > t.noticeSentAt)) t.noticeSentAt = r.noticeSentAt;
    t.items.push({
      id: r.id,
      sessionDate: r.sessionDate,
      originalTransferId: r.originalTransferId,
      duplicateTransferId: r.duplicateTransferId,
      amount: r.amount,
      recoveredAmount: r.recoveredAmount,
      status: r.status,
      lastAttemptAt: r.lastAttemptAt,
      lastError: r.lastError,
    });
  }

  const tutors = [...byTutor.values()].map(t => ({
    ...t,
    duplicateTotal: Number(money(t.duplicateTotal)),
    recoveredTotal: Number(money(t.recoveredTotal)),
    outstandingTotal: Number(money(t.outstandingTotal)),
    writtenOffTotal: Number(money(t.writtenOffTotal)),
  }));
  tutors.sort((a, b) => b.outstandingTotal - a.outstandingTotal);

  return {
    tutors,
    totals: {
      duplicateTotal: Number(money(tutors.reduce((a, t) => a + t.duplicateTotal, 0))),
      recoveredTotal: Number(money(tutors.reduce((a, t) => a + t.recoveredTotal, 0))),
      outstandingTotal: Number(money(tutors.reduce((a, t) => a + t.outstandingTotal, 0))),
    },
  };
};

/**
 * Try to pull outstanding duplicates back from each tutor's Stripe balance.
 * Safe to run as often as you like: it only touches OPEN rows, reverses at
 * most what the tutor actually has available, and records every attempt.
 */
export const attemptDuplicateRecovery = async (opts: { tutorId?: string } = {}) => {
  const open = await prisma.duplicatePayout.findMany({
    where: { status: 'OPEN', ...(opts.tutorId ? { tutorId: opts.tutorId } : {}) },
    include: { tutor: true },
    orderBy: { sessionDate: 'asc' },
  });

  const summary = { attempted: 0, recovered: 0, stillOpen: 0, errors: [] as string[] };
  if (open.length === 0) return summary;

  const byTutor = new Map<string, typeof open>();
  for (const r of open) {
    if (!byTutor.has(r.tutorId)) byTutor.set(r.tutorId, []);
    byTutor.get(r.tutorId)!.push(r);
  }

  for (const [, rows] of byTutor) {
    const acct = rows[0].tutor.stripeAccountId;
    if (!acct) {
      summary.stillOpen += rows.length;
      continue;
    }

    let availableCents = 0;
    try {
      availableCents = await getConnectedAvailableCents(acct);
    } catch (err: any) {
      summary.errors.push(`balance lookup failed for ${acct}: ${err.message}`);
      summary.stillOpen += rows.length;
      continue;
    }

    for (const r of rows) {
      const remainingCents = toCents(r.amount) - toCents(r.recoveredAmount);
      if (remainingCents <= 0) {
        await prisma.duplicatePayout.update({ where: { id: r.id }, data: { status: 'RECOVERED' } });
        continue;
      }
      if (availableCents <= 0) {
        summary.stillOpen += 1;
        continue;
      }

      const takeCents = Math.min(remainingCents, availableCents);
      summary.attempted += 1;
      try {
        await reverseTransfer(
          r.duplicateTransferId,
          takeCents,
          `Duplicate payout correction${r.sessionDate ? ` for session ${r.sessionDate.toISOString().slice(0, 10)}` : ''}`
        );
        availableCents -= takeCents;
        const newRecovered = (toCents(r.recoveredAmount) + takeCents) / 100;
        const done = toCents(newRecovered) >= toCents(r.amount);
        await prisma.duplicatePayout.update({
          where: { id: r.id },
          data: {
            recoveredAmount: newRecovered,
            status: done ? 'RECOVERED' : 'OPEN',
            lastAttemptAt: new Date(),
            lastError: null,
          },
        });
        summary.recovered += takeCents / 100;
        if (!done) summary.stillOpen += 1;
        console.log(`[DuplicateRecovery] ${r.duplicateTransferId}: pulled back $${money(takeCents / 100)}${done ? ' (complete)' : ''}`);
      } catch (err: any) {
        summary.stillOpen += 1;
        summary.errors.push(`${r.duplicateTransferId}: ${err.message}`);
        await prisma.duplicatePayout.update({
          where: { id: r.id },
          data: { lastAttemptAt: new Date(), lastError: String(err.message || err).slice(0, 500) },
        });
      }
    }
  }

  summary.recovered = Number(money(summary.recovered));
  return summary;
};

/**
 * Email one tutor a statement of their duplicates and what is still owed.
 */
export const sendDuplicateNotice = async (tutorId: string) => {
  const rows = await prisma.duplicatePayout.findMany({
    where: { tutorId },
    include: { tutor: { include: { user: true } } },
    orderBy: { sessionDate: 'asc' },
  });
  if (rows.length === 0) throw new Error('No duplicate payouts recorded for this tutor');

  const tutor = rows[0].tutor;
  const duplicateTotal = rows.reduce((a, r) => a + r.amount, 0);
  const recoveredTotal = rows.reduce((a, r) => a + r.recoveredAmount, 0);
  const outstandingTotal = rows
    .filter(r => r.status !== 'WRITTEN_OFF')
    .reduce((a, r) => a + Math.max(0, r.amount - r.recoveredAmount), 0);
  const sessionList = rows
    .map(r => `${r.sessionDate ? r.sessionDate.toISOString().slice(0, 10) : 'unknown date'} ($${money(r.amount)})`)
    .join(', ');

  await sendTemplatedEmail('DUPLICATE_PAYOUT_NOTICE', tutor.user.email, {
    tutorName: [tutor.firstName, tutor.lastName].filter(Boolean).join(' ').trim() || tutor.user.email,
    sessionCount: rows.length,
    duplicateTotal: money(duplicateTotal),
    recoveredTotal: money(recoveredTotal),
    outstandingTotal: money(outstandingTotal),
    sessionList,
  });

  await prisma.duplicatePayout.updateMany({ where: { tutorId }, data: { noticeSentAt: new Date() } });
  return { email: tutor.user.email, outstandingTotal: Number(money(outstandingTotal)) };
};

/**
 * Give up on recovering one duplicate (for example an inactive tutor).
 */
export const writeOffDuplicate = async (id: string) => {
  return prisma.duplicatePayout.update({ where: { id }, data: { status: 'WRITTEN_OFF' } });
};

/**
 * Scan Stripe for sessions that were paid twice and record them. A session
 * counts as a duplicate when the student's charge already carried a transfer
 * to the tutor AND a separate release transfer with the same classSessionId
 * exists. Re-running only adds rows that are not recorded yet and refreshes
 * the recovered amount on existing ones.
 */
export const importDuplicatesFromStripe = async () => {
  const sessions = await prisma.classSession.findMany({
    where: { paymentReleased: true, paymentReleasedAt: { not: null }, booking: { payment: { paymentStatus: 'PAID' } } },
    include: { booking: { include: { payment: true, tutor: true } } },
  });

  const summary = { scanned: 0, added: 0, updated: 0, skipped: 0, errors: [] as string[] };
  const transfersByAccount = new Map<string, Awaited<ReturnType<typeof listTransfersToAccount>>>();

  for (const cs of sessions) {
    const payment = cs.booking.payment;
    const tutor = cs.booking.tutor;
    if (!payment || !tutor.stripeAccountId) { summary.skipped += 1; continue; }
    summary.scanned += 1;

    try {
      let chargeId = payment.stripeChargeId || payment.stripePaymentIntentId || '';
      if (chargeId.startsWith('pi_')) {
        const intent = await confirmPaymentIntent(chargeId);
        const latest = intent?.latest_charge;
        chargeId = (typeof latest === 'string' ? latest : latest?.id) || '';
      }
      if (!chargeId) { summary.skipped += 1; continue; }

      const charge = await retrieveCharge(chargeId);
      const orig = charge?.transfer;
      const originalTransferId = typeof orig === 'string' ? orig : orig?.id;
      if (!originalTransferId) { summary.skipped += 1; continue; } // held-and-released session, paid once

      if (!transfersByAccount.has(tutor.stripeAccountId)) {
        transfersByAccount.set(tutor.stripeAccountId, await listTransfersToAccount(tutor.stripeAccountId));
      }
      const dupes = transfersByAccount
        .get(tutor.stripeAccountId)!
        .filter(t => t.metadata?.classSessionId === cs.id && t.id !== originalTransferId);

      for (const d of dupes) {
        const amount = d.amount / 100;
        const recoveredAmount = d.amount_reversed / 100;
        const existing = await prisma.duplicatePayout.findUnique({ where: { duplicateTransferId: d.id } });
        if (existing) {
          if (existing.status !== 'WRITTEN_OFF' && toCents(existing.recoveredAmount) !== toCents(recoveredAmount)) {
            await prisma.duplicatePayout.update({
              where: { id: existing.id },
              data: { recoveredAmount, status: toCents(recoveredAmount) >= toCents(amount) ? 'RECOVERED' : 'OPEN' },
            });
            summary.updated += 1;
          }
          continue;
        }
        await prisma.duplicatePayout.create({
          data: {
            tutorId: tutor.id,
            classSessionId: cs.id,
            sessionDate: cs.booking.startTime,
            originalTransferId,
            duplicateTransferId: d.id,
            amount,
            recoveredAmount,
            status: toCents(recoveredAmount) >= toCents(amount) ? 'RECOVERED' : 'OPEN',
            lastAttemptAt: d.amount_reversed > 0 ? new Date() : null,
          },
        });
        summary.added += 1;
      }
    } catch (err: any) {
      summary.errors.push(`${cs.id}: ${err.message}`);
    }
  }
  return summary;
};
