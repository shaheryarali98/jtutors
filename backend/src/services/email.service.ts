import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailDeliveryResult {
  delivered: boolean;
  reason?: 'not_configured';
  messageId?: string;
}

const requiredSmtpKeys = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'MAIL_FROM'
] as const;

const getMissingSmtpKeys = () => requiredSmtpKeys.filter((key) => !process.env[key]);

const createTransporter = () => {
  const missingKeys = getMissingSmtpKeys();
  if (missingKeys.length > 0) {
    return { transporter: null, missingKeys };
  }

  const port = Number(process.env.SMTP_PORT);
  return {
    transporter: nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    }),
    missingKeys
  };
};

export const verifyEmailTransport = async (): Promise<boolean> => {
  const { transporter, missingKeys } = createTransporter();
  if (!transporter) {
    console.warn(`[Email] SMTP disabled. Missing environment variables: ${missingKeys.join(', ')}`);
    return false;
  }

  try {
    await transporter.verify();
    console.log('[Email] SMTP connection verified');
    return true;
  } catch (error) {
    console.error('[Email] SMTP connection verification failed:', error);
    return false;
  }
};

export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions): Promise<EmailDeliveryResult> => {
  const { transporter, missingKeys } = createTransporter();
  if (!transporter) {
    console.warn(
      `[Email] SMTP not configured (${missingKeys.join(', ')}). Email was not sent to:`,
      to,
      'Subject:',
      subject
    );
    return { delivered: false, reason: 'not_configured' };
  }

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM!,
    to,
    subject,
    html,
    text
  });

  return { delivered: true, messageId: info.messageId };
};

