/**
 * Idempotent column patcher — runs at startup before the server.
 * Adds any columns that were missed by migrations (e.g. added via db push
 * locally but never migrated to production PostgreSQL).
 * Safe to run multiple times — uses IF NOT EXISTS.
 */
const { PrismaClient } = require('@prisma/client');

async function ensureColumns() {
  // Only run against PostgreSQL (skip SQLite in local dev)
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('file:')) {
    console.log('⚡ ensure-columns: SQLite detected, skipping.');
    return;
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "jtutorsEmail" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "AdminSettings" ADD COLUMN IF NOT EXISTS "studentFeePercentage" DOUBLE PRECISION NOT NULL DEFAULT 4.5`);
    console.log('✅ ensure-columns: All required columns present.');
  } catch (err) {
    console.error('❌ ensure-columns failed:', err.message);
    // Don't crash the server — log and continue
  } finally {
    await prisma.$disconnect();
  }
}

ensureColumns();
