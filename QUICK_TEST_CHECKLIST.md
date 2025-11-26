# Quick Test Checklist

## ⚡ Fast Setup (5 minutes)

### 1. Run Migration
```bash
cd backend
npx prisma migrate dev
```

### 2. Add Environment Variables
Add to `backend/.env`:
```env
# Google Classroom (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token

# Stripe (for payment release)
STRIPE_SECRET_KEY=sk_test_...
```

### 3. Start Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## ✅ Test Checklist

### Basic Flow Test

- [ ] **Create Student Account**
  - Register as student
  - Complete profile

- [ ] **Create Tutor Account**
  - Register as tutor
  - Complete profile
  - Set up Stripe Connect (for payment release)

- [ ] **Create Booking**
  - Student books tutor
  - Check backend logs for Google Classroom creation
  - Verify booking appears in "My Bookings"

- [ ] **Check Google Classroom Links**
  - Student: Go to "My Bookings" → See "Open Google Classroom" button
  - Tutor: Go to "My Sessions" → See "Classroom link"
  - Click links → Should open Google Classroom/Meet

- [ ] **Make Payment**
  - Student pays for booking
  - Payment status changes to "PAID"

- [ ] **Complete Class**
  - Tutor completes class (with or without hours)
  - Check backend logs for payment release
  - Verify `paymentReleased = true` in database

- [ ] **Verify Payment Release**
  - Check Stripe Dashboard for transfer
  - Tutor receives email notification

---

## 🔍 Quick Verification Commands

### Check Database
```bash
# Check if migration ran
cd backend
npx prisma studio
# Open ClassSession table, check for:
# - actualHoursTaught
# - paymentReleased
# - paymentReleasedAt
```

### Check Environment Variables
```bash
cd backend
node -e "console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing')"
```

### Test Google Classroom Status
```bash
# After starting backend
curl http://localhost:5000/api/admin/integrations/google-classroom/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 🎯 Minimal Test (Without Google)

If you don't have Google credentials yet:

1. **Skip Google Classroom setup**
2. **Test payment release only**:
   - Create booking
   - Make payment
   - Complete class
   - Verify payment release works

Google Classroom will be created automatically once you add credentials.

---

## 📋 What You Need to Provide

### Required:
- [ ] Google Client ID
- [ ] Google Client Secret  
- [ ] Google Refresh Token

### Optional (for payment testing):
- [ ] Stripe Secret Key
- [ ] Tutor Stripe Connect account

### I Can Help You Get:
- ✅ Google Refresh Token (I can provide script)
- ✅ Test the integration step-by-step
- ✅ Debug any issues

---

## 🚨 Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| "Google Classroom not configured" | Add env vars to `.env` and restart |
| "Payment not released" | Check payment status is "PAID" |
| "Tutor no Stripe account" | Tutor must complete Stripe Connect |
| "Migration error" | Run `npx prisma migrate dev` |
| "Links not showing" | Check `classSession` exists in booking |

---

## 📞 Ready to Test?

1. Run migration ✅
2. Add environment variables ✅
3. Start servers ✅
4. Follow test checklist above ✅

Let me know if you need help with any step!

