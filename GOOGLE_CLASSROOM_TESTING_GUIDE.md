# Google Classroom Integration - Testing Guide

## 📋 Prerequisites Checklist

Before testing, make sure you have:

### ✅ Required Setup

1. **Database Migration**
   ```bash
   cd backend
   npx prisma migrate dev
   ```

2. **Environment Variables** (in `backend/.env`)
   - Google API credentials (see setup below)
   - Stripe credentials (if testing payment release)

3. **User Accounts**
   - At least 1 Student account
   - At least 1 Tutor account
   - Tutor must have Stripe Connect account set up (for payment release)

---

## 🔧 Setup Instructions

### Step 1: Google API Setup

#### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable these APIs:
   - **Google Classroom API**
   - **Google Calendar API** (for Meet links)
   - **Google Drive API** (may be needed)

#### 1.2 Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **"Create Credentials" > "OAuth client ID"**
3. Choose **"Web application"**
4. Add authorized redirect URIs:
   - Development: `http://localhost:5000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
5. Save the **Client ID** and **Client Secret**

#### 1.3 Get Refresh Token

**Option A: Using OAuth 2.0 Playground (Easiest)**

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in top right
3. Check **"Use your own OAuth credentials"**
4. Enter your Client ID and Client Secret
5. In the left panel, find and select:
   - `https://www.googleapis.com/auth/classroom.courses`
   - `https://www.googleapis.com/auth/classroom.rosters`
   - `https://www.googleapis.com/auth/calendar`
6. Click **"Authorize APIs"**
7. Grant permissions
8. Click **"Exchange authorization code for tokens"**
9. Copy the **Refresh Token**

**Option B: Using Node.js Script**

Create a file `get-google-token.js`:

```javascript
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:5000/api/auth/google/callback'
);

const scopes = [
  'https://www.googleapis.com/auth/classroom.courses',
  'https://www.googleapis.com/auth/classroom.rosters',
  'https://www.googleapis.com/auth/calendar'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('Refresh Token:', token.refresh_token);
    rl.close();
  });
});
```

Run: `node get-google-token.js`

#### 1.4 Add to Environment Variables

Add to `backend/.env`:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

### Step 2: Stripe Setup (for Payment Release)

1. Get your Stripe Secret Key from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Add to `backend/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   ```

3. **Tutor Stripe Connect Setup**:
   - Tutor must complete Stripe Connect onboarding
   - Go to Tutor Dashboard > Payout Settings
   - Connect Stripe account
   - This gives the tutor a `stripeAccountId` needed for transfers

---

## 🧪 Testing Steps

### Test 1: Verify Google Classroom Setup

1. **Check Configuration**:
   ```bash
   # Start backend server
   cd backend
   npm run dev
   ```

2. **Check Status** (as Admin):
   - Go to Admin Dashboard
   - Navigate to Integrations section
   - Check Google Classroom status
   - Should show "Configured" if credentials are correct

### Test 2: Create Booking (Auto Google Classroom)

1. **As Student**:
   - Login as a student
   - Go to Student Dashboard
   - Find a tutor and click "Book Session"
   - Fill in booking details:
     - Start time
     - End time
   - Click "Create Booking"

2. **Verify**:
   - Booking should be created successfully
   - Check backend logs for:
     ```
     ✅ Google Classroom course created: [course-id]
     ✅ Student and tutor enrolled
     ✅ Google Meet link created
     ```
   - If Google Classroom fails, booking still succeeds (graceful degradation)

3. **Check Database**:
   ```sql
   SELECT * FROM ClassSession WHERE bookingId = 'your-booking-id';
   ```
   - Should have `googleClassroomId`, `googleClassroomLink`, `googleMeetLink`

### Test 3: Access Google Classroom (Student)

1. **As Student**:
   - Go to "My Bookings" page
   - Find your booking
   - Look for "Join Your Class" section
   - Click **"Open Google Classroom"** button
   - Should open Google Classroom in new tab
   - Click **"Join Google Meet"** button
   - Should open Google Meet in new tab

2. **Verify**:
   - Both links should work
   - Student should see the course in their Google Classroom
   - Student should be enrolled as a student in the course

### Test 4: Access Google Classroom (Tutor)

1. **As Tutor**:
   - Go to "My Sessions" page
   - Find the session
   - Click **"Classroom link"** or **"Meet link"**
   - Should open in new tab

2. **Verify**:
   - Tutor should see the course in their Google Classroom
   - Tutor should be enrolled as a teacher in the course

### Test 5: Complete Class with Payment Release

1. **As Student - Make Payment**:
   - Go to "My Bookings"
   - Find booking with status "PENDING"
   - Click "Pay with Stripe"
   - Complete payment (use test card: `4242 4242 4242 4242`)
   - Payment status should change to "PAID"

2. **As Tutor - Complete Class**:
   - Go to "My Sessions"
   - Find the completed session
   - Click "Complete Class" or use API:
     ```bash
     POST /api/class-sessions/:id/complete
     {
       "notes": "Great session!",
       "actualHoursTaught": 1.5
     }
     ```

3. **Verify Payment Release**:
   - Check backend logs:
     ```
     ✅ Payment released to tutor
     ✅ Transfer ID: tr_...
     ```
   - Check database:
     ```sql
     SELECT paymentReleased, paymentReleasedAt FROM ClassSession WHERE id = 'session-id';
     ```
     - `paymentReleased` should be `true`
     - `paymentReleasedAt` should have timestamp
   - Check Stripe Dashboard:
     - Go to Transfers
     - Should see transfer to tutor's account
   - Tutor should receive email notification

### Test 6: Complete Class Without Hours

1. **As Tutor**:
   - Complete class without `actualHoursTaught`:
     ```bash
     POST /api/class-sessions/:id/complete
     {
       "notes": "Completed session"
     }
     ```

2. **Verify**:
   - Payment should use scheduled hours from booking
   - Payment should still be released automatically

### Test 7: Manual Payment Release (Admin)

If automatic release fails:

1. **As Admin**:
   - Go to Admin Dashboard
   - Find the class session
   - Click "Release Payment" or use API:
     ```bash
     POST /api/class-sessions/:id/release-payment
     ```

2. **Verify**:
   - Payment should be released
   - Check logs for any errors

---

## 🐛 Troubleshooting

### Issue: Google Classroom Not Created

**Symptoms**: Booking created but no Google Classroom

**Solutions**:
1. Check backend logs for errors
2. Verify environment variables are set:
   ```bash
   echo $GOOGLE_CLIENT_ID
   echo $GOOGLE_REFRESH_TOKEN
   ```
3. Test Google API connection:
   ```bash
   # In backend directory
   node -e "require('./dist/services/googleClassroom.service').getGoogleClassroomStatus()"
   ```
4. Check if refresh token is valid (may need to regenerate)

### Issue: "Google Classroom is not configured"

**Solution**:
- Add all required environment variables to `backend/.env`
- Restart backend server
- Check that variables are loaded (no typos)

### Issue: Payment Not Released

**Symptoms**: Class completed but payment not released

**Solutions**:
1. Check payment status (must be "PAID"):
   ```sql
   SELECT paymentStatus FROM Payment WHERE bookingId = 'booking-id';
   ```
2. Check tutor has Stripe Connect account:
   ```sql
   SELECT stripeAccountId FROM Tutor WHERE id = 'tutor-id';
   ```
3. Check backend logs for errors
4. Try manual release as admin

### Issue: "Tutor does not have Stripe Connect account"

**Solution**:
- Tutor must complete Stripe Connect onboarding
- Go to Tutor Dashboard > Payout Settings
- Connect Stripe account

### Issue: Google Meet Link Not Working

**Symptoms**: Meet link created but doesn't work

**Solutions**:
1. Check if Google Calendar API is enabled
2. Verify refresh token has calendar scope
3. Check backend logs for Meet creation errors
4. Fallback: System generates a placeholder Meet code

### Issue: Student/Tutor Not Enrolled

**Symptoms**: Course created but user not in course

**Solutions**:
1. Verify user emails are correct in database
2. Check if emails match Google account emails
3. Check backend logs for enrollment errors
4. Manually add user to course in Google Classroom

---

## 📊 API Testing with cURL

### Create Booking (Student)
```bash
curl -X POST http://localhost:5000/api/student/bookings \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tutorId": "tutor-id",
    "startTime": "2024-01-15T10:00:00Z",
    "endTime": "2024-01-15T11:00:00Z"
  }'
```

### Complete Class Session (Tutor)
```bash
curl -X POST http://localhost:5000/api/class-sessions/SESSION_ID/complete \
  -H "Authorization: Bearer YOUR_TUTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Great session!",
    "actualHoursTaught": 1.5
  }'
```

### Check Class Session
```bash
curl -X GET http://localhost:5000/api/class-sessions/SESSION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Release Payment (Admin)
```bash
curl -X POST http://localhost:5000/api/class-sessions/SESSION_ID/release-payment \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## ✅ Success Criteria

Your integration is working correctly if:

- ✅ Bookings automatically create Google Classroom courses
- ✅ Students and tutors are enrolled in courses
- ✅ Google Meet links are generated
- ✅ Students can access Classroom/Meet from bookings page
- ✅ Tutors can access Classroom/Meet from sessions page
- ✅ Payment is automatically released when class is completed
- ✅ Tutor receives email notification
- ✅ Transfer appears in Stripe Dashboard

---

## 📝 What I Need From You

To make this work, please provide:

1. **Google API Credentials**:
   - Client ID
   - Client Secret
   - Refresh Token (or I can help you generate it)

2. **Stripe Credentials** (if testing payment release):
   - Secret Key (test mode is fine for testing)

3. **User Emails**:
   - Make sure student and tutor emails match their Google account emails
   - Or use Google Workspace accounts

4. **Database Access**:
   - Run the migration: `npx prisma migrate dev`
   - Or provide database access if you want me to run it

---

## 🚀 Quick Start (Minimal Testing)

If you just want to test the flow without full setup:

1. **Skip Google Classroom** (it will gracefully degrade):
   - Don't set Google credentials
   - Bookings will still work
   - Google Classroom features will be disabled

2. **Test Payment Release Only**:
   - Set up Stripe
   - Create booking
   - Make payment
   - Complete class
   - Verify payment release

3. **Test Google Classroom Only**:
   - Set up Google credentials
   - Create booking
   - Verify Classroom is created
   - Access links from frontend

---

## 📞 Need Help?

If you encounter issues:

1. Check backend logs for detailed error messages
2. Verify all environment variables are set
3. Test API endpoints directly with cURL
4. Check database to verify data is being created
5. Review this guide's troubleshooting section

