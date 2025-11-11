import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { getAnalytics, listUsers, getSettings, updateSettingsController, updateUser, deleteUser } from '../controllers/admin.controller';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/analytics', getAnalytics);
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/settings', getSettings);
router.patch('/settings', updateSettingsController);

export default router;

