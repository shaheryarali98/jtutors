import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  createCourseController,
  updateCourseController,
  deleteCourseController,
  getTutorCoursesController,
  getPublishedCoursesController,
  getCourseByIdController,
} from '../controllers/course.controller';

const router = express.Router();

// Public — browse published courses (authenticated users)
router.get('/', authenticate, getPublishedCoursesController);
router.get('/:id', authenticate, getCourseByIdController);

// Tutor — manage own courses
router.post('/', authenticate, requireRole('TUTOR'), createCourseController);
router.get('/my/list', authenticate, requireRole('TUTOR'), getTutorCoursesController);
router.put('/:id', authenticate, requireRole('TUTOR'), updateCourseController);
router.delete('/:id', authenticate, requireRole('TUTOR'), deleteCourseController);

export default router;
