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
    // Fallback: build a minimal but useful email using the raw variables
    const resetLink = variables.resetLink ? String(variables.resetLink) : null;
    const userName = variables.userName ? String(variables.userName) : 'there';
    const fallbackHtml = resetLink
      ? `<p>Hi ${userName},</p><p>You requested to reset your password. Click the link below to reset it:</p><p><a href="${resetLink}">Reset Password</a></p><p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p><p>Best regards,<br/>The JTutors Team</p>`
      : `<p>Hello,</p><p>This is a notification from JTutors.</p>`;
    const fallbackSubject = resetLink ? 'Reset Your Password - JTutors' : 'Notification from JTutors';
    await sendEmail({
      to,
      subject: fallbackSubject,
      html: fallbackHtml,
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
    {
      name: 'SESSION_BOOKED_TUTOR',
      subject: 'New Session Booked - JTutors',
      htmlBody: `
        <h2>New Session Booked</h2>
        <p>Hi {{tutorName}},</p>
        <p>A student has booked a session with you!</p>
        <p><strong>Student:</strong> {{studentName}} ({{studentEmail}})</p>
        <p><strong>Date &amp; Time:</strong> {{startTime}} – {{endTime}}</p>
        <p>Log in to your JTutors dashboard to view the details and prepare for your upcoming session.</p>
        <p>Best regards,<br/>The JTutors Team</p>
      `,
      textBody: `New Session Booked\n\nHi {{tutorName}},\n\nA student has booked a session with you!\n\nStudent: {{studentName}} ({{studentEmail}})\nDate & Time: {{startTime}} – {{endTime}}\n\nLog in to your JTutors dashboard to view details.\n\nBest,\nJTutors Team`,
      variables: JSON.stringify(['tutorName', 'studentName', 'studentEmail', 'startTime', 'endTime']),
    },
    {
      name: 'SESSION_COMPLETE_STUDENT_CONFIRM',
      subject: 'Your session is complete — payment releases in 48 hours unless disputed',
      htmlBody: `
        <h2>Session Marked Complete</h2>
        <p>Hi {{studentName}},</p>
        <p>Your tutor <strong>{{tutorName}}</strong> has marked your session on <strong>{{sessionDate}}</strong> as complete.</p>
        <p>Payment will be automatically released to your tutor on <strong>{{autoReleaseDate}}</strong>.</p>
        <p><strong>Did something go wrong?</strong> If the session did not happen or there was an issue, please email us at <a href="mailto:support@jtutors.com">support@jtutors.com</a> before <strong>{{autoReleaseDate}}</strong> to open a dispute. Once released, payments cannot be reversed.</p>
        <p>Best regards,<br/>The JTutors Team</p>
      `,
      textBody: `Hi {{studentName}},\n\nYour tutor {{tutorName}} has marked your session on {{sessionDate}} as complete.\n\nPayment releases automatically on {{autoReleaseDate}}.\n\nIf the session did NOT happen, email support@jtutors.com BEFORE {{autoReleaseDate}} to dispute.\n\nBest,\nJTutors Team`,
      variables: JSON.stringify(['studentName', 'tutorName', 'sessionDate', 'autoReleaseDate']),
    },
    {
      name: 'SESSION_PAYMENT_RELEASED',
      subject: 'Payment Released — JTutors',
      htmlBody: `
        <h2>Payment Released</h2>
        <p>Hi {{tutorName}},</p>
        <p>The dispute window for your session with <strong>{{studentName}}</strong> on <strong>{{sessionDate}}</strong> has closed.</p>
        <p>Payment of <strong>{{amount}}</strong> has been released to your account.</p>
        <p>Best regards,<br/>The JTutors Team</p>
      `,
      textBody: `Hi {{tutorName}},\n\nThe dispute window for your session with {{studentName}} on {{sessionDate}} has closed.\n\nPayment of {{amount}} has been released to your account.\n\nBest,\nJTutors Team`,
      variables: JSON.stringify(['tutorName', 'studentName', 'sessionDate', 'amount']),
    },
  ];

  for (const template of defaultTemplates) {
    await upsertEmailTemplate(template);
  }
};

