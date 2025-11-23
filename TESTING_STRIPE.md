# Testing Stripe Integration - Step by Step Guide

This guide will walk you through testing the complete Stripe payment flow in your application.

## 🚀 Step 1: Start Your Servers

### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

You should see:
```
🚀 Server is running on port 5000
```

### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

You should see:
```
VITE ready in XXX ms
➜  Local:   http://localhost:5173/
```

## 👤 Step 2: Create Test Accounts

### Create a Tutor Account:
1. Go to `http://localhost:5173/register` (or your frontend URL)
2. Register as a **Tutor**:
   - Email: `tutor@test.com`
   - Password: `password123`
   - Role: Select **Tutor**
3. Complete tutor profile (at least basic info)
4. Set an hourly fee (e.g., $50/hour)

### Create a Student Account:
1. Logout and go to register again
2. Register as a **Student**:
   - Email: `student@test.com`
   - Password: `password123`
   - Role: Select **Student**

## 📅 Step 3: Create a Booking

1. **Login as Student** (`student@test.com`)
2. **Search for Tutors** or go to Student Dashboard
3. **Click on a Tutor** to view their profile
4. **Click "Book Tutor"** or similar button
5. **Fill in booking details**:
   - Start Time: Select a future date/time
   - End Time: Select end time (e.g., 1 hour later)
   - Notes: (optional)
6. **Submit the booking**

## 💳 Step 4: Test Payment Flow

### Option A: Test from Bookings Page

1. **Go to Student Dashboard > Bookings** (or `/student/bookings`)
2. **Find your booking** - it should show as "Pending Payment"
3. **Click "Pay with Stripe"** button
4. **Payment modal should open** showing:
   - Amount due
   - Stripe payment form

### Option B: Test from Invoices Page

1. Go to **Student Dashboard > Invoices**
2. Find the invoice for your booking
3. Click **"Pay Now"** or similar button

## 🧪 Step 5: Use Stripe Test Cards

When the payment modal opens, use these **Stripe test cards**:

### ✅ Successful Payment:
```
Card Number: 4242 4242 4242 4242
Expiry Date: 12/34 (any future date)
CVC: 123 (any 3 digits)
ZIP Code: 12345 (any 5 digits)
```

### ❌ Test Declined Card:
```
Card Number: 4000 0000 0000 0002
Expiry Date: 12/34
CVC: 123
ZIP Code: 12345
```
This will show a "card declined" error.

### 🔄 Test 3D Secure (if enabled):
```
Card Number: 4000 0027 6000 3184
Expiry Date: 12/34
CVC: 123
ZIP Code: 12345
```
This will require additional authentication.

## ✅ Step 6: Verify Payment Success

After successful payment:

1. **Payment modal should close**
2. **Booking status should update** to "Paid" or "Confirmed"
3. **Check backend console** - should see:
   ```
   Payment confirmed: [payment-id]
   ```
4. **Check Stripe Dashboard**:
   - Go to https://dashboard.stripe.com/test/payments
   - You should see the test payment
   - Status should be "Succeeded"

## 🔍 Step 7: Verify in Different Places

### As Student:
- ✅ **Bookings Page**: Should show "Paid" status
- ✅ **Invoices Page**: Should show payment confirmation
- ✅ **Wallet/Transactions**: Should show payment history

### As Tutor:
- ✅ **Dashboard**: Should show earnings
- ✅ **Sessions**: Should show confirmed booking

### As Admin (if you have admin account):
- ✅ **Admin Dashboard > Payments**: Should show the payment
- ✅ **Payment details**: Should show commission breakdown

## 🐛 Troubleshooting

### Issue: "Stripe is not configured" error
**Solution:**
- Check that `STRIPE_SECRET_KEY` is in `backend/.env`
- Check that `VITE_STRIPE_PUBLISHABLE_KEY` is in `frontend/.env`
- **Restart both servers** after adding env variables

### Issue: Payment modal doesn't open
**Solution:**
- Check browser console for errors
- Verify frontend `.env` file has the publishable key
- Check that Stripe is loading: Look for Stripe.js in Network tab

### Issue: "Payment failed" error
**Solution:**
- Check backend console for errors
- Verify backend `.env` has correct secret key
- Check Stripe Dashboard for error details
- Try a different test card

### Issue: Payment succeeds but status doesn't update
**Solution:**
- Check backend logs for webhook errors
- Manually confirm payment via Admin Dashboard
- Check database to see if payment was recorded

## 📊 Step 8: Check Payment Details

### In Stripe Dashboard:
1. Go to https://dashboard.stripe.com/test/payments
2. Click on your test payment
3. Verify:
   - Amount is correct
   - Status is "Succeeded"
   - Customer email matches
   - Metadata includes payment ID

### In Your Database:
If you have Prisma Studio:
```bash
cd backend
npm run prisma:studio
```

Check:
- `Payment` table - should have new record
- `paymentStatus` should be "PAID"
- `stripePaymentIntentId` should be populated

## 🎯 Quick Test Checklist

- [ ] Backend server running on port 5000
- [ ] Frontend server running
- [ ] Tutor account created
- [ ] Student account created
- [ ] Booking created
- [ ] Payment modal opens
- [ ] Test card accepted
- [ ] Payment succeeds
- [ ] Booking status updates
- [ ] Payment appears in Stripe Dashboard

## 🔗 Additional Test Scenarios

### Test Stripe Connect (Tutor Payouts):
1. Login as Tutor
2. Go to Profile > Payout Method
3. Click "Connect with Stripe"
4. Complete Stripe onboarding (test mode)
5. Verify account is connected

### Test Withdrawals:
1. As Tutor, request withdrawal
2. As Admin, approve withdrawal
3. Check Stripe Dashboard for payout

### Test Commission Calculation:
1. Make a payment (e.g., $100)
2. Check Admin Dashboard > Payments
3. Verify commission is calculated correctly
4. Verify tutor amount is correct

## 📝 Test Data Summary

**Test Accounts:**
- Tutor: `tutor@test.com` / `password123`
- Student: `student@test.com` / `password123`

**Test Card (Success):**
- `4242 4242 4242 4242`
- Expiry: `12/34`
- CVC: `123`
- ZIP: `12345`

**Test Card (Declined):**
- `4000 0000 0000 0002`

---

**Need Help?** Check the browser console and backend logs for detailed error messages.


