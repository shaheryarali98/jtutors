/**
 * Idempotent column patcher that runs at startup before the server.
 * Adds any columns that were missed by migrations so production can self-heal.
 */
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

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
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "jtutorsEmail" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "timezone" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "coverImage" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "isAtLeast21Confirmed" BOOLEAN NOT NULL DEFAULT false`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "verificationRequested" BOOLEAN NOT NULL DEFAULT false`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "adminVerified" BOOLEAN NOT NULL DEFAULT false`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "AdminSettings" ADD COLUMN IF NOT EXISTS "studentFeePercentage" DOUBLE PRECISION NOT NULL DEFAULT 4.5`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "couponCode" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "couponDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "couponDiscountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Tip" (
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
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Tip_bookingId_key" ON "Tip"("bookingId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Tip_studentId_status_idx" ON "Tip"("studentId", "status")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Tip_tutorId_status_idx" ON "Tip"("tutorId", "status")`);
    console.log('ensure-columns: All required columns present.');
  } catch (err) {
    console.error('ensure-columns failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

ensureColumns();
