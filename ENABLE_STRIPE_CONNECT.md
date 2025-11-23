# How to Enable Stripe Connect

## The Issue

You're getting this error:
```
You can only create new accounts if you've signed up for Connect
```

This means **Stripe Connect is not enabled** in your Stripe account yet.

## Solution: Enable Stripe Connect

### Step 1: Log in to Stripe Dashboard

1. Go to https://dashboard.stripe.com
2. Make sure you're in **Test Mode** (toggle in the top right)
3. Log in with your Stripe account

### Step 2: Enable Stripe Connect

1. In the left sidebar, click on **"Connect"** (or go to https://dashboard.stripe.com/test/connect/overview)
2. If you don't see "Connect" in the sidebar:
   - Go to **Settings** → **Connect**
   - Or visit: https://dashboard.stripe.com/test/settings/connect
3. Click **"Get started"** or **"Enable Connect"**
4. Follow the setup wizard:
   - Choose your **platform type** (usually "Marketplace" or "Platform")
   - Select **Express accounts** (recommended for tutors)
   - Complete any required information

### Step 3: Verify Connect is Enabled

After enabling, you should see:
- **Connect** section in the left sidebar
- **Connected accounts** option
- **Settings** for Connect

### Step 4: Test Again

1. Go back to your application
2. Click "Connect with Stripe" again
3. It should now work! 🎉

## Quick Links

- **Stripe Connect Overview**: https://dashboard.stripe.com/test/connect/overview
- **Connect Settings**: https://dashboard.stripe.com/test/settings/connect
- **Stripe Connect Docs**: https://stripe.com/docs/connect

## What is Stripe Connect?

Stripe Connect allows you to:
- Accept payments on behalf of tutors
- Transfer funds to tutor accounts
- Handle payouts automatically
- Manage multiple connected accounts

This is required for your marketplace/platform where tutors receive payments.

## Alternative: If You Don't Want to Use Connect

If you prefer not to use Stripe Connect, you would need to:
1. Change the payment flow to direct payments
2. Handle payouts manually
3. Modify the code significantly

**However, Stripe Connect is the recommended approach** for marketplace/platform models like yours.

---

**After enabling Connect, restart your backend server and try again!**

