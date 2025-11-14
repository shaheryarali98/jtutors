import { PrismaClient } from '@prisma/client';
import { sendEmail } from './email.service';

const prisma = new PrismaClient();

// Template variable types
export type TemplateVariables = {
  [key: string]: string | number | undefined;
};

// Replace template variables in string
const replaceVariables = (template: string, variables: TemplateVariables): string => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value || ''));
  }
  return result;
};

// Send email using template
export const sendTemplatedEmail = async (
  templateName: string,
  to: string,
  variables: TemplateVariables
): Promise<void> => {
  const template = await prisma.emailTemplate.findUnique({
    where: { name: templateName },
  });

  if (!template || !template.isActive) {
    console.warn(`Email template ${templateName} not found or inactive. Using fallback.`);
    // Fallback to basic email
    await sendEmail({
      to,
      subject: `Notification from JTutors`,
      html: `<p>Hello,</p><p>This is a notification from JTutors.</p>`,
    });
    return;
  }

  const subject = replaceVariables(template.subject, variables);
  const htmlBody = replaceVariables(template.htmlBody, variables);
  const textBody = template.textBody
    ? replaceVariables(template.textBody, variables)
    : undefined;

  await sendEmail({
    to,
    subject,
    html: htmlBody,
    text: textBody,
  });
};

// Get all email templates
export const getAllEmailTemplates = async () => {
  return await prisma.emailTemplate.findMany({
    orderBy: { name: 'asc' },
  });
};

// Get email template by name
export const getEmailTemplate = async (name: string) => {
  return await prisma.emailTemplate.findUnique({
    where: { name },
  });
};

// Create or update email template
export const upsertEmailTemplate = async (data: {
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  isActive?: boolean;
  variables?: string; // JSON string
}) => {
  return await prisma.emailTemplate.upsert({
    where: { name: data.name },
    update: {
      subject: data.subject,
      htmlBody: data.htmlBody,
      textBody: data.textBody || '',
      isActive: data.isActive !== undefined ? data.isActive : true,
      variables: data.variables,
    },
    create: {
      name: data.name,
      subject: data.subject,
      htmlBody: data.htmlBody,
      textBody: data.textBody || '',
      isActive: data.isActive !== undefined ? data.isActive : true,
      variables: data.variables,
    },
  });
};

// Initialize default email templates
export const initializeDefaultTemplates = async () => {
  const defaultTemplates = [
    {
      name: 'SIGNUP_SUCCESS',
      subject: 'Welcome to JTutors!',
      htmlBody: `
        <h2>Welcome to JTutors</h2>
        <p>Hi {{userName}},</p>
        <p>Thanks for signing up for JTutors. Your account has been successfully created.</p>
        <p>You can log in any time to continue building your learning journey.</p>
        <p>Best regards,<br/>The JTutors Team</p>
      `,
      textBody: `Welcome to JTutors!\n\nHi {{userName}},\n\nThanks for signing up. Your account has been created.\n\nBest,\nJTutors Team`,
      variables: JSON.stringify(['userName', 'email']),
    },
    {
      name: 'PROFILE_COMPLETE',
      subject: 'Profile Complete - JTutors',
      htmlBody: `
        <h2>Congratulations!</h2>
        <p>Hi {{userName}},</p>
        <p>Your profile is now 100% complete! You're all set to start your journey on JTutors.</p>
        <p>Best regards,<br/>The JTutors Team</p>
      `,
      textBody: `Congratulations!\n\nHi {{userName}},\n\nYour profile is now complete!\n\nBest,\nJTutors Team`,
      variables: JSON.stringify(['userName', 'email']),
    },
    {
      name: 'EMAIL_VERIFICATION',
      subject: 'Verify Your Email - JTutors',
      htmlBody: `
        <h2>Verify Your Email</h2>
        <p>Hi {{userName}},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="{{verificationLink}}">Verify Email</a></p>
        <p>Best regards,<br/>The JTutors Team</p>
      `,
      textBody: `Verify Your Email\n\nHi {{userName}},\n\nPlease verify your email: {{verificationLink}}\n\nBest,\nJTutors Team`,
      variables: JSON.stringify(['userName', 'email', 'verificationLink']),
    },
    {
      name: 'FORGOT_PASSWORD',
      subject: 'Reset Your Password - JTutors',
      htmlBody: `
        <h2>Reset Your Password</h2>
        <p>Hi {{userName}},</p>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <p><a href="{{resetLink}}">Reset Password</a></p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br/>The JTutors Team</p>
      `,
      textBody: `Reset Your Password\n\nHi {{userName}},\n\nReset your password: {{resetLink}}\n\nBest,\nJTutors Team`,
      variables: JSON.stringify(['userName', 'email', 'resetLink']),
    },
    {
      name: 'CLASS_APPROVED',
      subject: 'Class Approved - JTutors',
      htmlBody: `
        <h2>Class Approved</h2>
        <p>Hi {{userName}},</p>
        <p>Your class "{{className}}" has been approved by the admin.</p>
        <p>Payment will be processed shortly.</p>
        <p>Best regards,<br/>The JTutors Team</p>
      `,
      textBody: `Class Approved\n\nHi {{userName}},\n\nYour class has been approved.\n\nBest,\nJTutors Team`,
      variables: JSON.stringify(['userName', 'email', 'className', 'classId']),
    },
    {
      name: 'PAYMENT_RECEIVED',
      subject: 'Payment Received - JTutors',
      htmlBody: `
        <h2>Payment Received</h2>
        <p>Hi {{userName}},</p>
        <p>Your payment of {{amount}} {{currency}} has been received successfully.</p>
        <p>Thank you for your purchase!</p>
        <p>Best regards,<br/>The JTutors Team</p>
      `,
      textBody: `Payment Received\n\nHi {{userName}},\n\nPayment of {{amount}} {{currency}} received.\n\nBest,\nJTutors Team`,
      variables: JSON.stringify(['userName', 'email', 'amount', 'currency', 'bookingId']),
    },
    {
      name: 'WITHDRAWAL_APPROVED',
      subject: 'Withdrawal Approved - JTutors',
      htmlBody: `
        <h2>Withdrawal Approved</h2>
        <p>Hi {{userName}},</p>
        <p>Your withdrawal request of {{amount}} {{currency}} has been approved.</p>
        <p>The funds will be transferred to your account shortly.</p>
        <p>Best regards,<br/>The JTutors Team</p>
      `,
      textBody: `Withdrawal Approved\n\nHi {{userName}},\n\nYour withdrawal of {{amount}} {{currency}} has been approved.\n\nBest,\nJTutors Team`,
      variables: JSON.stringify(['userName', 'email', 'amount', 'currency', 'withdrawalId']),
    },
    {
      name: 'WITHDRAWAL_REJECTED',
      subject: 'Withdrawal Rejected - JTutors',
      htmlBody: `
        <h2>Withdrawal Rejected</h2>
        <p>Hi {{userName}},</p>
        <p>Your withdrawal request of {{amount}} {{currency}} has been rejected.</p>
        <p>Reason: {{reason}}</p>
        <p>If you have questions, please contact support.</p>
        <p>Best regards,<br/>The JTutors Team</p>
      `,
      textBody: `Withdrawal Rejected\n\nHi {{userName}},\n\nYour withdrawal has been rejected. Reason: {{reason}}\n\nBest,\nJTutors Team`,
      variables: JSON.stringify(['userName', 'email', 'amount', 'currency', 'withdrawalId', 'reason']),
    },
  ];

  for (const template of defaultTemplates) {
    await upsertEmailTemplate(template);
  }
};

