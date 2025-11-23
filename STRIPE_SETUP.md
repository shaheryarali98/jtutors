# Stripe Integration Setup Guide

This guide will walk you through connecting Stripe to your application. The code is already set up - you just need to configure your Stripe account and add the API keys.

## 📋 Prerequisites

- A Stripe account (sign up at https://stripe.com)
- Access to your backend `.env` file
- Access to your frontend environment configuration

## 🚀 Quick Setup Steps

### Step 1: Get Your Stripe API Keys

1. **Sign up or log in** to your Stripe account at https://stripe.com
2. **Go to Developers > API keys** in the Stripe Dashboard
3. **Copy your keys:**
   - **Publishable Key** (starts with `pk_test_` for test mode or `pk_live_` for live mode)
   - **Secret Key** (starts with `sk_test_` for test mode or `sk_live_` for live mode)

   ⚠️ **Important:** Start with **test mode** keys (`pk_test_` and `sk_test_`) for development and testing.

### Step 2: Configure Backend Environment Variables

1. **Navigate to your backend directory:**
   ```bash
   cd backend
   ```

2. **Create or edit the `.env` file** and add:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ADMIN_STRIPE_ACCOUNT_ID=acct_your_account_id_here
   FRONTEND_URL=http://localhost:3000
   ```

   **Notes:**
   - Replace `sk_test_your_secret_key_here` with your actual Stripe Secret Key
   - `STRIPE_WEBHOOK_SECRET` is optional for development but recommended (see Step 4)
   - `ADMIN_STRIPE_ACCOUNT_ID` is optional - only needed if you want admin payouts
   - `FRONTEND_URL` should match your frontend URL

### Step 3: Configure Frontend Environment Variables

1. **Navigate to your frontend directory:**
   ```bash
   cd frontend
   ```

2. **Create or edit the `.env` file** (or `.env.local` for Vite) and add:
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   ```

   **Note:** Replace `pk_test_your_publishable_key_here` with your actual Stripe Publishable Key

3. **Restart your frontend dev server** after adding the environment variable:
   ```bash
   npm run dev
   ```

### Step 4: Set Up Stripe Webhooks (Recommended)

Webhooks allow Stripe to notify your application when payments succeed or fail automatically.

#### For Development (using Stripe CLI):

1. **Install Stripe CLI:**
   - Download from https://stripe.com/docs/stripe-cli
   - Or use: `brew install stripe/stripe-cli/stripe` (macOS) or `scoop install stripe` (Windows)

2. **Login to Stripe CLI:**
   ```bash
   stripe login
   ```

3. **Forward webhooks to your local server:**
   ```bash
   stripe listen --forward-to localhost:5000/api/stripe/webhook
   ```

4. **Copy the webhook signing secret** (starts with `whsec_`) and add it to your backend `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

#### For Production:

1. **Go to Stripe Dashboard > Developers > Webhooks**
2. **Click "Add endpoint"**
3. **Enter your endpoint URL:**
   ```
   https://yourdomain.com/api/stripe/webhook
   ```
4. **Select events to listen to:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payout.paid`
   - `payout.failed`
   - `account.updated` (for Stripe Connect onboarding)
5. **Copy the webhook signing secret** and add it to your production `.env`

### Step 5: Enable Stripe Connect (For Tutor Payouts)

If you want tutors to receive payments directly:

1. **Go to Stripe Dashboard > Settings > Connect**
2. **Enable Stripe Connect** if not already enabled
3. **Choose your Connect platform type** (Express accounts recommended)
4. **Configure your Connect settings** as needed

## ✅ Verification

### Test Payment Flow:

1. **Start your backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start your frontend server:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test with Stripe test card:**
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

4. **Create a test payment** through your application and verify it processes correctly.

### Check Logs:

- Backend should show: `[Stripe] STRIPE_SECRET_KEY configured` (no warnings)
- Frontend should load the payment modal without showing "Stripe is not configured"
- Check browser console for any Stripe-related errors

## 🔧 What's Already Implemented

Your application already includes:

✅ **Payment Processing:**
- Payment intent creation
- Payment confirmation
- Commission calculation
- Payment history tracking

✅ **Stripe Connect:**
- Tutor account creation
- Onboarding flow
- Account status checking
- Transfer capabilities

✅ **Withdrawals:**
- Payout creation
- Withdrawal status tracking
- Webhook handling for payout completion

✅ **Webhook Handling:**
- Payment success/failure events
- Payout success/failure events
- Account update events (for onboarding)

## 📝 Environment Variables Summary

### Backend (`.env`):
```env
STRIPE_SECRET_KEY=sk_test_...          # Required
STRIPE_WEBHOOK_SECRET=whsec_...        # Recommended
ADMIN_STRIPE_ACCOUNT_ID=acct_...       # Optional
FRONTEND_URL=http://localhost:3000     # Required for Connect
```

### Frontend (`.env` or `.env.local`):
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Required
```

## 🚨 Common Issues

### Issue: "Stripe is not configured" error
**Solution:** 
- Check that `STRIPE_SECRET_KEY` is set in backend `.env`
- Check that `VITE_STRIPE_PUBLISHABLE_KEY` is set in frontend `.env`
- Restart both servers after adding environment variables

### Issue: Webhook signature verification fails
**Solution:**
- Ensure `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe Dashboard
- Make sure webhook endpoint uses raw body parsing (already configured)
- For local development, use Stripe CLI to forward webhooks

### Issue: Payment modal doesn't appear
**Solution:**
- Check browser console for errors
- Verify `VITE_STRIPE_PUBLISHABLE_KEY` is correctly set
- Ensure frontend dev server was restarted after adding env variable

### Issue: "Payment intent not found" error
**Solution:**
- Check that payment was created successfully
- Verify Stripe keys are correct
- Check backend logs for Stripe API errors

## 🔒 Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env` files** to version control
2. **Use test keys** (`sk_test_`, `pk_test_`) for development
3. **Switch to live keys** (`sk_live_`, `pk_live_`) only in production
4. **Keep webhook secrets secure** - they verify webhook authenticity
5. **Use HTTPS** in production for webhook endpoints
6. **Rotate keys** if they're ever exposed

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Connect Guide](https://stripe.com/docs/connect)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

## 🎯 Next Steps

After setting up Stripe:

1. ✅ Test payment flow with test cards
2. ✅ Test tutor Stripe Connect onboarding
3. ✅ Test withdrawal/payout flow
4. ✅ Set up production webhooks
5. ✅ Switch to live mode keys when ready for production

---

**Need Help?** Check the logs, Stripe Dashboard events, or refer to the Stripe documentation.

