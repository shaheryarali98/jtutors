import express from 'express';
import { body } from 'express-validator';
import { submitContactForm } from '../controllers/contact.controller';

const router = express.Router();

router.post(
  '/submit',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  submitContactForm
);

export default router;
