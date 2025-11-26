# Render Deployment - Quick Start

## 🚀 Fastest Way to Deploy

### Step 1: Create Database (2 minutes)

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Name: `jtutors-database`
4. Plan: **Free** (or Starter for production)
5. Click **"Create Database"**
6. Wait 1-2 minutes, then copy the **Internal Database URL**

### Step 2: Deploy Backend (3 minutes)

**Option A: Using Blueprint (Easiest)**

1. Click **"New +"** → **"Blueprint"**
2. Connect your GitHub/GitLab repository
3. Render will auto-detect `render.yaml`
4. Go to created service → **"Environment"** tab
5. Add these variables manually:
   - `JWT_SECRET` = (generate random 32+ char string)
   - `STRIPE_SECRET_KEY` = (if using payments)
   - `GOOGLE_CLIENT_ID` = (if using Google Classroom)
   - `GOOGLE_CLIENT_SECRET` = (if using Google Classroom)
   - `GOOGLE_REFRESH_TOKEN` = (if using Google Classroom)

**Option B: Manual Setup**

1. Click **"New +"** → **"Web Service"**
2. Connect repository
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:migrate`
4. Add environment variables (see below)

### Step 3: Environment Variables

Add these in your backend service → **Environment** tab:

```env
DATABASE_URL=<paste from Step 1>
NODE_ENV=production
PORT=5000
JWT_SECRET=<generate-random-string>
FRONTEND_URL=https://jtutors.com
```

**Optional:**
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_REDIRECT_URI=https://your-service.onrender.com/api/auth/google/callback
```

### Step 4: Deploy!

1. Click **"Save Changes"**
2. Render will automatically:
   - Build your app
   - Run database migrations
   - Start the server
3. Wait 2-3 minutes
4. Check **"Logs"** tab for "Server is running on port 5000"

### Step 5: Test

Visit: `https://your-service.onrender.com/health`

Should see: `{"status":"ok","message":"Server is running"}`

---

## ✅ Done!

Your backend is now live! 

**Next Steps:**
- Update frontend `VITE_API_URL` to point to your Render backend
- Test registration/login
- Monitor logs for any issues

---

## 🔗 Link Database (Optional but Recommended)

1. Go to backend service → **Settings**
2. Scroll to **"Connections"**
3. Click **"Add Database"**
4. Select `jtutors-database`
5. This auto-links them together

---

## 📝 Generate JWT_SECRET

```bash
# Linux/Mac
openssl rand -base64 32

# Or use online: https://randomkeygen.com/
```

---

## 🆘 Troubleshooting

**"Cannot connect to database"**
→ Check DATABASE_URL is correct
→ Ensure database is running (free tier spins down)

**"Migration failed"**
→ Check DATABASE_URL format
→ Verify database is accessible

**"Build failed"**
→ Check build logs
→ Ensure `npm run build` works locally

---

**Full guide**: See `RENDER_DEPLOYMENT_GUIDE.md` for detailed instructions.

