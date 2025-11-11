import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  getAllEmailTemplatesController,
  getEmailTemplateController,
  upsertEmailTemplateController,
  initializeDefaultTemplatesController,
} from '../controllers/emailTemplate.controller';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/', getAllEmailTemplatesController);
router.get('/:name', getEmailTemplateController);
router.post('/', upsertEmailTemplateController);
router.put('/:name', upsertEmailTemplateController);
router.post('/initialize', initializeDefaultTemplatesController);

export default router;

