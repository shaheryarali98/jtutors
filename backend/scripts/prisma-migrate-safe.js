/**
 * Safe migration workflow for mixed SQLite(local) + Postgres(deploy) setups.
 *
 * Usage:
 *   node scripts/prisma-migrate-safe.js add_extra_time_charge
 *
 * Behavior:
 * - If DATABASE_URL is Postgres: runs prisma migrate dev normally (create-only).
 * - If DATABASE_URL is SQLite and MIGRATION_DATABASE_URL is provided:
 *     uses MIGRATION_DATABASE_URL for migration generation.
 * - If DATABASE_URL is SQLite and no MIGRATION_DATABASE_URL:
 *     falls back to prisma db push with guidance.
 */

const { spawnSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const migrationName = process.argv[2];
if (!migrationName) {
  console.error('Missing migration name. Example: node scripts/prisma-migrate-safe.js add_extra_time_charge');
  process.exit(1);
}

const originalDbUrl = process.env.DATABASE_URL || '';
const migrationDbUrl = process.env.MIGRATION_DATABASE_URL || '';

const run = (cmd, args, extraEnv = {}) => {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

if (originalDbUrl.startsWith('file:')) {
  if (migrationDbUrl.startsWith('postgresql://') || migrationDbUrl.startsWith('postgres://')) {
    console.log('[migrate-safe] SQLite runtime detected; using MIGRATION_DATABASE_URL for migration generation.');

    run('node', ['scripts/set-prisma-provider.js'], { DATABASE_URL: migrationDbUrl });
    run('npx', ['prisma', 'migrate', 'dev', '--name', migrationName, '--create-only', '--skip-generate'], {
      DATABASE_URL: migrationDbUrl,
    });

    // Restore provider to local runtime DB.
    run('node', ['scripts/set-prisma-provider.js'], { DATABASE_URL: originalDbUrl });
    process.exit(0);
  }

  console.log('[migrate-safe] SQLite runtime detected and MIGRATION_DATABASE_URL is not set.');
  console.log('[migrate-safe] Falling back to `prisma db push` for local schema sync.');
  console.log('[migrate-safe] To generate real migration files, set MIGRATION_DATABASE_URL to a Postgres database URL.');
  run('npx', ['prisma', 'db', 'push', '--skip-generate']);
  process.exit(0);
}

console.log('[migrate-safe] Postgres runtime detected; generating migration with prisma migrate dev (create-only).');
run('node', ['scripts/set-prisma-provider.js']);
run('npx', ['prisma', 'migrate', 'dev', '--name', migrationName, '--create-only', '--skip-generate']);
