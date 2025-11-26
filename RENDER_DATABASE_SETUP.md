# Render Database Setup - Step by Step

## 🗄️ Step 1: Create PostgreSQL Database on Render

### 1.1 Create Database Service

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +"** button (top right)
3. **Select "PostgreSQL"**
4. **Fill in the form:**
   - **Name**: `jtutors-database` (or any name you prefer)
   - **Database**: `jtutorsdb` (or any name)
   - **User**: `jtutors_user` (or auto-generated)
   - **Region**: Choose closest to your users
     - `Oregon (US West)` - Good for US West Coast
     - `Frankfurt (EU)` - Good for Europe
     - `Singapore (Asia)` - Good for Asia
   - **PostgreSQL Version**: `15` (or latest available)
   - **Plan**: 
     - **Free**: For testing (spins down after 90 days of inactivity)
     - **Starter ($7/month)**: For production (always on, recommended)
5. **Click "Create Database"**
6. **Wait 1-2 minutes** for database to be created

### 1.2 Get Database Connection String

Once the database is ready:

1. **Click on your database service** (e.g., `jtutors-database`)
2. **Go to "Info" tab**
3. **Find "Internal Database URL"** (use this if backend is in same region)
   - OR **"External Database URL"** (use this if backend is in different region)
4. **Copy the connection string** - it looks like:
   ```
   postgresql://jtutors_user:password@dpg-xxxxx-a.oregon-postgres.render.com/jtutorsdb?sslmode=require
   ```
5. **Save this URL** - you'll need it in Step 3

---

## 🚀 Step 2: Deploy Backend Service

### Option A: Using Blueprint (Easiest - Recommended)

1. **Go to Render Dashboard**
2. **Click "New +"** → **"Blueprint"**
3. **Connect your Git repository:**
   - Select your Git provider (GitHub, GitLab, Bitbucket)
   - Authorize Render
   - Select your repository
   - Select branch (usually `main` or `master`)
4. **Render will automatically:**
   - Detect `render.yaml` file
   - Create the web service
   - Set up basic configuration
5. **Go to the created service** → **"Environment"** tab
6. **Add missing environment variables** (see Step 3)

### Option B: Manual Setup

1. **Go to Render Dashboard**
2. **Click "New +"** → **"Web Service"**
3. **Connect your Git repository:**
   - Select provider and repository
   - Choose branch: `main`
4. **Configure the service:**
   - **Name**: `tutor-portal-backend`
   - **Region**: Same as database (recommended)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:migrate`
5. **Click "Create Web Service"**

---

## 🔐 Step 3: Add Environment Variables

Go to your **backend service** → **"Environment"** tab → Click **"Add Environment Variable"**

### Required Variables (Add These First)

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db?sslmode=require` | Paste from Step 1.2 |
| `JWT_SECRET` | `your-random-32-char-string` | Generate with: `openssl rand -base64 32` |
| `NODE_ENV` | `production` | |
| `PORT` | `5000` | |
| `FRONTEND_URL` | `https://jtutors.com` | Your frontend domain |

### Optional Variables (Add If Using)

| Variable | Value | Notes |
|----------|-------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Your Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe webhook secret |
| `GOOGLE_CLIENT_ID` | `440291992108-5g2r0irv65jhhls8r7lv68dauvn0aqk9.apps.googleusercontent.com` | Your Google Client ID |
| `GOOGLE_CLIENT_SECRET` | `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` | Your Google Client Secret |
| `GOOGLE_REFRESH_TOKEN` | `1//04GrjBVeoCIcVCgYIARAAGAQSNwF-...` | Your Google Refresh Token |
| `GOOGLE_REDIRECT_URI` | `https://tutor-portal-backend.onrender.com/api/auth/google/callback` | Update with your actual service URL |

### How to Add Variables

1. Click **"Add Environment Variable"**
2. Enter **Key**: `DATABASE_URL`
3. Paste **Value**: Your database connection string
4. Click **"Save Changes"**
5. Repeat for each variable

**Important:**
- Use **Internal Database URL** if backend and database are in same region
- Use **External Database URL** if they're in different regions
- Make sure `DATABASE_URL` includes `?sslmode=require` at the end

---

## 🔗 Step 4: Link Database to Backend (Optional but Recommended)

This automatically adds `DATABASE_URL` to your backend:

1. Go to your **backend service**
2. Go to **"Settings"** tab
3. Scroll to **"Connections"** section
4. Click **"Add Database"**
5. Select your PostgreSQL database (`jtutors-database`)
6. Render will automatically add `DATABASE_URL` to environment variables

**Note:** If you already manually added `DATABASE_URL`, this step is optional.

---

## ✅ Step 5: Deploy and Verify

### 5.1 Trigger Deployment

- **If using Blueprint**: Push any change to your repository
- **If manual setup**: Render will auto-deploy on creation
- **Watch the "Events" tab** for build progress

### 5.2 Check Build Logs

1. Go to **"Events"** tab
2. Click on the latest build
3. Look for:
   - ✅ `npm install` completed
   - ✅ `npm run build` completed
   - ✅ `prisma migrate deploy` completed
   - ✅ `Server is running on port 5000`

### 5.3 Test Deployment

1. **Health Check:**
   ```
   https://your-service-name.onrender.com/health
   ```
   Should return: `{"status":"ok","message":"Server is running"}`

2. **Test Database:**
   - Try registering a user
   - Check logs for any database errors

---

## 🐛 Troubleshooting

### Error: "Cannot connect to database"

**Solutions:**
1. Verify `DATABASE_URL` is correct (copy from database Info tab)
2. Check database is running (free tier may spin down)
3. Ensure URL includes `?sslmode=require`
4. Try using **Internal Database URL** if services are in same region

### Error: "Migration failed"

**Solutions:**
1. Check `DATABASE_URL` format is correct
2. Verify database is accessible
3. Check build logs for specific error
4. Try running migration manually (see below)

### Error: "Prisma schema validation - URL must start with file:"

**This means your local `.env` has SQLite URL, but schema is PostgreSQL.**

**For Local Development:**
- Keep using SQLite locally (change schema provider to `sqlite` if needed)
- OR set up local PostgreSQL

**For Render Deployment:**
- Schema is already correct (`postgresql`)
- Just make sure `DATABASE_URL` in Render points to PostgreSQL

### Database Spins Down (Free Tier)

**Free tier databases spin down after 90 days of inactivity.**

**Solutions:**
1. Upgrade to **Starter plan ($7/month)** - always on
2. Or manually wake it up by connecting to it
3. First request after spin-down may take 30-60 seconds

---

## 📝 Manual Migration (If Needed)

If automatic migration fails, run manually:

1. **Get DATABASE_URL from Render:**
   - Go to database service → Info tab
   - Copy Internal or External Database URL

2. **Run from your local machine:**
   ```bash
   cd backend
   DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require" npx prisma migrate deploy
   ```

3. **Or use the script:**
   ```bash
   cd backend
   DATABASE_URL="your-database-url" node scripts/run-migrations.js
   ```

---

## 🎯 Quick Checklist

Before deploying, ensure:

- [ ] PostgreSQL database created on Render
- [ ] Database URL copied and saved
- [ ] Backend service created
- [ ] All environment variables added
- [ ] `DATABASE_URL` points to PostgreSQL (not SQLite)
- [ ] `JWT_SECRET` is a strong random string
- [ ] `FRONTEND_URL` is correct
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm run start:migrate`

---

## 🎉 Success Indicators

You'll know it's working when:

- ✅ Build completes successfully
- ✅ Logs show: "Database migrations completed"
- ✅ Logs show: "Server is running on port 5000"
- ✅ Health endpoint returns: `{"status":"ok"}`
- ✅ You can register/login users
- ✅ No database connection errors in logs

---

## 📞 Next Steps

After successful deployment:

1. **Update Frontend**: Set `VITE_API_URL` to your Render backend URL
2. **Test API**: Try making requests from frontend
3. **Monitor Logs**: Check for any errors
4. **Set up Custom Domain**: (Optional) Point your domain to Render service

Your backend and database are now live on Render! 🚀

