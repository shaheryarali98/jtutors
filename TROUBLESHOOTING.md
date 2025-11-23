# Troubleshooting: Frontend-Backend Connection Issues

## Problem: Login/Register Not Working in Production

If login and register work locally but not on the live site, the frontend is likely not connecting to the backend API.

## Quick Diagnosis

### Step 1: Check Browser Console
1. Open your live site: https://jtutors.com
2. Open browser DevTools (F12)
3. Go to Console tab
4. Try to login/register
5. Look for errors like:
   - `Network Error`
   - `CORS policy`
   - `404 Not Found` on `/api/auth/login`

### Step 2: Check Network Tab
1. In DevTools, go to Network tab
2. Try to login/register
3. Look for the API request:
   - **If URL shows**: `https://jtutors.com/api/auth/login` ❌ **WRONG** (frontend domain)
   - **Should show**: `https://jtutors.onrender.com/api/auth/login` ✅ **CORRECT** (backend domain)

## Solution

### The Problem
The frontend is using a relative path `/api` which resolves to `https://jtutors.com/api` instead of `https://jtutors.onrender.com/api`.

### Fix: Set Environment Variable

You need to set `VITE_API_URL` when building your frontend.

#### Option 1: Build with Environment Variable

```bash
cd frontend
VITE_API_URL=https://jtutors.onrender.com/api npm run build
```

#### Option 2: Create `.env.production` file

Create `frontend/.env.production`:

```env
VITE_API_URL=https://jtutors.onrender.com/api
```

Then build:
```bash
cd frontend
npm run build
```

#### Option 3: Set in Hosting Platform

If using Vercel, Netlify, or similar:

1. Go to your project settings
2. Find "Environment Variables" or "Build & Deploy Settings"
3. Add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://jtutors.onrender.com/api`
4. Redeploy

### Verify the Fix

After rebuilding and redeploying:

1. Open https://jtutors.com
2. Open browser console (F12)
3. You should see: `🔧 API Base URL: https://jtutors.onrender.com/api`
4. Try logging in
5. In Network tab, requests should go to `jtutors.onrender.com`

## Common Issues

### Issue 1: CORS Error
**Error**: `Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy`

**Solution**: 
- Check that `FRONTEND_URL=https://jtutors.com` is set in Render backend environment variables
- Verify backend CORS configuration in `backend/src/server.ts`

### Issue 2: 404 Not Found
**Error**: `404 Not Found` on API requests

**Solution**:
- Verify backend is running: https://jtutors.onrender.com/health
- Check that API routes are correct
- Ensure backend build completed successfully

### Issue 3: Network Error
**Error**: `Network Error` or `ERR_NETWORK`

**Solution**:
- Check backend is accessible: https://jtutors.onrender.com/health
- Verify `VITE_API_URL` is set correctly
- Check browser console for detailed error messages

## Testing Checklist

- [ ] Backend health check works: https://jtutors.onrender.com/health
- [ ] `VITE_API_URL` is set in production build
- [ ] Frontend console shows correct API URL
- [ ] Network tab shows requests going to `jtutors.onrender.com`
- [ ] No CORS errors in console
- [ ] Login/Register forms show proper error messages

## Still Not Working?

1. **Check Render Logs**: 
   - Go to Render dashboard
   - Check service logs for errors

2. **Check Backend Environment Variables**:
   - `FRONTEND_URL` should be `https://jtutors.com`
   - `DATABASE_URL` should be set
   - `JWT_SECRET` should be set

3. **Test Backend Directly**:
   ```bash
   curl https://jtutors.onrender.com/health
   curl -X POST https://jtutors.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"test"}'
   ```

4. **Check Browser Console**:
   - Look for the detailed error logs we added
   - They will show the exact URL being called
   - They will show CORS or network errors

