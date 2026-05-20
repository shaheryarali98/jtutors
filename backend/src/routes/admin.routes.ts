import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  getAnalytics,
  listUsers,
  getSettings,
  updateSettingsController,
  updateUser,
  updateUserProfileImage,
  deleteUser,
  suspendUser,
  getLoginHistory,
  getBookingsAdmin,
  updateBookingStatusAdmin,
  createGoogleClassroomForBookingAdmin,
  getPaymentsAdmin,
  getExtraTimeChargesAdmin,
  confirmPaymentAdmin,
  refundPaymentAdmin,
  getGoogleClassroomStatusAdmin,
  getUserDetail,
  updateBackgroundCheckStatus,
  setTutorJTutorsEmail,
  listCoursesAdmin,
  getAdminEarnings,
} from '../controllers/admin.controller';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/analytics', getAnalytics);
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);
router.patch('/users/:id/profile-image', updateUserProfileImage);
router.patch('/users/:id/suspend', suspendUser);
router.get('/users/:id/login-history', getLoginHistory);
router.delete('/users/:id', deleteUser);
router.get('/settings', getSettings);
router.patch('/settings', updateSettingsController);

router.get('/bookings', getBookingsAdmin);
router.patch('/bookings/:id', updateBookingStatusAdmin);
router.post('/bookings/:id/google-classroom', createGoogleClassroomForBookingAdmin);

router.get('/payments', getPaymentsAdmin);
router.get('/extra-time-charges', getExtraTimeChargesAdmin);
router.post('/payments/:id/confirm', confirmPaymentAdmin);
router.post('/payments/:id/refund', refundPaymentAdmin);

router.get('/integrations/google-classroom/status', getGoogleClassroomStatusAdmin);
router.get('/users/:id/detail', getUserDetail);
router.patch('/users/:userId/background-check', updateBackgroundCheckStatus);
router.patch('/tutors/:tutorId/jtutors-email', setTutorJTutorsEmail);
router.get('/courses', listCoursesAdmin);
router.get('/earnings', getAdminEarnings);

export default router;

