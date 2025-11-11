import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  createWithdrawalController,
  getMyWithdrawalsController,
  getAllWithdrawalsController,
  approveWithdrawalController,
  rejectWithdrawalController,
  processWithdrawalController,
  checkAutoApproveController,
} from '../controllers/withdrawal.controller';

const router = express.Router();

router.use(authenticate);

router.post('/', createWithdrawalController);
router.get('/my', getMyWithdrawalsController);
router.get('/all', requireRole('ADMIN'), getAllWithdrawalsController);
router.post('/:id/approve', requireRole('ADMIN'), approveWithdrawalController);
router.post('/:id/reject', requireRole('ADMIN'), rejectWithdrawalController);
router.post('/:id/process', requireRole('ADMIN'), processWithdrawalController);
router.post('/check-auto-approve', requireRole('ADMIN'), checkAutoApproveController);

export default router;

