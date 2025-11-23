# Stripe Quick Start Guide

## 🎯 What You Need

To connect Stripe, you need **3 things**:

1. **Stripe Account** - Sign up at https://stripe.com
2. **API Keys** - Get from Stripe Dashboard > Developers > API keys
3. **Environment Variables** - Add keys to your `.env` files

## ⚡ Quick Setup (5 minutes)

### 1. Get Stripe Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### 2. Backend Setup

Create/edit `backend/.env`:
```env
STRIPE_SECRET_KEY=sk_test_your_key_here
FRONTEND_URL=http://localhost:3000
```

### 3. Frontend Setup

Create/edit `frontend/.env` (or `frontend/.env.local`):
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### 4. Restart Servers

```bash
# Backend
cd backend
npm run dev

# Frontend (in new terminal)
cd frontend
npm run dev
```

## ✅ Test It

Use Stripe test card:
- **Card:** `4242 4242 4242 4242`
- **Expiry:** Any future date (e.g., `12/34`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

## 📚 Full Documentation

See `STRIPE_SETUP.md` for:
- Webhook setup
- Stripe Connect setup
- Production configuration
- Troubleshooting

## 🆘 Quick Troubleshooting

**"Stripe is not configured"**
→ Check that env variables are set and servers restarted

**Payment modal doesn't show**
→ Check `VITE_STRIPE_PUBLISHABLE_KEY` in frontend `.env`

**Webhook errors**
→ Optional for development, see `STRIPE_SETUP.md` for setup

---

That's it! Your Stripe integration is ready. 🎉

