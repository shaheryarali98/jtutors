import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as subjectController from '../controllers/subject.controller';

const router = express.Router();

router.get('/', subjectController.getAllSubjects);

router.use(authenticate);
router.use(requireRole('ADMIN'));
router.post('/', subjectController.createSubject);
router.patch('/:id', subjectController.updateSubject);
router.delete('/:id', subjectController.deleteSubject);

export default router;

