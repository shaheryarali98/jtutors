import { Request, Response } from 'express';
import { getFormattedAdminSettings } from '../services/settings.service';

export const getPublicSettings = async (_req: Request, res: Response) => {
  try {
    const settings = await getFormattedAdminSettings();
    res.json({
      settings: {
        sendSignupConfirmation: settings.sendSignupConfirmation,
        sendProfileCompletionEmail: settings.sendProfileCompletionEmail,
        autoApproveUsers: settings.autoApproveUsers,
        adminCommissionPercentage: settings.adminCommissionPercentage,
        adminCommissionFixed: settings.adminCommissionFixed,
        withdrawalAutoApproveDays: settings.withdrawalAutoApproveDays,
        withdrawMethods: settings.withdrawMethods,
        withdrawFixedCharge: settings.withdrawFixedCharge,
        withdrawPercentageCharge: settings.withdrawPercentageCharge,
        minimumWithdrawAmount: settings.minimumWithdrawAmount,
        minimumBalanceForWithdraw: settings.minimumBalanceForWithdraw,
        withdrawThreshold: settings.withdrawThreshold,
        genderFieldEnabled: settings.genderFieldEnabled,
        gradeFieldEnabled: settings.gradeFieldEnabled,
        stateFieldEnabled: settings.stateFieldEnabled,
        emailLogo: settings.emailLogo,
        emailSenderName: settings.emailSenderName,
        emailSenderEmail: settings.emailSenderEmail,
        emailFooterCopyright: settings.emailFooterCopyright,
        emailSenderSignature: settings.emailSenderSignature,
        emailFooterColor: settings.emailFooterColor,
        defaultStudentImage: settings.defaultStudentImage,
        defaultTutorImage: settings.defaultTutorImage,
        hourlyFee: {
          min: 20,
          max: 500,
        },
      },
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ error: 'Unable to load platform settings' });
  }
};


