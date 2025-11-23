# Stripe Live Mode vs Test Mode

## The Issue

You're getting: `"Livemode requests must always be redirected via HTTPS"`

This happens because you're using **live mode keys** (`sk_live_...`) for localhost development.

## The Solution

**For localhost development, always use TEST MODE keys** (`sk_test_...`)

## Key Differences

### Test Mode Keys (`sk_test_...`)
- ✅ Work with `http://localhost`
- ✅ Safe for testing
- ✅ No real money transactions
- ✅ Use for development

### Live Mode Keys (`sk_live_...`)
- ❌ Require HTTPS (no `http://localhost`)
- ⚠️ Real money transactions
- ⚠️ Use only in production
- ✅ Must use HTTPS URLs

## How to Switch

### Step 1: Get Your Test Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Make sure you're in **Test mode** (toggle in top right)
3. Copy your **Test keys**:
   - Secret key: `sk_test_...`
   - Publishable key: `pk_test_...`

### Step 2: Update Your .env Files

**Backend (`backend/.env`):**
```env
STRIPE_SECRET_KEY=sk_test_your_test_key_here
```

**Frontend (`frontend/.env`):**
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key_here
```

### Step 3: Restart Servers

```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

## When to Use Each Mode

### Use Test Mode When:
- ✅ Developing on localhost
- ✅ Testing payment flows
- ✅ Building features
- ✅ Using `http://localhost`

### Use Live Mode When:
- ✅ Deployed to production
- ✅ Using HTTPS domain
- ✅ Ready for real transactions
- ✅ Have SSL certificate

## Your Current Setup

I've automatically updated your backend `.env` to use test mode keys.

**Test Keys (for development):**
- Secret: `sk_test_51KyxK0ATAUEkbWJXRBjZKdp2kSAxxvnELDuTEysqx7YVpt4LDEUGkQ3Ga9PO3hSde3M8BskFIjHzSUm96iC2T0CV00zXtFSsOp`
- Publishable: `pk_test_51KyxK0ATAUEkbWJXTuhaAeVgp1xEWb051HGnfxASskvO2xh4Z2uHhf0UTo6ZeRLjgnJAJH4QXr6sClnbbpEcOAfe0058bvwdR5`

## Quick Check

To verify you're using test keys:
```bash
# Backend
cd backend
cat .env | grep STRIPE_SECRET_KEY
# Should show: sk_test_...

# Frontend  
cd frontend
cat .env | grep VITE_STRIPE_PUBLISHABLE_KEY
# Should show: pk_test_...
```

## After Switching

1. ✅ Restart your backend server
2. ✅ Try "Connect with Stripe" again
3. ✅ It should work with `http://localhost` now!

---

**Remember:** Always use test keys for development, live keys for production! 🚀

