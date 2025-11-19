import { PrismaClient, AdminSettings } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_WITHDRAW_METHODS = ['Stripe Connect', 'Bank Transfer'];
const DEFAULT_STUDENT_IMAGE =
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80';
const DEFAULT_TUTOR_IMAGE =
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80';

const defaultSettingsPayload: Omit<AdminSettings, 'id' | 'createdAt' | 'updatedAt'> = {
  sendSignupConfirmation: true,
  sendProfileCompletionEmail: true,
  autoApproveUsers: true,
  adminCommissionPercentage: 10.0,
  adminCommissionFixed: 0.0,
  withdrawalAutoApproveDays: 2,
  withdrawMethods: JSON.stringify(DEFAULT_WITHDRAW_METHODS),
  withdrawFixedCharge: 0,
  withdrawPercentageCharge: 0,
  minimumWithdrawAmount: 20,
  minimumBalanceForWithdraw: 20,
  withdrawThreshold: null,
  genderFieldEnabled: true,
  gradeFieldEnabled: true,
  stateFieldEnabled: true,
  emailLogo: null,
  emailSenderName: 'J Tutors',
  emailSenderEmail: 'info@jtutors.com',
  emailFooterCopyright: '© J Tutors. All rights reserved.',
  emailSenderSignature: 'Warmly,\nThe J Tutors Team',
  emailFooterColor: '#F5F5F5',
  defaultStudentImage: DEFAULT_STUDENT_IMAGE,
  defaultTutorImage: DEFAULT_TUTOR_IMAGE,
};

const formatSettings = (settings: AdminSettings) => ({
  ...settings,
  withdrawMethods: settings.withdrawMethods ? JSON.parse(settings.withdrawMethods) : [],
});

export type AdminSettingsDto = ReturnType<typeof formatSettings>;

export const getAdminSettings = async (): Promise<AdminSettings> => {
  const existing = await prisma.adminSettings.findFirst();

  if (existing) {
    return existing;
  }

  return prisma.adminSettings.create({
    data: defaultSettingsPayload,
  });
};

export const getFormattedAdminSettings = async (): Promise<AdminSettingsDto> => {
  const settings = await getAdminSettings();
  return formatSettings(settings);
};

type UpdatableAdminSettings = Partial<
  Pick<
    AdminSettings,
    | 'sendSignupConfirmation'
    | 'sendProfileCompletionEmail'
    | 'autoApproveUsers'
    | 'adminCommissionPercentage'
    | 'adminCommissionFixed'
    | 'withdrawalAutoApproveDays'
    | 'withdrawMethods'
    | 'withdrawFixedCharge'
    | 'withdrawPercentageCharge'
    | 'minimumWithdrawAmount'
    | 'minimumBalanceForWithdraw'
    | 'withdrawThreshold'
    | 'genderFieldEnabled'
    | 'gradeFieldEnabled'
    | 'stateFieldEnabled'
    | 'emailLogo'
    | 'emailSenderName'
    | 'emailSenderEmail'
    | 'emailFooterCopyright'
    | 'emailSenderSignature'
    | 'emailFooterColor'
    | 'defaultStudentImage'
    | 'defaultTutorImage'
  >
>;

export const updateAdminSettings = async (data: UpdatableAdminSettings): Promise<AdminSettingsDto> => {
  const current = await getAdminSettings();

  const payload = {
    ...data,
    ...(data.withdrawMethods && {
      withdrawMethods: Array.isArray(data.withdrawMethods)
        ? JSON.stringify(data.withdrawMethods)
        : data.withdrawMethods,
    }),
  };

  const updated = await prisma.adminSettings.update({
    where: { id: current.id },
    data: payload,
  });

  return formatSettings(updated);
};


