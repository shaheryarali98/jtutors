#!/usr/bin/env node
/**
 * Safe Prisma migrate deploy wrapper for mixed SQLite(local) + Postgres(production) setups.
 *
 * Why this exists:
 * - This repository's committed Prisma migration history was originally created with SQLite.
 * - Production runs on PostgreSQL.
 * - Running `prisma migrate deploy` directly against Postgres throws P3019 when the
 *   migration_lock provider does not match the runtime datasource provider.
 *
 * Behavior:
 * - Detect current DATABASE_URL provider.
 * - Read prisma/migrations/migration_lock.toml.
 * - If providers mismatch, skip migrate deploy gracefully and return success so
 *   startup self-heal scripts can continue.
 * - If providers match, run `prisma migrate deploy` normally.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {
  // ignore in production
}

const backendRoot = path.join(__dirname, '..');
const lockFilePath = path.join(backendRoot, 'prisma', 'migrations', 'migration_lock.toml');

const getRuntimeProvider = () => {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('file:')) return 'sqlite';
  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) return 'postgresql';
  return 'unknown';
};

const getMigrationLockProvider = () => {
  if (!fs.existsSync(lockFilePath)) return null;
  const contents = fs.readFileSync(lockFilePath, 'utf-8');
  const match = contents.match(/provider\s*=\s*"([^"]+)"/);
  return match ? match[1] : null;
};

const run = (command, args, extraEnv = {}) => {
  const result = spawnSync(command, args, {
    cwd: backendRoot,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...extraEnv },
  });
  return result.status || 0;
};

const runtimeProvider = getRuntimeProvider();
const lockProvider = getMigrationLockProvider();

console.log(`[migrate-deploy-safe] Runtime provider: ${runtimeProvider}`);
console.log(`[migrate-deploy-safe] Migration lock provider: ${lockProvider || 'missing'}`);

if (runtimeProvider === 'unknown') {
  console.warn('[migrate-deploy-safe] DATABASE_URL provider is unknown. Skipping prisma migrate deploy.');
  process.exit(0);
}

if (runtimeProvider === 'sqlite') {
  console.log('[migrate-deploy-safe] SQLite runtime detected. Skipping prisma migrate deploy.');
  console.log('[migrate-deploy-safe] Local SQLite environments should continue using prisma db push / sync workflows.');
  process.exit(0);
}

if (lockProvider && lockProvider !== runtimeProvider) {
  console.warn(
    `[migrate-deploy-safe] Skipping prisma migrate deploy because migration history is locked to "${lockProvider}" but DATABASE_URL is "${runtimeProvider}".`
  );
  console.warn(
    '[migrate-deploy-safe] Continuing without Prisma migrations so startup self-heal scripts can patch required columns safely.'
  );
  process.exit(0);
}

const setProviderStatus = run('node', ['scripts/set-prisma-provider.js']);
if (setProviderStatus !== 0) {
  process.exit(setProviderStatus);
}

const migrateStatus = run('npx', ['prisma', 'migrate', 'deploy']);
process.exit(migrateStatus);
