# Complete Render Deployment Guide

This guide walks you through deploying your backend and database to Render.com step by step.

## 📋 Prerequisites

- A Render.com account (sign up at https://render.com)
- Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
- All environment variables ready

---

## 🗄️ Step 1: Create PostgreSQL Database on Render

### 1.1 Create Database Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** button
3. Select **"PostgreSQL"**
4. Fill in the details:
   - **Name**: `jtutors-database` (or your preferred name)
   - **Database**: `jtutorsdb` (or your preferred name)
   - **User**: `jtutors_user` (or auto-generated)
   - **Region**: Choose closest to your users (e.g., `Oregon (US West)`)
   - **PostgreSQL Version**: `15` or latest
   - **Plan**: 
     - **Free**: For testing (spins down after inactivity)
     - **Starter ($7/month)**: For production (always on)
5. Click **"Create Database"**

### 1.2 Get Database Connection String

1. Wait for database to be created (takes 1-2 minutes)
2. Once ready, click on your database service
3. Go to **"Info"** tab
4. Find **"Internal Database URL"** or **"External Database URL"**
5. Copy the connection string - it looks like:
   ```
   postgresql://jtutors_user:password@dpg-xxxxx-a.oregon-postgres.render.com/jtutorsdb?sslmode=require
   ```
6. **Save this URL** - you'll need it for the backend service

---

## 🚀 Step 2: Deploy Backend Service

### Option A: Using render.yaml (Recommended - Automatic Setup)

If you have `render.yaml` in your repository root:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your Git repository
4. Render will automatically detect `render.yaml` and create the service
5. Go to the created service → **"Environment"** tab
6. Add all required environment variables (see Step 3)

### Option B: Manual Setup (Step by Step)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your Git repository:
   - Select your repository
   - Choose the branch (usually `main` or `master`)
4. Configure the service:
   - **Name**: `tutor-portal-backend` (or your preferred name)
   - **Region**: Same as database (recommended)
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:migrate`
5. Click **"Create Web Service"**

---

## 🔐 Step 3: Configure Environment Variables

Go to your backend service → **"Environment"** tab and add these variables:

### Required Variables

```env
# Database (from Step 1.2)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Server
NODE_ENV=production
PORT=5000

# Authentication
JWT_SECRET=your-super-secret-random-string-min-32-characters

# Frontend URL (for CORS)
FRONTEND_URL=https://jtutors.com
```

### Optional but Recommended

```env
# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Google Classroom (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
GOOGLE_REDIRECT_URI=https://jtutors.onrender.com/api/auth/google/callback

# Email (if using)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=noreply@jtutors.com
```

### How to Add Variables

1. Click **"Add Environment Variable"**
2. Enter the **Key** (e.g., `DATABASE_URL`)
3. Enter the **Value** (paste your connection string or secret)
4. Click **"Save Changes"**
5. Repeat for all variables

**Important Notes:**
- `DATABASE_URL` should use the **Internal Database URL** if both services are in the same region
- Use **External Database URL** if services are in different regions
- For `JWT_SECRET`, generate a strong random string:
  ```bash
  # On Linux/Mac
  openssl rand -base64 32
  
  # Or use an online generator
  ```

---

## 🔄 Step 4: Database Migrations

### Automatic Migration (Already Configured)

Your `render.yaml` and `package.json` are set up to automatically run migrations:

```yaml
startCommand: npm run start:migrate
```

This runs `prisma migrate deploy` before starting the server, so migrations happen automatically on every deployment.

### Manual Migration (If Needed)

If you need to run migrations manually:

1. **Get your DATABASE_URL** from Render dashboard
2. **Run from your local machine:**
   ```bash
   cd backend
   DATABASE_URL="your-production-database-url" npx prisma migrate deploy
   ```

---

## ✅ Step 5: Deploy and Verify

### 5.1 Trigger Deployment

1. If using `render.yaml`: Push any change to your repository
2. If manual setup: Render will auto-deploy on first creation
3. Watch the **"Events"** tab for build progress

### 5.2 Verify Deployment

1. **Check Build Logs:**
   - Go to **"Events"** tab
   - Look for successful build messages
   - Check for any errors

2. **Test Health Endpoint:**
   ```
   https://your-service-name.onrender.com/health
   ```
   Should return: `{"status":"ok","message":"Server is running"}`

3. **Check Database Connection:**
   - Look for "Database migrations completed" in logs
   - Try registering a user to test database

---

## 🔧 Step 6: Connect Database to Backend

### Link Database in Render

1. Go to your **backend service**
2. Go to **"Settings"** tab
3. Scroll to **"Connections"** section
4. Click **"Add Database"**
5. Select your PostgreSQL database
6. This automatically adds `DATABASE_URL` to your environment variables

**Note:** If you manually added `DATABASE_URL`, you can skip this step.

---

## 📊 Step 7: Monitor and Troubleshoot

### View Logs

1. Go to your backend service
2. Click **"Logs"** tab
3. View real-time logs
4. Look for errors or warnings

### Common Issues

#### Issue: "Cannot connect to database"
**Solution:**
- Verify `DATABASE_URL` is correct
- Check database is running (not spun down on free tier)
- Ensure database and backend are in same region (or use external URL)

#### Issue: "Migration failed"
**Solution:**
- Check database connection string
- Verify Prisma schema matches migrations
- Check logs for specific error

#### Issue: "Port already in use"
**Solution:**
- Render automatically sets PORT - don't override it
- Remove `PORT=5000` from environment variables if causing issues

#### Issue: "Build failed"
**Solution:**
- Check build logs for specific error
- Verify `npm run build` works locally
- Ensure all dependencies are in `package.json`

---

## 🎯 Step 8: Update render.yaml (Optional)

If you want to use `render.yaml` for future deployments, update it with your database:

```yaml
services:
  - type: web
    name: tutor-portal-backend
    env: node
    rootDir: backend
    buildCommand: npm install && npm run build
    startCommand: npm run start:migrate
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: jtutors-database  # Your database service name
          property: connectionString
      - key: JWT_SECRET
        sync: false  # Set manually in dashboard
      - key: STRIPE_SECRET_KEY
        sync: false
      - key: STRIPE_WEBHOOK_SECRET
        sync: false
      - key: FRONTEND_URL
        value: https://jtutors.com
      - key: PORT
        value: 5000

databases:
  - name: jtutors-database
    databaseName: jtutorsdb
    user: jtutors_user
    plan: free  # or starter for production
```

---

## 🔒 Security Checklist

Before going live, ensure:

- [ ] `JWT_SECRET` is a strong, random string (32+ characters)
- [ ] `DATABASE_URL` uses SSL (`?sslmode=require`)
- [ ] All sensitive variables are set (not hardcoded)
- [ ] CORS is configured correctly
- [ ] Stripe keys are production keys (not test)
- [ ] HTTPS is enabled (automatic on Render)
- [ ] Database backups are enabled (on paid plans)

---

## 📝 Quick Reference

### Your Render URLs

- **Backend**: `https://tutor-portal-backend.onrender.com`
- **Health Check**: `https://tutor-portal-backend.onrender.com/health`
- **API Base**: `https://tutor-portal-backend.onrender.com/api`

### Important Commands

```bash
# Run migrations locally (connect to production DB)
cd backend
DATABASE_URL="your-render-db-url" npx prisma migrate deploy

# Check Prisma connection
DATABASE_URL="your-render-db-url" npx prisma studio
```

### Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string from Render |
| `JWT_SECRET` | ✅ Yes | Random string for JWT tokens |
| `NODE_ENV` | ✅ Yes | Set to `production` |
| `PORT` | ✅ Yes | Set to `5000` |
| `FRONTEND_URL` | ✅ Yes | Your frontend domain |
| `STRIPE_SECRET_KEY` | ⚠️ Optional | For payments |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Optional | For Stripe webhooks |
| `GOOGLE_CLIENT_ID` | ⚠️ Optional | For Google Classroom |
| `GOOGLE_CLIENT_SECRET` | ⚠️ Optional | For Google Classroom |
| `GOOGLE_REFRESH_TOKEN` | ⚠️ Optional | For Google Classroom |

---

## 🆘 Need Help?

1. **Check Render Docs**: https://render.com/docs
2. **View Service Logs**: Go to your service → Logs tab
3. **Check Build Logs**: Go to Events tab → Click on latest build
4. **Test Locally**: Make sure everything works locally first

---

## 🎉 Success!

Once deployed, you should see:
- ✅ Backend running on Render
- ✅ Database connected and migrations applied
- ✅ Health endpoint responding
- ✅ API accessible from your frontend

Your backend is now live! 🚀

