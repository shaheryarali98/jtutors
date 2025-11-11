import express from 'express';
import { body } from 'express-validator';
import * as tutorController from '../controllers/tutor.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication as a tutor
router.use(authenticate);
router.use(requireRole('TUTOR'));

// Personal Information
router.put('/profile/personal', tutorController.updatePersonalInfo);

// Experience
router.post('/profile/experience', tutorController.addExperience);
router.put('/profile/experience/:id', tutorController.updateExperience);
router.delete('/profile/experience/:id', tutorController.deleteExperience);

// Education
router.post('/profile/education', tutorController.addEducation);
router.put('/profile/education/:id', tutorController.updateEducation);
router.delete('/profile/education/:id', tutorController.deleteEducation);

// Subjects
router.post('/profile/subjects', tutorController.addSubjects);
router.delete('/profile/subjects/:subjectId', tutorController.removeSubject);

// Availability
router.post('/profile/availability', tutorController.addAvailability);
router.put('/profile/availability/:id', tutorController.updateAvailability);
router.delete('/profile/availability/:id', tutorController.deleteAvailability);

// Background Check
router.post('/profile/background-check', tutorController.submitBackgroundCheck);

// Stripe
router.post('/stripe/connect', tutorController.createStripeConnectAccount);
router.get('/stripe/status', tutorController.getStripeStatus);

// Profile Completion
router.get('/profile/completion', tutorController.getProfileCompletion);

export default router;

