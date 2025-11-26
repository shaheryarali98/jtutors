#!/usr/bin/env node

/**
 * Check Google Classroom setup status
 * Shows what's configured and what's missing
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('\n🔍 Google Classroom Setup Check\n');

const checks = {
  'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID,
  'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET,
  'GOOGLE_REFRESH_TOKEN': process.env.GOOGLE_REFRESH_TOKEN,
  'GOOGLE_REDIRECT_URI': process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback',
};

let allConfigured = true;

Object.entries(checks).forEach(([key, value]) => {
  if (value) {
    const displayValue = key.includes('SECRET') || key.includes('TOKEN') 
      ? '✅ Set (hidden)' 
      : `✅ ${value.substring(0, 30)}...`;
    console.log(`${key.padEnd(25)} ${displayValue}`);
  } else {
    console.log(`${key.padEnd(25)} ❌ Missing`);
    allConfigured = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allConfigured) {
  console.log('\n✅ All Google Classroom credentials are configured!');
  console.log('\n📝 Next steps:');
  console.log('   1. Run migration: npx prisma migrate dev');
  console.log('   2. Start backend: npm run dev');
  console.log('   3. Test by creating a booking');
} else {
  console.log('\n⚠️  Some credentials are missing');
  console.log('\n📝 What you need:');
  
  if (!checks.GOOGLE_CLIENT_ID || !checks.GOOGLE_CLIENT_SECRET) {
    console.log('\n   1. Get Client ID and Secret from Google Cloud Console:');
    console.log('      - Go to: https://console.cloud.google.com');
    console.log('      - APIs & Services > Credentials');
    console.log('      - Create OAuth 2.0 Client ID');
  }
  
  if (!checks.GOOGLE_REFRESH_TOKEN) {
    console.log('\n   2. Get Refresh Token:');
    console.log('      - Run: node scripts/get-google-token.js');
    console.log('      - Or use OAuth 2.0 Playground');
  }
  
  console.log('\n   3. Add to backend/.env file');
}

console.log('\n');

