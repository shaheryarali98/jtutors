import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

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

router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Valid email is required')
  ],
  authController.forgotPassword
);

router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  authController.resetPassword
);

router.get('/me', authController.getCurrentUser);

router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  authController.changePassword
);

export default router;

