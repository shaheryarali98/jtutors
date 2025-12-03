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
import { getFormattedAdminSettings } from '../services/settings.service';
import { getWalletSummary } from '../services/wallet.service';

export const createWithdrawalController = async (req: Request, res: Response) => {
  try {
    const { amount, currency, notes, method } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!['ADMIN', 'TUTOR', 'STUDENT'].includes(userRole)) {
      return res.status(403).json({ error: 'Only admins, tutors, or students can create withdrawals' });
    }

    const numericAmount = Number(amount);
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Withdrawal amount must be greater than zero' });
    }

    const settings = await getFormattedAdminSettings();

    let walletSummary = null;
    if (userRole === 'TUTOR' || userRole === 'STUDENT') {
      walletSummary = await getWalletSummary(userId, userRole);
      // Only check that amount doesn't exceed available balance
      if (numericAmount > walletSummary.availableBalance) {
        return res.status(400).json({ error: 'Withdrawal amount exceeds available balance' });
      }
    }

    const selectedMethod =
      typeof method === 'string' && method.trim().length > 0
        ? method
        : settings.withdrawMethods[0] || 'Manual';

    if (selectedMethod && !settings.withdrawMethods.includes(selectedMethod)) {
      return res.status(400).json({ error: 'Selected withdrawal method is not available' });
    }

    const withdrawal = await createWithdrawal({
      userId,
      userType: userRole,
      amount: numericAmount,
      currency,
      method: selectedMethod,
      notes,
    });

    res.json({
      withdrawal,
      walletSummary: walletSummary || null,
      message: 'Withdrawal request created successfully',
    });
  } catch (error: any) {
    console.error('Create withdrawal error:', error);
    res.status(500).json({ error: error.message || 'Error creating withdrawal' });
  }
};

export const getMyWithdrawalsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!userId || !role) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const withdrawals = await getWithdrawalsByUser(userId);

    let walletSummary = null;
    if (role === 'TUTOR' || role === 'STUDENT') {
      walletSummary = await getWalletSummary(userId, role);
    }

    res.json({ withdrawals, walletSummary });
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
    const adminId = req.user?.userId;

    if (!adminId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

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
    const adminId = req.user?.userId;

    if (!adminId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

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

