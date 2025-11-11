import express from 'express';
import * as subjectController from '../controllers/subject.controller';

const router = express.Router();

// Public routes - no authentication required
router.get('/', subjectController.getAllSubjects);
router.post('/', subjectController.createSubject); // In production, restrict this to admins

export default router;

