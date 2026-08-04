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
  updateTutorVerificationStatus,
  setTutorJTutorsEmail,
  listCoursesAdmin,
  getAdminEarnings,
  updateTutorProfileAdmin,
  setTutorSubjectsAdmin,
  saveTutorExperienceAdmin,
  deleteTutorExperienceAdmin,
  saveTutorEducationAdmin,
  deleteTutorEducationAdmin,
  saveTutorAvailabilityAdmin,
  deleteTutorAvailabilityAdmin,
  updateStudentProfileAdmin,
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
router.patch('/tutors/:tutorId/verification', updateTutorVerificationStatus);
router.patch('/tutors/:tutorId/jtutors-email', setTutorJTutorsEmail);
router.get('/courses', listCoursesAdmin);
router.get('/earnings', getAdminEarnings);

// Full admin edit control over tutor profiles
router.patch('/tutors/:tutorId/profile', updateTutorProfileAdmin);
router.put('/tutors/:tutorId/subjects', setTutorSubjectsAdmin);
router.post('/tutors/:tutorId/experiences', saveTutorExperienceAdmin);
router.patch('/tutors/:tutorId/experiences/:experienceId', saveTutorExperienceAdmin);
router.delete('/tutors/:tutorId/experiences/:experienceId', deleteTutorExperienceAdmin);
router.post('/tutors/:tutorId/educations', saveTutorEducationAdmin);
router.patch('/tutors/:tutorId/educations/:educationId', saveTutorEducationAdmin);
router.delete('/tutors/:tutorId/educations/:educationId', deleteTutorEducationAdmin);
router.post('/tutors/:tutorId/availabilities', saveTutorAvailabilityAdmin);
router.patch('/tutors/:tutorId/availabilities/:availabilityId', saveTutorAvailabilityAdmin);
router.delete('/tutors/:tutorId/availabilities/:availabilityId', deleteTutorAvailabilityAdmin);

// Admin edit control over student profiles
router.patch('/students/:studentId/profile', updateStudentProfileAdmin);

export default router;

