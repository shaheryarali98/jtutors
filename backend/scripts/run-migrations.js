#!/usr/bin/env node
/**
 * Standalone script to run Prisma migrations
 * Can be run from local machine with production DATABASE_URL
 * 
 * Usage:
 *   DATABASE_URL="your-production-db-url" node scripts/run-migrations.js
 * 
 * Or set DATABASE_URL in .env file
 */

const { execSync } = require('child_process');
const path = require('path');

// Change to backend directory
process.chdir(path.join(__dirname, '..'));

console.log('🔄 Running database migrations...');
console.log('📁 Working directory:', process.cwd());

try {
  // Run production-safe prisma migrate wrapper
  execSync('node scripts/prisma-migrate-deploy-safe.js', {
    stdio: 'inherit',
    env: process.env
  });
  console.log('✅ Migrations completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}

