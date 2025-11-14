import express from 'express';
import * as studentController from '../controllers/student.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication as a student
router.use(authenticate);
router.use(requireRole('STUDENT'));

// Student Profile
router.get('/profile', studentController.getProfile);
router.put('/profile', studentController.updateProfile);

// Saved instructors
router.get('/saved-instructors', studentController.getSavedInstructors);
router.post('/saved-instructors', studentController.addSavedInstructor);
router.delete('/saved-instructors/:tutorId', studentController.removeSavedInstructor);

// Tutoring hours
router.get('/hour-log', studentController.getTutoringHourLog);

// Tutors
router.get('/tutors', studentController.searchTutors);
router.get('/tutors/:tutorId', studentController.getTutorDetails);

// Bookings
router.post('/bookings', studentController.createBooking);
router.get('/bookings', studentController.getMyBookings);

export default router;

