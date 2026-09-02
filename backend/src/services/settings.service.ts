import { PrismaClient, AdminSettings } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_WITHDRAW_METHODS = ['Stripe Connect', 'Bank Transfer'];
// Friendly and cheerful avatar style default images
// Using happy, approachable avatars (PNG format for better compatibility)
const DEFAULT_STUDENT_IMAGE =
  'https://api.dicebear.com/7.x/micah/png?seed=Student&backgroundColor=4f46e5&size=400';
const DEFAULT_TUTOR_IMAGE =
  'https://api.dicebear.com/7.x/micah/png?seed=Tutor&backgroundColor=f59e0b&size=400';

const defaultSettingsPayload: Omit<AdminSettings, 'id' | 'createdAt' | 'updatedAt'> = {
  sendSignupConfirmation: true,
  sendProfileCompletionEmail: true,
  autoApproveUsers: true,
  adminCommissionPercentage: 0,       // legacy field — tutor-side deduction; service fee now routes to admin instead
  adminCommissionFixed: 0.0,
  studentFeePercentage: 4.5,
  platformCommissionPercent: 9.25,   // admin platform commission %
  withdrawalAutoApproveDays: 2,
  withdrawMethods: JSON.stringify(DEFAULT_WITHDRAW_METHODS),
  withdrawFixedCharge: 0,
  withdrawPercentageCharge: 0,
  minimumWithdrawAmount: 0,
  minimumBalanceForWithdraw: 0,
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
  adminPaymentInfo: null,
};

const formatSettings = (settings: AdminSettings) => ({
  ...settings,
  withdrawMethods: settings.withdrawMethods ? JSON.parse(settings.withdrawMethods) : [],
});

export type AdminSettingsDto = ReturnType<typeof formatSettings>;

/**
 * Client cache version, read and written outside the Prisma model on purpose.
 *
 * It lives in a column that older databases may not have yet. Declaring it on
 * the model made every `adminSettings.findFirst()` select it, so a database
 * missing the column failed the whole query — and since getAdminSettings sits
 * on the payment path, that took checkout and the admin dashboard down with it.
 * Reading it separately means a missing column costs the cache feature only.
 */
export const getClientCacheVersion = async (): Promise<number> => {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ clientCacheVersion: number | bigint }>>(
      'SELECT "clientCacheVersion" FROM "AdminSettings" LIMIT 1'
    );
    const raw = rows?.[0]?.clientCacheVersion;
    const value = typeof raw === 'bigint' ? Number(raw) : raw;
    return Number.isFinite(value) ? Number(value) : 1;
  } catch {
    // Column not present yet — behave as though nothing has been bumped.
    return 1;
  }
};

/**
 * Bump the version, creating the column first if the database lacks it.
 * Postgres supports ADD COLUMN IF NOT EXISTS; SQLite does not, so fall back to
 * a plain ADD COLUMN and treat "already exists" as success.
 */
export const bumpClientCacheVersion = async (): Promise<number> => {
  const addColumn = async () => {
    try {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "AdminSettings" ADD COLUMN IF NOT EXISTS "clientCacheVersion" INTEGER NOT NULL DEFAULT 1'
      );
      return true;
    } catch {
      try {
        await prisma.$executeRawUnsafe(
          'ALTER TABLE "AdminSettings" ADD COLUMN "clientCacheVersion" INTEGER NOT NULL DEFAULT 1'
        );
        return true;
      } catch {
        // Either it already exists or we cannot add it; the update below tells us.
        return false;
      }
    }
  };

  const runUpdate = async () => {
    await prisma.$executeRawUnsafe(
      'UPDATE "AdminSettings" SET "clientCacheVersion" = COALESCE("clientCacheVersion", 1) + 1'
    );
  };

  try {
    await runUpdate();
  } catch {
    await addColumn();
    await runUpdate();
  }

  return getClientCacheVersion();
};

export const getAdminSettings = async (): Promise<AdminSettings> => {
  const existing = await prisma.adminSettings.findFirst();

  if (existing) {
    // Update existing settings with new default avatar URLs if they still have old ones
    const oldTutorUrl = 'https://api.dicebear.com/7.x/avataaars/png?seed=Tutor&backgroundColor=f59e0b&size=400&radius=50';
    const oldStudentUrl = 'https://api.dicebear.com/7.x/avataaars/png?seed=Student&backgroundColor=4f46e5&size=400&radius=50';
    const oldNotionistsTutorUrl = 'https://api.dicebear.com/7.x/notionists/png?seed=Tutor&backgroundColor=f59e0b&size=400';
    const oldNotionistsStudentUrl = 'https://api.dicebear.com/7.x/notionists/png?seed=Student&backgroundColor=4f46e5&size=400';
    
    const needsUpdate = 
      (existing.defaultTutorImage === oldTutorUrl || existing.defaultTutorImage === oldNotionistsTutorUrl) ||
      (existing.defaultStudentImage === oldStudentUrl || existing.defaultStudentImage === oldNotionistsStudentUrl);
    
    if (needsUpdate) {
      return prisma.adminSettings.update({
        where: { id: existing.id },
        data: {
          defaultTutorImage: DEFAULT_TUTOR_IMAGE,
          defaultStudentImage: DEFAULT_STUDENT_IMAGE,
        },
      });
    }
    
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
    | 'studentFeePercentage'
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
    | 'adminPaymentInfo'
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


