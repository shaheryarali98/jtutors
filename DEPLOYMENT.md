# Deployment Configuration Guide

This guide explains how to configure your application for production deployment.

## Frontend Deployment (https://jtutors.com)

### Environment Variables

Create a `.env.production` file in the `frontend` directory (or set these in your hosting platform):

```env
VITE_API_URL=https://jtutors.onrender.com/api
```

**Important:** 
- Vite requires environment variables to be prefixed with `VITE_`
- These variables are embedded at build time, so rebuild after changing them
- If `VITE_API_URL` is not set, the app will use `/api` (relative path) which only works if frontend and backend are on the same domain

### Build Command

```bash
cd frontend
npm run build
```

The build output will be in `frontend/dist/` directory.

---

## Backend Deployment (https://jtutors.onrender.com)

### Environment Variables

Set these in your Render dashboard (or `.env` file):

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public

# Server
PORT=5000
NODE_ENV=production

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Frontend URL (for CORS and Stripe redirects)
FRONTEND_URL=https://jtutors.com
```

### Render Configuration

If using `render.yaml`, the configuration is already set. Otherwise, configure in Render dashboard:

- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`

### Database Migrations

After deployment, run Prisma migrations:

```bash
cd backend
npx prisma migrate deploy
```

Or set up a one-time script in Render to run migrations automatically.

---

## CORS Configuration

The backend is configured to allow requests from:
- `https://jtutors.com` (production)
- `http://localhost:3000` (local development)
- `http://localhost:5173` (Vite dev server)

If you need to add more domains, update `backend/src/server.ts`.

---

## Testing the Deployment

1. **Frontend**: Visit https://jtutors.com
2. **Backend Health Check**: Visit https://jtutors.onrender.com/health
3. **API Test**: Try logging in or making an API call from the frontend

---

## Troubleshooting

### Frontend can't connect to backend

1. Check that `VITE_API_URL` is set correctly in your frontend build
2. Verify CORS is configured correctly in backend
3. Check browser console for CORS errors
4. Verify backend is running: `curl https://jtutors.onrender.com/health`

### Stripe redirects not working

1. Ensure `FRONTEND_URL` is set to `https://jtutors.com` in backend
2. Check Stripe dashboard webhook URLs
3. Verify HTTPS is being used (required for live mode)

### Build errors on Render

1. Check that TypeScript is installed (it's in devDependencies)
2. Verify `npm run build` runs successfully locally
3. Check Render build logs for specific errors

---

## Security Checklist

- [ ] `JWT_SECRET` is a strong, random string
- [ ] `DATABASE_URL` uses SSL connection
- [ ] All environment variables are set in production
- [ ] CORS is configured to only allow your frontend domain
- [ ] HTTPS is enabled on both frontend and backend
- [ ] Stripe keys are production keys (not test keys)

