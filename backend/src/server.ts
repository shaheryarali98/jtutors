import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth.routes';
import tutorRoutes from './routes/tutor.routes';
import studentRoutes from './routes/student.routes';
import subjectRoutes from './routes/subject.routes';
import adminRoutes from './routes/admin.routes';
import uploadRoutes from './routes/upload.routes';
import paymentRoutes from './routes/payment.routes';
import withdrawalRoutes from './routes/withdrawal.routes';
import classSessionRoutes from './routes/classSession.routes';
import emailTemplateRoutes from './routes/emailTemplate.routes';
import settingsRoutes from './routes/settings.routes';
import checkrRoutes from './routes/checkr.routes';
import contactRoutes from './routes/contact.routes';
import messageRoutes from './routes/message.routes';
import tutorRequestRoutes from './routes/tutorRequest.routes';
import courseRoutes from './routes/course.routes';
import enrollmentRoutes from './routes/enrollment.routes';
import { handleStripeWebhook } from './controllers/stripe.webhook.controller';
import { initializeDefaultTemplates } from './services/emailTemplate.service';
import { startCronJobs } from './services/cron.service';
import { PrismaClient } from '@prisma/client';
import { getPublicTutorDetails, getPublicTutors } from './controllers/admin.controller';

dotenv.config();

const _patchPrisma = new PrismaClient();
async function ensureProductionColumns() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('file:')) return; // skip SQLite (local dev)
  try {
    await _patchPrisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false`);
    // Original columns
    await _patchPrisma.$executeRawUnsafe(`ALTER TABLE "Tutor" ADD COLUMN IF NOT EXISTS "jtutorsEmail" TEXT`);
    await _patchPrisma.$executeRawUnsafe(`ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT`);
    await _patchPrisma.$executeRawUnsafe(`ALTER TABLE "AdminSettings" ADD COLUMN IF NOT EXISTS "studentFeePercentage" DOUBLE PRECISION NOT NULL DEFAULT 4.5`);
    await _patchPrisma.$executeRawUnsafe(`ALTER TABLE "AdminSettings" ADD COLUMN IF NOT EXISTS "adminPaymentInfo" TEXT`);
    // Payment flow v2 — 3-tier fee structure
    await _patchPrisma.$executeRawUnsafe(`ALTER TABLE "AdminSettings" ADD COLUMN IF NOT EXISTS "platformCommissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 9.25`);
    await _patchPrisma.$executeRawUnsafe(`UPDATE "AdminSettings" SET "platformCommissionPercent" = 9.25 WHERE "platformCommissionPercent" = 10.0`);
    await _patchPrisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "studentFeeAmount" DOUBLE PRECISION`);
    await _patchPrisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "tutorDeductionAmount" DOUBLE PRECISION`);
    await _patchPrisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "studentChargeAmount" DOUBLE PRECISION`);
    await _patchPrisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT`);
    await _patchPrisma.$executeRawUnsafe(`ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "basePriceAmount" DOUBLE PRECISION`);
    await _patchPrisma.$executeRawUnsafe(`ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "studentFeeAmount" DOUBLE PRECISION`);
    await _patchPrisma.$executeRawUnsafe(`ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "adminCommissionAmount" DOUBLE PRECISION`);
    await _patchPrisma.$executeRawUnsafe(`ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "tutorDeductionAmount" DOUBLE PRECISION`);
    await _patchPrisma.$executeRawUnsafe(`ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "studentChargeAmount" DOUBLE PRECISION`);
    await _patchPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ExtraTimeCharge" (
        "id" TEXT NOT NULL,
        "bookingId" TEXT NOT NULL,
        "classSessionId" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "tutorId" TEXT NOT NULL,
        "scheduledHours" DOUBLE PRECISION NOT NULL,
        "actualHours" DOUBLE PRECISION NOT NULL,
        "extraHours" DOUBLE PRECISION NOT NULL,
        "baseAmount" DOUBLE PRECISION NOT NULL,
        "studentFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "adminCommissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "tutorAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "studentChargeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "stripeCheckoutSessionId" TEXT,
        "stripePaymentIntentId" TEXT,
        "stripeChargeId" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "paidAt" TIMESTAMP(3),
        "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ExtraTimeCharge_pkey" PRIMARY KEY ("id")
      )
    `);
    await _patchPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ExtraTimeCharge_classSessionId_key" ON "ExtraTimeCharge"("classSessionId")`);
    await _patchPrisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ExtraTimeCharge_studentId_status_idx" ON "ExtraTimeCharge"("studentId", "status")`);
    await _patchPrisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ExtraTimeCharge_tutorId_status_idx" ON "ExtraTimeCharge"("tutorId", "status")`);
    await _patchPrisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ExtraTimeCharge_bookingId_idx" ON "ExtraTimeCharge"("bookingId")`);
    console.log('✅ DB columns verified/patched');
  } catch (err: any) {
    console.error('⚠️ Column patch error (non-fatal):', err.message);
  } finally {
    await _patchPrisma.$disconnect();
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://jtutors.com',
  'https://jtutors-staging.vercel.app',
  'https://jtutor.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173', // Vite default port
].filter(Boolean) as string[];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow any vercel.app subdomain for staging/preview deployments
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));

// Stripe webhook route must be registered BEFORE body parsing middleware
// Stripe needs the raw body to verify webhook signatures
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Body parsing middleware for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/class-sessions', classSessionRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/checkr', checkrRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tutor-requests', tutorRequestRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);

// Dev-only bypass routes (never enabled in production)
if (process.env.NODE_ENV !== 'production' && process.env.DEV_BYPASS_STRIPE === 'true') {
  const devRoutes = require('./routes/dev.routes').default;
  app.use('/api/dev', devRoutes);
  console.log('[DEV] Stripe bypass routes enabled at /api/dev');
}

// Public API: approved tutors (no auth required)
const publicTutorHits = new Map<string, { count: number; resetAt: number }>();
const PUBLIC_TUTOR_WINDOW_MS = 60_000;
const PUBLIC_TUTOR_MAX_REQUESTS = 180;

const publicTutorRateLimit: express.RequestHandler = (req, res, next) => {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const entry = publicTutorHits.get(ip);

  if (!entry || now > entry.resetAt) {
    publicTutorHits.set(ip, { count: 1, resetAt: now + PUBLIC_TUTOR_WINDOW_MS });
    return next();
  }

  if (entry.count >= PUBLIC_TUTOR_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many public tutor requests. Please try again shortly.' });
  }

  entry.count += 1;
  publicTutorHits.set(ip, entry);
  return next();
};

app.get('/api/public/tutors', publicTutorRateLimit, getPublicTutors);
app.get('/api/public/tutors/:tutorId', publicTutorRateLimit, getPublicTutorDetails);

// Health check (both paths — /health and /api/health for frontend warm-up pings)
app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Patch missing DB columns and start server
ensureProductionColumns().then(() => {
  app.listen(PORT, async () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    // Ensure email templates are seeded on startup
    try {
      await initializeDefaultTemplates();
      console.log('Email templates initialized');
    } catch (err) {
      console.warn('Failed to initialize email templates:', err);
    }
    startCronJobs();
  });
});

