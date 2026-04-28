import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  createEnrollmentCheckout,
  getStudentEnrollments,
  getCourseEnrollments,
} from '../services/enrollment.service';

const prisma = new PrismaClient();

// ── Student: initiate checkout ────────────────────────────────────────────────
export const startCheckout = async (req: Request, res: Response) => {
  const currentUser = req.user;
  if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

  const student = await prisma.student.findUnique({ where: { userId: currentUser.userId } });
  if (!student) return res.status(404).json({ error: 'Student profile not found' });

  const { courseId } = req.body;
  if (!courseId) return res.status(400).json({ error: 'courseId is required' });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const result = await createEnrollmentCheckout(courseId, student.id, frontendUrl);
    res.json(result);
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404
      : err.message.includes('full') || err.message.includes('not available') ? 409
      : 400;
    res.status(status).json({ error: err.message });
  }
};

// ── Student: my enrolled courses ─────────────────────────────────────────────
export const myEnrollments = async (req: Request, res: Response) => {
  const currentUser = req.user;
  if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

  const student = await prisma.student.findUnique({ where: { userId: currentUser.userId } });
  if (!student) return res.status(404).json({ error: 'Student profile not found' });

  const enrollments = await getStudentEnrollments(student.id);
  res.json({ enrollments });
};

// ── Tutor: enrollments for one of their courses ───────────────────────────────
export const courseEnrollments = async (req: Request, res: Response) => {
  const currentUser = req.user;
  if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

  const tutor = await prisma.tutor.findUnique({ where: { userId: currentUser.userId } });
  if (!tutor) return res.status(404).json({ error: 'Tutor profile not found' });

  const result = await getCourseEnrollments(req.params.courseId, tutor.id);
  if (result === null) return res.status(404).json({ error: 'Course not found' });

  res.json({ enrollments: result });
};

// ── Webhook success redirect helper ──────────────────────────────────────────
// GET /api/enrollments/session/:sessionId — lets the success page verify payment
export const verifyEnrollmentSession = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  // Dev bypass: allow looking up by enrollment ID directly (session_id=dev_bypass)
  const enrollmentIdParam = req.query.enrollmentId as string | undefined;

  const include = {
    course: {
      include: {
        tutor: { select: { firstName: true, lastName: true, jtutorsEmail: true } },
      },
    },
  };

  let enrollment = null;

  // First try direct ID lookup (dev bypass scenario)
  if (sessionId === 'dev_bypass' && enrollmentIdParam) {
    enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentIdParam }, include });
  }

  // Fall back to Stripe session ID lookup
  if (!enrollment) {
    enrollment = await prisma.enrollment.findFirst({ where: { stripeSessionId: sessionId }, include });
  }

  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  res.json({ enrollment });
};
