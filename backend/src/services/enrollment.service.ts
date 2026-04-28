import { PrismaClient } from '@prisma/client';
import { createEnrollmentCheckoutSession } from './stripe.service';

const prisma = new PrismaClient();

const PLATFORM_FEE_PERCENT = 0.10; // 10%

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

  const platformAmount = course.price * PLATFORM_FEE_PERCENT;
  const tutorAmount = course.price - platformAmount;

  let enrollment = existing;
  if (!enrollment) {
    enrollment = await prisma.enrollment.create({
      data: {
        courseId,
        studentId,
        status: 'PENDING',
        amount: course.price,
        tutorAmount,
        platformAmount,
      },
    });
  }

  // ── Dev bypass: skip Stripe, return a local mock-checkout URL ──────────────
  if (devBypass) {
    return {
      url: `${frontendUrl}/dev/mock-checkout?type=enrollment&id=${enrollment.id}&title=${encodeURIComponent(course.title)}&amount=${course.price}`,
      sessionId: 'dev_bypass',
    };
  }

  const session = await createEnrollmentCheckoutSession({
    courseTitle: course.title,
    courseDescription: course.description,
    priceInCents: Math.round(course.price * 100),
    tutorStripeAccountId: course.tutor.stripeAccountId,
    enrollmentId: enrollment.id,
    courseId: course.id,
    studentId,
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
  paymentIntentId: string
) => {
  const enrollment = await prisma.enrollment.findFirst({
    where: { stripeSessionId: sessionId },
  });
  if (!enrollment) {
    throw new Error(`No enrollment found for session ${sessionId}`);
  }
  if (enrollment.status === 'PAID') return enrollment; // idempotent

  return prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      status: 'PAID',
      stripePaymentIntentId: paymentIntentId,
      paidAt: new Date(),
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
