# How to Run Database Migrations on Render

Since you can't use the Render shell, here are your options:

## Option 1: Automatic Migration (Recommended - Already Set Up)

The `render.yaml` is configured to automatically run migrations when the service starts. 

**To trigger migrations now:**
1. Make a small change to any file (or just commit the current changes)
2. Push to your repository
3. Render will automatically:
   - Build the application
   - Run `prisma migrate deploy` 
   - Start the server

**This is the easiest option!** Just push your changes and wait for deployment.

---

## Option 2: Run Migrations from Your Local Machine

If you need to run migrations immediately without waiting for deployment:

### Step 1: Get Your Production Database URL

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your backend service
3. Go to **Environment** tab
4. Find `DATABASE_URL` and copy its value
   - It will look like: `postgresql://user:password@host:5432/database?schema=public`

### Step 2: Run Migrations Locally

Open your terminal and run:

```bash
cd backend
DATABASE_URL="paste-your-production-database-url-here" npx prisma migrate deploy
```

**Example:**
```bash
cd backend
DATABASE_URL="postgresql://user:pass@dpg-xxxxx-a.oregon-postgres.render.com/dbname?sslmode=require" npx prisma migrate deploy
```

### Step 3: Verify

After migrations complete, try registering a user again. It should work now!

---

## Option 3: Use the Migration Script

We've created a helper script for you:

```bash
cd backend
DATABASE_URL="your-production-database-url" node scripts/run-migrations.js
```

---

## Troubleshooting

### "Connection refused" or "Cannot connect to database"
- Make sure you copied the entire `DATABASE_URL` including the `?sslmode=require` part
- Check that your IP is allowed (Render databases usually allow all IPs by default)

### "Migration already applied"
- This is fine! It means migrations are already up to date.

### "No migrations found"
- Make sure you're in the `backend` directory
- Check that `prisma/migrations` folder exists

---

## Quick Checklist

- [ ] Get `DATABASE_URL` from Render dashboard
- [ ] Run migration command from your local machine
- [ ] Verify registration works
- [ ] Future deployments will auto-run migrations

---

## After Migrations Run

Once migrations are complete, your database will have all the required tables:
- User
- Tutor
- Student
- Subject
- AdminSettings
- And all other tables

You should now be able to register and login successfully!

