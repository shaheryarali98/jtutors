# Stripe Connect Troubleshooting Guide

## Issue: "Error connecting to Stripe. Please try again."

### Step 1: Check Backend Server Logs

When you click "Connect with Stripe", check your **backend console** for error messages. Look for:
- `Stripe connect error: ...`
- Any error messages about Stripe API

### Step 2: Verify Environment Variables

**Backend `.env` file should have:**
```env
STRIPE_SECRET_KEY=sk_test_51KyxK0ATAUEkbWJXRBjZKdp2kSAxxvnELDuTEysqx7YVpt4LDEUGkQ3Ga9PO3hSde3M8BskFIjHzSUm96iC2T0CV00zXtFSsOp
FRONTEND_URL=http://localhost:3000
```

**To verify:**
```bash
cd backend
cat .env | grep STRIPE
```

### Step 3: Restart Backend Server

After any `.env` changes, **restart the backend server**:
```bash
cd backend
# Stop the server (Ctrl+C)
npm run dev
```

### Step 4: Check Browser Console

1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Click "Connect with Stripe"
4. Look for any error messages

### Step 5: Check Network Tab

1. Open browser Developer Tools (F12)
2. Go to **Network** tab
3. Click "Connect with Stripe"
4. Find the request to `/api/tutor/stripe/connect`
5. Check:
   - **Status code** (should be 200, not 500)
   - **Response** - what error message does it show?

### Common Issues & Solutions

#### Issue 1: "Stripe is not configured"
**Solution:**
- Check `STRIPE_SECRET_KEY` is in `backend/.env`
- Restart backend server
- Verify the key starts with `sk_test_` or `sk_live_`

#### Issue 2: "Invalid API Key"
**Solution:**
- Verify the Stripe secret key is correct
- Make sure there are no extra spaces or quotes
- Check Stripe Dashboard to confirm the key is active

#### Issue 3: "Tutor profile not found"
**Solution:**
- Make sure you're logged in as a **Tutor** (not Student)
- Complete your tutor profile first
- Check that you have a tutor record in the database

#### Issue 4: Network/CORS Error
**Solution:**
- Check backend is running on port 5000
- Check frontend API base URL is correct
- Verify CORS is enabled in backend

#### Issue 5: Frontend URL Mismatch
**Solution:**
- If your frontend runs on a different port (e.g., 5173), update `FRONTEND_URL`:
  ```env
  FRONTEND_URL=http://localhost:5173
  ```
- Restart backend after changing

### Testing the Endpoint Directly

You can test the Stripe Connect endpoint directly:

```bash
# First, get your auth token (login as tutor)
# Then test the endpoint:
curl -X POST http://localhost:5000/api/tutor/stripe/connect \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Debug Steps

1. **Check backend logs** when clicking the button
2. **Check browser console** for frontend errors
3. **Check Network tab** for API response
4. **Verify Stripe keys** are correct
5. **Restart both servers** after any changes

### Still Not Working?

1. **Check Stripe Dashboard:**
   - Go to https://dashboard.stripe.com/test/connect/overview
   - Verify Connect is enabled
   - Check for any account restrictions

2. **Test Stripe API directly:**
   ```bash
   # Install Stripe CLI (optional)
   stripe login
   stripe accounts create --type=express
   ```

3. **Check database:**
   - Verify tutor record exists
   - Check if `stripeAccountId` is being saved

4. **Enable detailed logging:**
   - Add `console.log` statements in the controller
   - Check what error Stripe is returning

### Expected Behavior

When working correctly:
1. Click "Connect with Stripe"
2. Backend creates/retrieves Stripe Connect account
3. Backend creates account link
4. Frontend redirects to Stripe onboarding page
5. After completion, redirects back to your app

### Quick Fix Checklist

- [ ] Backend server is running
- [ ] `STRIPE_SECRET_KEY` is in `backend/.env`
- [ ] `FRONTEND_URL` matches your frontend URL
- [ ] Backend server was restarted after `.env` changes
- [ ] You're logged in as a Tutor
- [ ] Tutor profile exists
- [ ] Check backend console for errors
- [ ] Check browser console for errors

---

**Need more help?** Check the backend console logs - they will show the exact Stripe API error.

