import { Request, Response } from 'express';
import {
  createWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  getWithdrawalsByUser,
  getAllWithdrawals,
  processWithdrawal,
  completeWithdrawal,
  checkAutoApproveWithdrawals,
} from '../services/withdrawal.service';

export const createWithdrawalController = async (req: Request, res: Response) => {
  try {
    const { amount, currency, notes } = req.body;
    const userId = (req as any).userId;
    const userRole = (req as any).role;

    if (userRole !== 'ADMIN' && userRole !== 'TUTOR') {
      return res.status(403).json({ error: 'Only admins and tutors can create withdrawals' });
    }

    const withdrawal = await createWithdrawal({
      userId,
      userType: userRole,
      amount,
      currency,
      notes,
    });

    res.json({ withdrawal, message: 'Withdrawal request created successfully' });
  } catch (error: any) {
    console.error('Create withdrawal error:', error);
    res.status(500).json({ error: error.message || 'Error creating withdrawal' });
  }
};

export const getMyWithdrawalsController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const withdrawals = await getWithdrawalsByUser(userId);

    res.json({ withdrawals });
  } catch (error: any) {
    console.error('Get my withdrawals error:', error);
    res.status(500).json({ error: error.message || 'Error fetching withdrawals' });
  }
};

export const getAllWithdrawalsController = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const withdrawals = await getAllWithdrawals(status as string | undefined);

    res.json({ withdrawals });
  } catch (error: any) {
    console.error('Get all withdrawals error:', error);
    res.status(500).json({ error: error.message || 'Error fetching withdrawals' });
  }
};

export const approveWithdrawalController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = (req as any).userId;

    const withdrawal = await approveWithdrawal(id, adminId, notes);

    res.json({ withdrawal, message: 'Withdrawal approved successfully' });
  } catch (error: any) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({ error: error.message || 'Error approving withdrawal' });
  }
};

export const rejectWithdrawalController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).userId;

    const withdrawal = await rejectWithdrawal(id, adminId, reason);

    res.json({ withdrawal, message: 'Withdrawal rejected' });
  } catch (error: any) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({ error: error.message || 'Error rejecting withdrawal' });
  }
};

export const processWithdrawalController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const withdrawal = await processWithdrawal(id);

    res.json({ withdrawal, message: 'Withdrawal processed successfully' });
  } catch (error: any) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({ error: error.message || 'Error processing withdrawal' });
  }
};

export const checkAutoApproveController = async (req: Request, res: Response) => {
  try {
    await checkAutoApproveWithdrawals();
    res.json({ message: 'Auto-approval check completed' });
  } catch (error: any) {
    console.error('Check auto-approve error:', error);
    res.status(500).json({ error: error.message || 'Error checking auto-approvals' });
  }
};

