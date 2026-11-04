import { PrismaClient } from '@prisma/client';
import { getConnectedAvailableCents, reverseTransfer, retrieveCharge, confirmPaymentIntent, listTransfersToAccount, retrieveTransfer } from './stripe.service';
import { sendTemplatedEmail } from './emailTemplate.service';

const prisma = new PrismaClient();

const toCents = (n: number) => Math.round(n * 100);
const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

/**
 * How much this tutor still holds from duplicate payouts, in cents.
 * While this is above zero the tutor is not sent new money: their share of
 * each new session is kept by the platform and applied here instead.
 */
export const getOpenDuplicateCents = async (tutorId: string): Promise<number> => {
  const rows = await prisma.duplicatePayout.findMany({
    where: { tutorId, status: 'OPEN' },
    select: { amount: true, recoveredAmount: true },
  });
  return rows.reduce((a, r) => a + Math.max(0, toCents(r.amount) - toCents(r.recoveredAmount)), 0);
};

export type SettlementApplied = { duplicatePayoutId: string; settlementId: string; cents: number };

/**
 * Apply a session's tutor share (kept on the platform, never transferred)
 * against the tutor's oldest open duplicates. Returns exactly what was
 * applied so the caller can undo it if the rest of the release fails.
 */
export const settleAgainstDuplicates = async (
  tutorId: string,
  classSessionId: string,
  cents: number
): Promise<SettlementApplied[]> => {
  const applied: SettlementApplied[] = [];
  if (cents <= 0) return applied;
  const open = await prisma.duplicatePayout.findMany({
    where: { tutorId, status: 'OPEN' },
    orderBy: { sessionDate: 'asc' },
  });
  let left = cents;
  for (const r of open) {
    if (left <= 0) break;
    const remaining = toCents(r.amount) - toCents(r.recoveredAmount);
    if (remaining <= 0) continue;
    const take = Math.min(remaining, left);
    const settlementId = await prisma.$transaction(async tx => {
      const s = await tx.duplicateSettlement.create({
        data: { duplicatePayoutId: r.id, classSessionId, amount: take / 100 },
      });
      const newRecovered = (toCents(r.recoveredAmount) + take) / 100;
      await tx.duplicatePayout.update({
        where: { id: r.id },
        data: {
          recoveredAmount: newRecovered,
          settledAmount: (toCents(r.settledAmount) + take) / 100,
          status: toCents(newRecovered) >= toCents(r.amount) ? 'RECOVERED' : 'OPEN',
          lastAttemptAt: new Date(),
          lastError: null,
        },
      });
      return s.id;
    });
    applied.push({ duplicatePayoutId: r.id, settlementId, cents: take });
    left -= take;
    console.log(`[DuplicateSettle] kept $${money(take / 100)} of session ${classSessionId} against ${r.duplicateTransferId}`);
  }
  return applied;
};

export const undoSettlements = async (applied: SettlementApplied[]) => {
  for (const a of applied) {
    const r = await prisma.duplicatePayout.findUnique({ where: { id: a.duplicatePayoutId } });
    if (!r) continue;
    await prisma.$transaction([
      prisma.duplicateSettlement.delete({ where: { id: a.settlementId } }),
      prisma.duplicatePayout.update({
        where: { id: r.id },
        data: {
          recoveredAmount: Math.max(0, toCents(r.recoveredAmount) - a.cents) / 100,
          settledAmount: Math.max(0, toCents(r.settledAmount) - a.cents) / 100,
          status: 'OPEN',
        },
      }),
    ]);
  }
};

/**
 * Proof, from Stripe itself, that a transfer is the SECOND payment for a
 * session and not the original. The original is the one Stripe attached to
 * the student's charge (charge.transfer, and it carries source_transaction).
 * Anything that fails these checks is never reversed.
 */
export const verifyIsDuplicate = async (
  duplicateTransferId: string,
  originalTransferId: string
): Promise<{ ok: boolean; reason?: string }> => {
  if (duplicateTransferId === originalTransferId) {
    return { ok: false, reason: 'duplicate and original IDs are the same' };
  }
  const dup = await retrieveTransfer(duplicateTransferId);
  if (!dup) return { ok: false, reason: 'duplicate transfer not found in Stripe' };
  if (dup.source_transaction) {
    return { ok: false, reason: 'this transfer is attached to a student charge, so it is an original payment' };
  }
  if (!dup.metadata?.classSessionId) {
    return { ok: false, reason: 'transfer has no session reference, cannot prove it is a duplicate' };
  }
  const orig = await retrieveTransfer(originalTransferId);
  if (!orig) return { ok: false, reason: 'original transfer not found in Stripe' };
  const chargeId = typeof orig.source_transaction === 'string' ? orig.source_transaction : orig.source_transaction?.id;
  if (!chargeId) return { ok: false, reason: 'original transfer is not attached to a student charge' };
  const charge = await retrieveCharge(chargeId);
  const chargeTransfer = typeof charge?.transfer === 'string' ? charge.transfer : charge?.transfer?.id;
  if (chargeTransfer !== originalTransferId) {
    return { ok: false, reason: 'the student charge does not point at the recorded original transfer' };
  }
  if (dup.destination !== orig.destination) {
    return { ok: false, reason: 'duplicate and original went to different tutors' };
  }
  return { ok: true };
};

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
        settledTotal: 0,
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
    t.settledTotal += r.settledAmount;
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
      settledAmount: r.settledAmount,
      status: r.status,
      lastAttemptAt: r.lastAttemptAt,
      lastError: r.lastError,
    });
  }

  const tutors = [...byTutor.values()].map(t => ({
    ...t,
    duplicateTotal: Number(money(t.duplicateTotal)),
    recoveredTotal: Number(money(t.recoveredTotal)),
    settledTotal: Number(money(t.settledTotal)),
    outstandingTotal: Number(money(t.outstandingTotal)),
    writtenOffTotal: Number(money(t.writtenOffTotal)),
  }));
  tutors.sort((a, b) => b.outstandingTotal - a.outstandingTotal);

  return {
    tutors,
    totals: {
      duplicateTotal: Number(money(tutors.reduce((a, t) => a + t.duplicateTotal, 0))),
      recoveredTotal: Number(money(tutors.reduce((a, t) => a + t.recoveredTotal, 0))),
      settledTotal: Number(money(tutors.reduce((a, t) => a + t.settledTotal, 0))),
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

      // Never reverse an original payment. Re-prove the duplicate against
      // Stripe every single time before touching it.
      const proof = await verifyIsDuplicate(r.duplicateTransferId, r.originalTransferId);
      if (!proof.ok) {
        summary.stillOpen += 1;
        summary.errors.push(`${r.duplicateTransferId}: refused, ${proof.reason}`);
        await prisma.duplicatePayout.update({
          where: { id: r.id },
          data: { lastAttemptAt: new Date(), lastError: `Refused: ${proof.reason}` },
        });
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
        const existing = await prisma.duplicatePayout.findUnique({ where: { duplicateTransferId: d.id } });
        const recoveredAmount = (d.amount_reversed + toCents(existing?.settledAmount ?? 0)) / 100;
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
