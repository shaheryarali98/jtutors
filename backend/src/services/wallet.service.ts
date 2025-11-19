import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACTIVE_WITHDRAWAL_STATUSES = ['PENDING', 'APPROVED', 'PROCESSING'] as const;

export interface WalletSummary {
  role: 'TUTOR' | 'STUDENT';
  currency: string;
  availableBalance: number;
  pendingPayouts: number;
  lifetimeEarnings: number;
  totalWithdrawn: number;
  totalRefunds?: number;
}

const safeNumber = (value: number | null | undefined) => Number(value ?? 0);

export const getWalletSummary = async (userId: string, role: 'TUTOR' | 'STUDENT'): Promise<WalletSummary> => {
  if (role === 'TUTOR') {
    const tutor = await prisma.tutor.findUnique({ where: { userId } });
    if (!tutor) {
      throw new Error('Tutor profile not found');
    }

    const [paidEarnings, pendingEarnings, withdrawals] = await Promise.all([
      prisma.payment.aggregate({
        where: { tutorId: tutor.id, paymentStatus: 'PAID' },
        _sum: { tutorAmount: true },
      }),
      prisma.payment.aggregate({
        where: { tutorId: tutor.id, paymentStatus: 'PENDING' },
        _sum: { tutorAmount: true },
      }),
      prisma.withdrawal.groupBy({
        by: ['status'],
        where: { userId },
        _sum: { amount: true },
      }),
    ]);

    const lifetimeEarnings = safeNumber(paidEarnings._sum.tutorAmount);
    const pendingRequested = withdrawals
      .filter((entry) => ACTIVE_WITHDRAWAL_STATUSES.includes(entry.status as any))
      .reduce((total, entry) => total + safeNumber(entry._sum.amount), 0);
    const completedWithdrawals = withdrawals
      .filter((entry) => entry.status === 'COMPLETED')
      .reduce((total, entry) => total + safeNumber(entry._sum.amount), 0);

    const availableBalance = Math.max(0, lifetimeEarnings - completedWithdrawals - pendingRequested);

    return {
      role,
      currency: 'USD',
      availableBalance: Math.round(availableBalance * 100) / 100,
      pendingPayouts: Math.round(pendingRequested * 100) / 100,
      lifetimeEarnings: Math.round(lifetimeEarnings * 100) / 100,
      totalWithdrawn: Math.round(completedWithdrawals * 100) / 100,
    };
  }

  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) {
    throw new Error('Student profile not found');
  }

  const [refundedPayments, withdrawals] = await Promise.all([
    prisma.payment.aggregate({
      where: { studentId: student.id, paymentStatus: 'REFUNDED' },
      _sum: { amount: true },
    }),
    prisma.withdrawal.groupBy({
      by: ['status'],
      where: { userId },
      _sum: { amount: true },
    }),
  ]);

  const totalRefunds = safeNumber(refundedPayments._sum.amount);
  const pendingRequested = withdrawals
    .filter((entry) => ACTIVE_WITHDRAWAL_STATUSES.includes(entry.status as any))
    .reduce((total, entry) => total + safeNumber(entry._sum.amount), 0);
  const completedWithdrawals = withdrawals
    .filter((entry) => entry.status === 'COMPLETED')
    .reduce((total, entry) => total + safeNumber(entry._sum.amount), 0);

  const availableBalance = Math.max(0, totalRefunds - completedWithdrawals - pendingRequested);

  return {
    role,
    currency: 'USD',
    availableBalance: Math.round(availableBalance * 100) / 100,
    pendingPayouts: Math.round(pendingRequested * 100) / 100,
    lifetimeEarnings: Math.round(totalRefunds * 100) / 100,
    totalWithdrawn: Math.round(completedWithdrawals * 100) / 100,
    totalRefunds: Math.round(totalRefunds * 100) / 100,
  };
};


