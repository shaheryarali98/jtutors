import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  startCheckout,
  myEnrollments,
  courseEnrollments,
  verifyEnrollmentSession,
} from '../controllers/enrollment.controller';

const router = express.Router();

router.use(authenticate);

// Student
router.post('/checkout', requireRole('STUDENT'), startCheckout);
router.get('/my', requireRole('STUDENT'), myEnrollments);
router.get('/session/:sessionId', verifyEnrollmentSession); // success page verification

// Tutor
router.get('/course/:courseId', requireRole('TUTOR'), courseEnrollments);

export default router;
