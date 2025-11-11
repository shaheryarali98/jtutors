import { PrismaClient, AdminSettings } from '@prisma/client';

const prisma = new PrismaClient();

export const getAdminSettings = async (): Promise<AdminSettings> => {
  const existing = await prisma.adminSettings.findFirst();

  if (existing) {
    return existing;
  }

  return prisma.adminSettings.create({
    data: {
      sendSignupConfirmation: true,
      sendProfileCompletionEmail: true,
      adminCommissionPercentage: 10.0,
      adminCommissionFixed: 0.0,
      withdrawalAutoApproveDays: 2, // Default 2 days for sandbox
    }
  });
};

export const updateAdminSettings = async (data: Partial<Pick<AdminSettings, 'sendSignupConfirmation' | 'sendProfileCompletionEmail' | 'adminCommissionPercentage' | 'adminCommissionFixed' | 'withdrawalAutoApproveDays'>>): Promise<AdminSettings> => {
  const current = await getAdminSettings();

  return prisma.adminSettings.update({
    where: { id: current.id },
    data
  });
};

