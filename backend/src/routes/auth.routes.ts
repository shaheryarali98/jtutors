import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['STUDENT', 'TUTOR', 'ADMIN']).withMessage('Role must be STUDENT, TUTOR or ADMIN')
  ],
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  authController.login
);

router.get('/me', authController.getCurrentUser);

export default router;

