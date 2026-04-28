import express from 'express';
import * as tutorRequestController from '../controllers/tutorRequest.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Browse open requests (Tutors)
router.get('/open', tutorRequestController.getOpenRequests);

// Student-only routes
router.post('/', requireRole('STUDENT'), tutorRequestController.createRequest);
router.get('/my', requireRole('STUDENT'), tutorRequestController.getMyRequests);
router.put('/:id', requireRole('STUDENT'), tutorRequestController.updateRequest);
router.delete('/:id', requireRole('STUDENT'), tutorRequestController.deleteRequest);

export default router;
