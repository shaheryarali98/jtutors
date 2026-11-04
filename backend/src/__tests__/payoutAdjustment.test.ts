/**
 * Payout adjustment test: proves that while a tutor holds a duplicate payout,
 * their money never reaches their Stripe account (held at charge, adjusted at
 * release), that only any remainder is transferred, and that the Stripe
 * reversal stays available as a last-resort backup.
 *
 * Runs against a throwaway SQLite database with the Stripe service stubbed.
 *
 *   cd backend
 *   DATABASE_URL=file:./test-payout.db npx prisma db push --force-reset --skip-generate
 *   DATABASE_URL=file:./test-payout.db npx ts-node src/__tests__/payoutAdjustment.test.ts
 *
 * (or: npm run test:payouts)
 */
import assert from 'assert';
import path from 'path';

process.env.DEV_BYPASS_STRIPE = 'false';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_stub';

// ---------------------------------------------------------------------------
// Stub the Stripe service and e-mail before anything imports them.
// ---------------------------------------------------------------------------
const calls = {
  transfers: [] as any[],
  reversals: [] as any[],
  intents: [] as any[],
  emails: [] as any[],
};
const stripeStub = {
  chargesWithTransfer: new Map<string, string>(), // chargeId -> transferId (destination charges)
  transfers: new Map<string, any>(),              // transferId -> transfer object
  availableCents: 0,
  failNextTransfer: false,
};

function stubModule(rel: string, build: (real: any) => any) {
  const file = require.resolve(rel);
  const real = require(file);
  const fake = build(real);
  for (const k of Object.keys(fake)) real[k] = fake[k];
}

stubModule('../services/stripe.service', real => ({
  stripe: {
    paymentIntents: {
      create: async (params: any) => {
        calls.intents.push(params);
        return { id: `pi_${calls.intents.length}`, status: 'succeeded', latest_charge: `ch_pi_${calls.intents.length}` };
      },
    },
  },
  createTransfer: async (amount: number, destination: string, metadata: any, source: string | null, key?: string) => {
    if (stripeStub.failNextTransfer) {
      stripeStub.failNextTransfer = false;
      throw new Error('balance_insufficient (stub)');
    }
    const id = `tr_${calls.transfers.length + 1}`;
    calls.transfers.push({ id, amount, destination, metadata, source, key });
    return { id, amount: Math.round(amount * 100), destination };
  },
  confirmPaymentIntent: async (id: string) => ({ id, latest_charge: id.replace('pi_', 'ch_') }),
  retrieveCharge: async (chargeId: string) => (chargeId.startsWith('ch_fail') ? null : { id: chargeId, transfer: stripeStub.chargesWithTransfer.get(chargeId) || null }),
  listTransfersToAccount: async () => [],
  retrieveTransfer: async (id: string) => stripeStub.transfers.get(id) || null,
  getConnectedAvailableCents: async () => stripeStub.availableCents,
  reverseTransfer: async (transferId: string, amountCents: number) => {
    calls.reversals.push({ transferId, amountCents });
    return { id: `trr_${calls.reversals.length}` };
  },
  calculatePaymentBreakdown: real.calculatePaymentBreakdown,
}));
stubModule('../services/emailTemplate.service', () => ({
  sendTemplatedEmail: async (template: string, to: string, vars: any) => { calls.emails.push({ template, to, vars }); return { ok: true }; },
}));

import { PrismaClient } from '@prisma/client';
import { releasePaymentToTutor } from '../services/paymentRelease.service';
import { chargeBookingAfterCompletion } from '../services/bookingPayment.service';
import { applyHeldCharge, attemptDuplicateRecovery, getOpenDuplicateCents } from '../services/duplicatePayout.service';

const prisma = new PrismaClient();
const cents = (n: number) => Math.round(n * 100);

async function seedPeople() {
  const tutorUser = await prisma.user.create({ data: { email: `tutor-${Date.now()}@test.local`, password: 'x', role: 'TUTOR' } });
  const tutor = await prisma.tutor.create({ data: { userId: tutorUser.id, firstName: 'Test', lastName: 'Tutor', hourlyFee: 100, stripeAccountId: 'acct_TEST', stripeOnboarded: true } });
  const studentUser = await prisma.user.create({ data: { email: `student-${Date.now()}@test.local`, password: 'x', role: 'STUDENT' } });
  const student = await prisma.student.create({ data: { userId: studentUser.id, firstName: 'Test', lastName: 'Student', stripeCustomerId: 'cus_TEST' } as any });
  return { tutor, student };
}

let seq = 0;
async function seedPaidSession(tutorId: string, studentId: string, tutorAmount: number, chargeId: string) {
  seq += 1;
  const start = new Date(Date.now() - 5 * 24 * 3600 * 1000);
  const booking = await prisma.booking.create({
    data: { studentId, tutorId, startTime: start, endTime: new Date(start.getTime() + 3600 * 1000), status: 'COMPLETED' } as any,
  });
  await prisma.payment.create({
    data: {
      bookingId: booking.id, studentId, tutorId,
      amount: tutorAmount / 0.9075, adminCommissionAmount: 0, tutorAmount,
      studentChargeAmount: tutorAmount / 0.9075 * 1.045,
      paymentStatus: 'PAID', paidAt: new Date(), stripeChargeId: chargeId, stripePaymentIntentId: chargeId.replace('ch_', 'pi_'),
    } as any,
  });
  const cs = await prisma.classSession.create({
    data: { bookingId: booking.id, status: 'COMPLETED', tutorApproved: true, autoReleaseAt: new Date(Date.now() - 1000) } as any,
  });
  return cs;
}

async function dup(tutorId: string, amount: number, n: number) {
  return prisma.duplicatePayout.create({
    data: { tutorId, originalTransferId: `tr_orig_${n}`, duplicateTransferId: `tr_dup_${n}`, amount, sessionDate: new Date(2026, 9, n) },
  });
}

(async () => {
  const { tutor, student } = await seedPeople();
  const T = tutor.id;

  // ---- 1. Session fully covered by duplicates: nothing transferred ----------
  await dup(T, 60, 1);
  await dup(T, 70, 2);
  assert.strictEqual(await getOpenDuplicateCents(T), cents(130));

  const s1 = await seedPaidSession(T, student.id, 100, 'ch_s1');
  const r1 = await releasePaymentToTutor(s1.id);
  assert.ok(r1.success, r1.error);
  assert.strictEqual(r1.transferId, 'adjusted-against-duplicate');
  assert.strictEqual(calls.transfers.length, 0, 'no transfer while duplicates cover the share');
  const d1 = await prisma.duplicatePayout.findUnique({ where: { duplicateTransferId: 'tr_dup_1' } });
  const d2 = await prisma.duplicatePayout.findUnique({ where: { duplicateTransferId: 'tr_dup_2' } });
  assert.strictEqual(d1!.status, 'RECOVERED'); assert.strictEqual(cents(d1!.settledAmount), cents(60));
  assert.strictEqual(d2!.status, 'OPEN'); assert.strictEqual(cents(d2!.recoveredAmount), cents(40));
  assert.strictEqual((await prisma.classSession.findUnique({ where: { id: s1.id } }))!.paymentReleased, true);
  assert.strictEqual(calls.emails.filter(e => e.template === 'PAYMENT_RELEASED').length, 0, 'no payout e-mail for an adjusted session');
  console.log('✓ 1. full adjustment, no money sent');

  // ---- 2. Partial: 30 left on the duplicate, 70 is transferred ---------------
  const s2 = await seedPaidSession(T, student.id, 100, 'ch_s2');
  const r2 = await releasePaymentToTutor(s2.id);
  assert.ok(r2.success, r2.error);
  assert.strictEqual(calls.transfers.length, 1);
  assert.strictEqual(cents(calls.transfers[0].amount), cents(70));
  assert.strictEqual(calls.transfers[0].source, 'ch_s2');
  assert.strictEqual(calls.transfers[0].key, `release-${s2.id}`);
  assert.strictEqual((await prisma.duplicatePayout.findUnique({ where: { duplicateTransferId: 'tr_dup_2' } }))!.status, 'RECOVERED');
  assert.strictEqual(await getOpenDuplicateCents(T), 0);
  console.log('✓ 2. partial adjustment, only the remainder sent');

  // ---- 3. Clean tutor: full transfer, normal e-mail ---------------------------
  const s3 = await seedPaidSession(T, student.id, 100, 'ch_s3');
  const r3 = await releasePaymentToTutor(s3.id);
  assert.ok(r3.success, r3.error);
  assert.strictEqual(cents(calls.transfers[1].amount), cents(100));
  assert.strictEqual(calls.emails.filter(e => e.template === 'PAYMENT_RELEASED').length, 2);
  console.log('✓ 3. no duplicates: paid in full');

  // ---- 4. Transfer failure rolls the adjustment back --------------------------
  await dup(T, 20, 3);
  const s4 = await seedPaidSession(T, student.id, 100, 'ch_s4');
  stripeStub.failNextTransfer = true;
  const r4 = await releasePaymentToTutor(s4.id);
  assert.strictEqual(r4.success, false);
  const d3 = await prisma.duplicatePayout.findUnique({ where: { duplicateTransferId: 'tr_dup_3' } });
  assert.strictEqual(d3!.status, 'OPEN'); assert.strictEqual(cents(d3!.recoveredAmount), 0);
  assert.strictEqual(await prisma.duplicateSettlement.count({ where: { classSessionId: s4.id } }), 0);
  assert.strictEqual((await prisma.classSession.findUnique({ where: { id: s4.id } }))!.paymentReleased, false, 'session stays in the queue');
  // retry succeeds and settles 20, sends 80
  const r4b = await releasePaymentToTutor(s4.id);
  assert.ok(r4b.success, r4b.error);
  assert.strictEqual(cents(calls.transfers[2].amount), cents(80));
  console.log('✓ 4. failed transfer undoes the adjustment; retry is clean');

  // ---- 5. Guard: a session already paid at charge time is never touched ------
  await dup(T, 50, 4);
  const s5 = await seedPaidSession(T, student.id, 100, 'ch_s5');
  stripeStub.chargesWithTransfer.set('ch_s5', 'tr_direct_s5');
  const r5 = await releasePaymentToTutor(s5.id);
  assert.ok(r5.success); assert.strictEqual(r5.transferId, 'tr_direct_s5');
  assert.strictEqual(calls.transfers.length, 3, 'no second transfer');
  assert.strictEqual(await getOpenDuplicateCents(T), cents(50), 'nothing settled against a direct-paid session');
  console.log('✓ 5. direct-paid session: no second payment, no adjustment');

  // ---- 6. Charge time: held on the platform while a duplicate is open ---------
  const start = new Date(Date.now() - 3 * 24 * 3600 * 1000);
  const mk = async () => prisma.booking.create({ data: { studentId: student.id, tutorId: T, startTime: start, endTime: new Date(start.getTime() + 3600 * 1000), status: 'COMPLETED', stripePaymentMethodId: 'pm_TEST' } as any });
  const b6 = await mk();
  const c6 = await chargeBookingAfterCompletion(b6.id);
  assert.strictEqual(c6.status, 'PAID', JSON.stringify(c6));
  const p6 = calls.intents[calls.intents.length - 1];
  assert.strictEqual(p6.transfer_data, undefined, 'no transfer_data while a duplicate is open');
  assert.strictEqual(p6.application_fee_amount, undefined);
  assert.strictEqual(p6.metadata.heldForDuplicateAdjustment, 'true');
  // clear the duplicate, charge again: direct payment is back
  await prisma.duplicatePayout.updateMany({ where: { tutorId: T, status: 'OPEN' }, data: { status: 'WRITTEN_OFF' } });
  const b7 = await mk();
  const c7 = await chargeBookingAfterCompletion(b7.id);
  assert.strictEqual(c7.status, 'PAID', JSON.stringify(c7));
  const p7 = calls.intents[calls.intents.length - 1];
  assert.deepStrictEqual(p7.transfer_data, { destination: 'acct_TEST' });
  assert.ok(p7.application_fee_amount > 0);
  console.log('✓ 6. charge held on platform while duplicate open; direct pay once cleared');

  // ---- 7. Held tip: adjusted in the webhook, remainder sent, idempotent -------
  await dup(T, 15, 5);
  const before = calls.transfers.length;
  const h1 = await applyHeldCharge({ tutorId: T, stripeAccountId: 'acct_TEST', paymentIntentId: 'pi_tip1', tutorShareCents: 4000, reference: 'tip:tip1' });
  assert.strictEqual(h1.settledCents, 1500);
  assert.strictEqual(cents(calls.transfers[before].amount), 2500);
  assert.strictEqual(calls.transfers[before].key, 'held-tip:tip1');
  const h2 = await applyHeldCharge({ tutorId: T, stripeAccountId: 'acct_TEST', paymentIntentId: 'pi_tip1', tutorShareCents: 4000, reference: 'tip:tip1' });
  assert.strictEqual(h2.settledCents, 0); assert.strictEqual(calls.transfers.length, before + 1, 'webhook retry does nothing');
  console.log('✓ 7. held tip adjusted once, remainder sent once');

  // ---- 8. Backup: Stripe reversal only when money is in the account, only on the duplicate
  const d6 = await dup(T, 50, 6);
  stripeStub.transfers.set('tr_dup_6', { id: 'tr_dup_6', source_transaction: null, metadata: { classSessionId: 'cs_x' }, destination: 'acct_TEST' });
  stripeStub.transfers.set('tr_orig_6', { id: 'tr_orig_6', source_transaction: 'ch_orig_6', destination: 'acct_TEST' });
  stripeStub.chargesWithTransfer.set('ch_orig_6', 'tr_orig_6');
  stripeStub.availableCents = 0;
  let rec = await attemptDuplicateRecovery({ tutorId: T });
  assert.strictEqual(calls.reversals.length, 0, 'empty balance: nothing reversed');
  stripeStub.availableCents = 3000;
  rec = await attemptDuplicateRecovery({ tutorId: T });
  assert.strictEqual(calls.reversals.length, 1);
  assert.deepStrictEqual(calls.reversals[0], { transferId: 'tr_dup_6', amountCents: 3000 });
  assert.strictEqual(cents((await prisma.duplicatePayout.findUnique({ where: { id: d6.id } }))!.recoveredAmount), 3000);
  // a row that points at an original (has source_transaction) is refused
  const bad = await prisma.duplicatePayout.create({ data: { tutorId: T, originalTransferId: 'tr_orig_6', duplicateTransferId: 'tr_orig_6b', amount: 10 } });
  stripeStub.transfers.set('tr_orig_6b', { id: 'tr_orig_6b', source_transaction: 'ch_orig_6', metadata: {}, destination: 'acct_TEST' });
  stripeStub.availableCents = 5000;
  await attemptDuplicateRecovery({ tutorId: T });
  assert.ok(!calls.reversals.some(r => r.transferId === 'tr_orig_6b'), 'an original is never reversed');
  assert.ok((await prisma.duplicatePayout.findUnique({ where: { id: bad.id } }))!.lastError!.startsWith('Refused'));
  console.log('✓ 8. backup reversal: only from available balance, only on proven duplicates');

  console.log('\nAll payout adjustment checks passed.');
  await prisma.$disconnect();
})().catch(async err => {
  console.error('\n✗ FAILED:', err);
  await prisma.$disconnect();
  process.exit(1);
});
