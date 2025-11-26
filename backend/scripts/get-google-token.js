#!/usr/bin/env node

/**
 * Helper script to get Google OAuth refresh token
 * 
 * Usage:
 * 1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env or as environment variables
 * 2. Run: node scripts/get-google-token.js
 * 3. Follow the prompts
 */

const { google } = require('googleapis');
const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env file');
  console.error('\nPlease add to backend/.env:');
  console.error('GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com');
  console.error('GOOGLE_CLIENT_SECRET=your-client-secret');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const scopes = [
  'https://www.googleapis.com/auth/classroom.courses',
  'https://www.googleapis.com/auth/classroom.rosters',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent', // Force consent to get refresh token
});

console.log('\n🔐 Google OAuth Token Generator\n');
console.log('Step 1: Open this URL in your browser:');
console.log('\n' + authUrl + '\n');
console.log('Step 2: Authorize the application');
console.log('Step 3: Copy the authorization code from the redirect URL\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the authorization code: ', (code) => {
  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('\n❌ Error retrieving access token:', err.message);
      rl.close();
      process.exit(1);
    }

    console.log('\n✅ Success! Here are your tokens:\n');
    console.log('Add these to your backend/.env file:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${token.refresh_token}`);
    
    if (token.access_token) {
      console.log(`\n# Optional: Access token (expires in 1 hour)`);
      console.log(`# GOOGLE_ACCESS_TOKEN=${token.access_token}`);
    }

    console.log('\n✅ Setup complete! Restart your backend server.\n');
    rl.close();
  });
});

