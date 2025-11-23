# Quick Fix: Enable Stripe Connect (2 Minutes)

## The Problem
You're seeing: `"You can only create new accounts if you've signed up for Connect"`

This means **Stripe Connect is not enabled** in your Stripe account.

## The Solution (2 Steps)

### Step 1: Enable Stripe Connect

1. **Open this link** (opens in new tab):
   👉 https://dashboard.stripe.com/test/settings/connect

2. **Click "Get started"** or **"Enable Connect"**

3. **Choose your setup:**
   - Select **"Marketplace"** or **"Platform"**
   - Choose **"Express accounts"** (recommended)
   - Click **"Continue"** or **"Save"**

4. **Done!** Connect is now enabled ✅

### Step 2: Test Again

1. Go back to your app: `http://localhost:3000/tutor/profile`
2. Click **"Connect with Stripe"** again
3. It should work now! 🎉

## Visual Guide

```
Stripe Dashboard
    ↓
Settings (left sidebar)
    ↓
Connect
    ↓
Click "Get started"
    ↓
Choose "Marketplace" → "Express accounts"
    ↓
Save/Continue
    ↓
✅ Done!
```

## Still Not Working?

1. **Make sure you're in Test Mode:**
   - Look for "Test mode" toggle in top right of Stripe Dashboard
   - Should be ON (blue/green)

2. **Check the Connect page:**
   - Go to: https://dashboard.stripe.com/test/connect/overview
   - You should see "Connected accounts" section

3. **Restart your backend:**
   ```bash
   # Stop backend (Ctrl+C)
   cd backend
   npm run dev
   ```

## What Changed?

I've updated the error messages to be more helpful. Now when you click "Connect with Stripe" and Connect isn't enabled, you'll see:
- Clear error message
- Direct link to enable Connect
- Step-by-step instructions

---

**After enabling Connect, try again - it will work!** 🚀


