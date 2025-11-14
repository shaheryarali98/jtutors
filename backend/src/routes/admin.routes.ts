import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  getAnalytics,
  listUsers,
  getSettings,
  updateSettingsController,
  updateUser,
  deleteUser,
  getBookingsAdmin,
  updateBookingStatusAdmin,
  createGoogleClassroomForBookingAdmin,
  getPaymentsAdmin,
  confirmPaymentAdmin,
  refundPaymentAdmin,
  getGoogleClassroomStatusAdmin,
} from '../controllers/admin.controller';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/analytics', getAnalytics);
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/settings', getSettings);
router.patch('/settings', updateSettingsController);

router.get('/bookings', getBookingsAdmin);
router.patch('/bookings/:id', updateBookingStatusAdmin);
router.post('/bookings/:id/google-classroom', createGoogleClassroomForBookingAdmin);

router.get('/payments', getPaymentsAdmin);
router.post('/payments/:id/confirm', confirmPaymentAdmin);
router.post('/payments/:id/refund', refundPaymentAdmin);

router.get('/integrations/google-classroom/status', getGoogleClassroomStatusAdmin);

export default router;

