/**
 * Automatically sets the Prisma provider based on DATABASE_URL.
 * - If DATABASE_URL starts with "postgresql://" → provider = "postgresql"
 * - If DATABASE_URL starts with "file:" → provider = "sqlite"
 * - Default (Render/production) → "postgresql"
 *
 * Run before `prisma generate` or `prisma migrate deploy`.
 */
const fs = require('fs');
const path = require('path');

// Load .env if present (for local dev)
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  // dotenv may not be available in production builds
}

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const dbUrl = process.env.DATABASE_URL || '';

let provider;
if (dbUrl.startsWith('file:')) {
  provider = 'sqlite';
} else if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
  provider = 'postgresql';
} else {
  // Default to postgresql for production (Render injects a postgres URL)
  provider = 'postgresql';
}

const schema = fs.readFileSync(schemaPath, 'utf-8');
const updated = schema.replace(
  /provider\s*=\s*"(sqlite|postgresql)"/,
  `provider = "${provider}"`
);

if (schema !== updated) {
  fs.writeFileSync(schemaPath, updated, 'utf-8');
  console.log(`✅ Prisma provider set to "${provider}" (based on DATABASE_URL)`);
} else {
  console.log(`✅ Prisma provider already "${provider}"`);
}
