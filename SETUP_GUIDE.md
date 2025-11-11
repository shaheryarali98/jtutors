# Quick Setup Guide

Follow these steps to get your Tutor Portal running:

## Step 1: Database Setup

```bash
# Create PostgreSQL database
createdb tutor_portal

# Or using psql:
psql -U postgres
CREATE DATABASE tutor_portal;
\q
```

## Step 2: Backend Configuration

```bash
# Navigate to backend
cd backend

# Create .env file (copy the example below)
cat > .env << EOL
DATABASE_URL="postgresql://postgres:password@localhost:5432/tutor_portal?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=5000
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
EOL

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed subjects (optional)
node scripts/seed.js
```

## Step 3: Install All Dependencies

```bash
# From root directory
cd ..
npm run install-all
```

## Step 4: Start Development Servers

```bash
# Option 1: Run both servers together (from root)
npm run dev

# Option 2: Run separately
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## Step 5: Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Prisma Studio: `cd backend && npx prisma studio`

## Step 6: Create Your First Account

1. Go to http://localhost:3000
2. Click "Register"
3. Choose "Tutor" or "Student"
4. Fill in your email and password
5. For tutors: Complete your profile setup

## Stripe Setup (For Tutors)

1. Create a Stripe account at https://stripe.com
2. Go to Developers → API Keys
3. Copy your test API keys
4. Update `backend/.env` with your keys
5. In the app, go to Tutor Profile → Payout Method
6. Click "Connect with Stripe"

## Troubleshooting

### "Port already in use"
Kill the process using the port:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9
```

### "Database connection failed"
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in backend/.env
- Ensure database exists: `psql -l`

### "Prisma error"
```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### "Module not found"
```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
npm run install-all
```

## Default Test Accounts

After setup, you can create test accounts:

**Test Tutor:**
- Email: tutor@test.com
- Password: password123

**Test Student:**
- Email: student@test.com
- Password: password123

## Next Steps

1. ✅ Explore the tutor profile setup
2. ✅ Add your teaching experience and education
3. ✅ Select subjects you can teach
4. ✅ Set your availability
5. ✅ Connect Stripe for payments
6. ✅ Complete background check

## Need Help?

- Check the main README.md for detailed information
- Review API documentation in the code
- Open an issue on GitHub

