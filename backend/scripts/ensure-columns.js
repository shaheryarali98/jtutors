/**
 * Idempotent column patcher that runs at startup before the server.
 * Adds any columns that were missed by migrations so production can self-heal.
 *
 * Every statement runs independently: a single failure must never stop the
 * later ones from being applied. They previously shared one try block, so one
 * bad statement silently skipped every patch after it.
 */
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const STATEMENTS = [
  ['User.isSuspended', `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false`],
  ['Tutor.jtutorsEmail', `ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "jtutorsEmail" TEXT`],
  ['Tutor.timezone', `ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "timezone" TEXT`],
  ['Tutor.coverImage', `ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "coverImage" TEXT`],
  ['Tutor.isAtLeast21Confirmed', `ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "isAtLeast21Confirmed" BOOLEAN NOT NULL DEFAULT false`],
  ['Tutor.verificationRequested', `ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "verificationRequested" BOOLEAN NOT NULL DEFAULT false`],
  ['Tutor.adminVerified', `ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "adminVerified" BOOLEAN NOT NULL DEFAULT false`],
  ['Tutor.pencilUserId', `ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "pencilUserId" TEXT`],
  ['Student.stripeCustomerId', `ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT`],
  ['Student.pencilUserId', `ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "pencilUserId" TEXT`],
  ['AdminSettings.studentFeePercentage', `ALTER TABLE "AdminSettings" ADD COLUMN IF NOT EXISTS "studentFeePercentage" DOUBLE PRECISION NOT NULL DEFAULT 4.5`],
  ['AdminSettings.clientCacheVersion', `ALTER TABLE "AdminSettings" ADD COLUMN IF NOT EXISTS "clientCacheVersion" INTEGER NOT NULL DEFAULT 1`],
  ['Booking.stripePaymentMethodId', `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "stripePaymentMethodId" TEXT`],
  ['Booking.couponCode', `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "couponCode" TEXT`],
  ['Payment.couponCode', `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "couponCode" TEXT`],
  ['Payment.couponDiscountPercent', `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "couponDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0`],
  ['Payment.couponDiscountAmount', `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "couponDiscountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0`],
  [
    'Tip table',
    `CREATE TABLE IF NOT EXISTS "Tip" (
        "id" TEXT NOT NULL,
        "bookingId" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "tutorId" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'USD',
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "stripeCheckoutSessionId" TEXT,
        "stripePaymentIntentId" TEXT,
        "stripeChargeId" TEXT,
        "paidAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Tip_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Tip_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Tip_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Tip_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
  ],
  ['Tip_bookingId_key', `CREATE UNIQUE INDEX IF NOT EXISTS "Tip_bookingId_key" ON "Tip"("bookingId")`],
  ['Tip_studentId_status_idx', `CREATE INDEX IF NOT EXISTS "Tip_studentId_status_idx" ON "Tip"("studentId", "status")`],
  ['Tip_tutorId_status_idx', `CREATE INDEX IF NOT EXISTS "Tip_tutorId_status_idx" ON "Tip"("tutorId", "status")`],
];

async function ensureColumns() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('file:') || !dbUrl) {
    console.log('ensure-columns: SQLite/no DB detected, skipping.');
    return;
  }

  try {
    execSync('node scripts/prisma-migrate-deploy-safe.js', { stdio: 'inherit' });
  } catch (err) {
    console.warn('prisma migrate deploy failed; continuing with manual patches:', err.message);
  }

  const prisma = new PrismaClient();
  const failures = [];

  try {
    for (const [label, sql] of STATEMENTS) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (err) {
        failures.push(label);
        console.error(`ensure-columns: FAILED ${label}: ${err.message}`);
      }
    }

    if (failures.length === 0) {
      console.log(`ensure-columns: All ${STATEMENTS.length} patches applied.`);
    } else {
      console.error(
        `ensure-columns: ${failures.length} of ${STATEMENTS.length} patches failed: ${failures.join(', ')}`
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

ensureColumns();
