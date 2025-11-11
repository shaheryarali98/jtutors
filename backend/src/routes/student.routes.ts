import express from 'express';
import * as studentController from '../controllers/student.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication as a student
router.use(authenticate);
router.use(requireRole('STUDENT'));

// Student Profile
router.put('/profile', studentController.updateProfile);
router.get('/tutors', studentController.searchTutors);
router.get('/tutors/:tutorId', studentController.getTutorDetails);

// Bookings
router.post('/bookings', studentController.createBooking);
router.get('/bookings', studentController.getMyBookings);

export default router;

