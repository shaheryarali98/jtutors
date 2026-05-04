import { PrismaClient } from '@prisma/client';
import { createEnrollmentCheckoutSession, calculatePaymentBreakdown } from './stripe.service';

const prisma = new PrismaClient();

// ── Student initiates checkout ────────────────────────────────────────────────
export const createEnrollmentCheckout = async (
  courseId: string,
  studentId: string,
  frontendUrl: string
) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      tutor: { select: { id: true, stripeAccountId: true, stripeOnboarded: true } },
      _count: { select: { enrollments: { where: { status: 'PAID' } } } },
    },
  });

  if (!course) throw new Error('Course not found');
  if (course.status !== 'PUBLISHED') throw new Error('Course is not available for enrollment');

  // Check capacity
  if (course.maxStudents && course._count.enrollments >= course.maxStudents) {
    throw new Error('Course is full');
  }

  const devBypass = process.env.DEV_BYPASS_STRIPE === 'true';

  // Check tutor has Stripe (skip in dev bypass mode)
  if (!devBypass && (!course.tutor.stripeAccountId || !course.tutor.stripeOnboarded)) {
    throw new Error('Tutor has not completed Stripe onboarding');
  }

  // Upsert a PENDING enrollment (idempotent — student may retry)
  const existing = await prisma.enrollment.findUnique({
    where: { courseId_studentId: { courseId, studentId } },
  });
  if (existing && existing.status === 'PAID') {
    throw new Error('Already enrolled in this course');
  }

  // Calculate fee breakdown in cents
  const basePriceCents = Math.round(course.price * 100);
  const bd = await calculatePaymentBreakdown(basePriceCents);

  let enrollment = existing;
  if (!enrollment) {
    enrollment = await prisma.enrollment.create({
      data: {
        courseId,
        studentId,
        status: 'PENDING',
        // amount = what student pays; tutorAmount = tutor payout; platformAmount = platform gross
        amount:               bd.studentPaysCents / 100,
        tutorAmount:          bd.tutorPayoutCents / 100,
        platformAmount:       bd.platformFeeCents / 100,
        basePriceAmount:      bd.basePriceCents   / 100,
        studentFeeAmount:     bd.studentFeeCents  / 100,
        adminCommissionAmount:bd.adminCommissionCents / 100,
        tutorDeductionAmount: bd.tutorDeductionCents  / 100,
        studentChargeAmount:  bd.studentPaysCents / 100,
      },
    });
  }

  // ── Dev bypass: skip Stripe, return a local mock-checkout URL ──────────────
  if (devBypass) {
    return {
      url: `${frontendUrl}/dev/mock-checkout?type=enrollment&id=${enrollment.id}&title=${encodeURIComponent(course.title)}&amount=${bd.studentPaysCents / 100}`,
      sessionId: 'dev_bypass',
    };
  }

  const session = await createEnrollmentCheckoutSession({
    courseTitle: course.title,
    courseDescription: course.description,
    breakdown: bd,
    tutorStripeAccountId: course.tutor.stripeAccountId!,
    enrollmentId: enrollment.id,
    courseId: course.id,
    studentId,
    tutorId: course.tutor.id,
    successUrl: `${frontendUrl}/student/enrollment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${frontendUrl}/student/courses`,
  });

  // Persist the session ID so the webhook can look it up
  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { stripeSessionId: session.id },
  });

  return { url: session.url, sessionId: session.id };
};

// ── Webhook: confirm payment ──────────────────────────────────────────────────
export const confirmEnrollmentPayment = async (
  sessionId: string,
  paymentIntentId: string,
  meta?: Record<string, string>  // checkout.session metadata from Stripe webhook
) => {
  const enrollment = await prisma.enrollment.findFirst({
    where: { stripeSessionId: sessionId },
  });
  if (!enrollment) {
    throw new Error(`No enrollment found for session ${sessionId}`);
  }
  if (enrollment.status === 'PAID') return enrollment; // idempotent

  // Parse breakdown from webhook metadata (all values are stored as cents strings)
  const breakdownUpdate = meta ? {
    basePriceAmount:       meta.basePriceCents       ? Number(meta.basePriceCents)       / 100 : undefined,
    studentFeeAmount:      meta.studentFeeCents       ? Number(meta.studentFeeCents)       / 100 : undefined,
    adminCommissionAmount: meta.adminCommissionCents  ? Number(meta.adminCommissionCents)  / 100 : undefined,
    tutorDeductionAmount:  meta.tutorDeductionCents   ? Number(meta.tutorDeductionCents)   / 100 : undefined,
    studentChargeAmount:   meta.studentPaysCents      ? Number(meta.studentPaysCents)      / 100 : undefined,
    amount:                meta.studentPaysCents      ? Number(meta.studentPaysCents)      / 100 : undefined,
    tutorAmount:           meta.tutorPayoutCents      ? Number(meta.tutorPayoutCents)      / 100 : undefined,
    platformAmount:        meta.platformFeeCents      ? Number(meta.platformFeeCents)      / 100 : undefined,
  } : {};

  return prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      status: 'PAID',
      stripePaymentIntentId: paymentIntentId,
      paidAt: new Date(),
      ...breakdownUpdate,
    },
  });
};

// ── Student: list enrolled courses ───────────────────────────────────────────
export const getStudentEnrollments = async (studentId: string) => {
  return prisma.enrollment.findMany({
    where: { studentId, status: 'PAID' },
    orderBy: { paidAt: 'desc' },
    include: {
      course: {
        include: {
          tutor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              jtutorsEmail: true,
            },
          },
        },
      },
    },
  });
};

// ── Tutor: list enrollments for a course ─────────────────────────────────────
export const getCourseEnrollments = async (courseId: string, tutorId: string) => {
  // verify ownership
  const course = await prisma.course.findFirst({ where: { id: courseId, tutorId } });
  if (!course) return null;

  return prisma.enrollment.findMany({
    where: { courseId, status: 'PAID' },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
    },
  });
};
