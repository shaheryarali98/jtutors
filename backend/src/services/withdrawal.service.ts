import { PrismaClient } from '@prisma/client';
import { createPayout } from './stripe.service';
import { getAdminSettings } from './settings.service';
import { sendTemplatedEmail } from './emailTemplate.service';

const prisma = new PrismaClient();

export interface CreateWithdrawalData {
  userId: string;
  userType: 'ADMIN' | 'TUTOR';
  amount: number;
  currency?: string;
  notes?: string;
}

// Create withdrawal request
export const createWithdrawal = async (data: CreateWithdrawalData) => {
  const { userId, userType, amount, currency = 'USD', notes } = data;

  const settings = await getAdminSettings();
  const autoApproveDays = settings.withdrawalAutoApproveDays;

  const withdrawal = await prisma.withdrawal.create({
    data: {
      userId,
      userType,
      amount,
      currency,
      notes,
      status: 'PENDING',
      autoApproveAfterDays: autoApproveDays || null,
      requestedAt: new Date(),
    },
    include: {
      user: true,
    },
  });

  // If auto-approve is enabled, schedule approval check
  if (autoApproveDays !== null && autoApproveDays !== undefined) {
    // In production, you'd use a job queue (e.g., Bull, Agenda) to schedule this
    // For now, we'll handle it on approval check
  }

  return withdrawal;
};

// Approve withdrawal
export const approveWithdrawal = async (
  withdrawalId: string,
  approvedBy: string,
  notes?: string
) => {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { user: true },
  });

  if (!withdrawal) {
    throw new Error('Withdrawal not found');
  }

  if (withdrawal.status !== 'PENDING') {
    throw new Error(`Withdrawal is already ${withdrawal.status}`);
  }

  // Update withdrawal status
  const updated = await prisma.withdrawal.update({
    where: { id: withdrawalId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy,
      ...(notes && { notes: withdrawal.notes ? `${withdrawal.notes}\n${notes}` : notes }),
    },
    include: { user: true },
  });

  // Process withdrawal (create Stripe payout)
  try {
    await processWithdrawal(withdrawalId);
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    // Don't throw - approval is separate from processing
  }

  // Send approval email
  try {
    await sendTemplatedEmail('WITHDRAWAL_APPROVED', withdrawal.user.email, {
      userName: withdrawal.user.email,
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      withdrawalId: withdrawal.id,
    });
  } catch (error) {
    console.error('Error sending withdrawal approval email:', error);
  }

  return updated;
};

// Process withdrawal (create Stripe payout)
export const processWithdrawal = async (withdrawalId: string) => {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { user: true },
  });

  if (!withdrawal) {
    throw new Error('Withdrawal not found');
  }

  if (withdrawal.status !== 'APPROVED') {
    throw new Error('Withdrawal must be approved before processing');
  }

  // Get Stripe account ID based on user type
  let stripeAccountId: string | null = null;

  if (withdrawal.userType === 'TUTOR') {
    const tutor = await prisma.tutor.findUnique({
      where: { userId: withdrawal.userId },
    });
    stripeAccountId = tutor?.stripeAccountId || null;
  } else {
    // For admin, you'd need to configure a Stripe account
    // For now, we'll use a placeholder
    stripeAccountId = process.env.ADMIN_STRIPE_ACCOUNT_ID || null;
  }

  if (!stripeAccountId) {
    throw new Error('Stripe account not configured for user');
  }

  // Create Stripe payout
  let payout = null;
  try {
    payout = await createPayout(withdrawal.amount, stripeAccountId, {
      withdrawalId: withdrawal.id,
      userId: withdrawal.userId,
      userType: withdrawal.userType,
    });
  } catch (error) {
    console.error('Error creating Stripe payout:', error);
    throw error;
  }

  // Update withdrawal with payout info
  const updated = await prisma.withdrawal.update({
    where: { id: withdrawalId },
    data: {
      status: 'PROCESSING',
      processedAt: new Date(),
      stripePayoutId: payout?.id || null,
    },
    include: { user: true },
  });

  return updated;
};

// Complete withdrawal (called after Stripe webhook confirms payout)
export const completeWithdrawal = async (withdrawalId: string, stripePayoutId?: string) => {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
  });

  if (!withdrawal) {
    throw new Error('Withdrawal not found');
  }

  const updated = await prisma.withdrawal.update({
    where: { id: withdrawalId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      ...(stripePayoutId && { stripePayoutId }),
    },
    include: { user: true },
  });

  return updated;
};

// Reject withdrawal
export const rejectWithdrawal = async (
  withdrawalId: string,
  rejectedBy: string,
  reason?: string
) => {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { user: true },
  });

  if (!withdrawal) {
    throw new Error('Withdrawal not found');
  }

  if (withdrawal.status !== 'PENDING') {
    throw new Error(`Withdrawal cannot be rejected. Current status: ${withdrawal.status}`);
  }

  const updated = await prisma.withdrawal.update({
    where: { id: withdrawalId },
    data: {
      status: 'REJECTED',
      approvedBy: rejectedBy,
      notes: reason
        ? withdrawal.notes
          ? `${withdrawal.notes}\nRejection reason: ${reason}`
          : `Rejection reason: ${reason}`
        : withdrawal.notes,
    },
    include: { user: true },
  });

  // Send rejection email
  try {
    await sendTemplatedEmail('WITHDRAWAL_REJECTED', withdrawal.user.email, {
      userName: withdrawal.user.email,
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      withdrawalId: withdrawal.id,
      reason: reason || 'No reason provided',
    });
  } catch (error) {
    console.error('Error sending withdrawal rejection email:', error);
  }

  return updated;
};

// Check and auto-approve withdrawals based on settings
export const checkAutoApproveWithdrawals = async () => {
  const settings = await getAdminSettings();
  const autoApproveDays = settings.withdrawalAutoApproveDays;

  if (autoApproveDays === null || autoApproveDays === undefined) {
    return; // Auto-approval disabled
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - autoApproveDays);

  const pendingWithdrawals = await prisma.withdrawal.findMany({
    where: {
      status: 'PENDING',
      requestedAt: {
        lte: cutoffDate,
      },
      autoApproveAfterDays: autoApproveDays,
    },
  });

  for (const withdrawal of pendingWithdrawals) {
    try {
      await approveWithdrawal(withdrawal.id, 'SYSTEM', 'Auto-approved after waiting period');
    } catch (error) {
      console.error(`Error auto-approving withdrawal ${withdrawal.id}:`, error);
    }
  }
};

// Get withdrawals by user
export const getWithdrawalsByUser = async (userId: string) => {
  return await prisma.withdrawal.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

// Get all withdrawals (admin)
export const getAllWithdrawals = async (status?: string) => {
  return await prisma.withdrawal.findMany({
    where: status ? { status } : undefined,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

