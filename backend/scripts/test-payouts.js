// Runs the payout adjustment test against a throwaway SQLite database.
const { spawnSync } = require('child_process');
const env = { ...process.env, DATABASE_URL: 'file:./test-payout.db', DEV_BYPASS_STRIPE: 'false' };
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env, shell: true });
  if (r.status !== 0) process.exit(r.status || 1);
};
run('npx', ['prisma', 'db', 'push', '--force-reset', '--skip-generate']);
run('npx', ['ts-node', '--transpile-only', 'src/__tests__/payoutAdjustment.test.ts']);
