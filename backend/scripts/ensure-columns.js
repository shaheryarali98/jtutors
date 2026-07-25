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
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  } catch (err) {
    console.warn('prisma migrate deploy failed; continuing with manual patches:', err.message);
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "jtutorsEmail" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "timezone" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "isAtLeast21Confirmed" BOOLEAN NOT NULL DEFAULT false`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "AdminSettings" ADD COLUMN IF NOT EXISTS "studentFeePercentage" DOUBLE PRECISION NOT NULL DEFAULT 4.5`);
    console.log('ensure-columns: All required columns present.');
  } catch (err) {
    console.error('ensure-columns failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

ensureColumns();
