import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { randomUUID } from 'crypto';

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
  sentCopySaved?: boolean;
  sentCopyError?: string;
}

type SentMailboxCandidate = {
  path: string;
  specialUse?: string | null;
};

type SentCopyClient = {
  usable: boolean;
  on: (event: 'error', listener: (error: Error) => void) => unknown;
  connect: () => Promise<unknown>;
  list: () => Promise<SentMailboxCandidate[]>;
  append: (
    path: string,
    content: Buffer,
    flags?: string[],
    idate?: Date
  ) => Promise<unknown | false>;
  logout: () => Promise<unknown>;
};

type SentCopyClientFactory = (
  options: ConstructorParameters<typeof ImapFlow>[0]
) => SentCopyClient;

let lastWorkingImapHost: string | null = null;

export const inferImapHost = (imapHost?: string, smtpHost?: string) => {
  if (imapHost?.trim()) return imapHost.trim();
  if (!smtpHost?.trim()) return null;
  const normalized = smtpHost.trim();
  return /^smtp\./i.test(normalized) ? normalized.replace(/^smtp\./i, 'imap.') : normalized;
};

const extractEmailDomain = (value?: string) => {
  const match = value?.match(/@([^>\s,]+)/);
  return match?.[1]?.trim().toLowerCase() || null;
};

export const getImapHostCandidates = ({
  imapHost,
  smtpHost,
  mailboxAddress,
}: {
  imapHost?: string;
  smtpHost?: string;
  mailboxAddress?: string;
}) => {
  if (imapHost?.trim()) return [imapHost.trim()];

  const domain = extractEmailDomain(mailboxAddress);
  return Array.from(
    new Set(
      [
        inferImapHost(undefined, smtpHost),
        domain ? `imap.${domain}` : null,
        domain ? `mail.${domain}` : null,
        smtpHost?.trim() || null,
      ].filter((host): host is string => Boolean(host))
    )
  );
};

export const selectSentMailbox = (
  mailboxes: SentMailboxCandidate[],
  configuredMailbox?: string
) => {
  if (configuredMailbox?.trim()) return configuredMailbox.trim();

  const specialUseMatch = mailboxes.find(
    (mailbox) => mailbox.specialUse?.toLowerCase() === '\\sent'
  );
  if (specialUseMatch) return specialUseMatch.path;

  const commonNames = new Set(['sent', 'sent items', 'sent messages', 'sent mail']);
  return (
    mailboxes.find((mailbox) => {
      const lastSegment = mailbox.path.split(/[/.]/).pop()?.trim().toLowerCase() || '';
      return commonNames.has(lastSegment);
    })?.path || null
  );
};

const createRawTransporter = () =>
  nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' });

export const buildRawEmail = async (message: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  messageId: string;
  date: Date;
}) => {
  const rawInfo = await createRawTransporter().sendMail(message);
  if (!Buffer.isBuffer(rawInfo.message)) {
    throw new Error('Unable to build an RFC822 email copy');
  }
  return rawInfo.message;
};

export const saveEmailToSent = async (
  rawMessage: Buffer,
  sentAt: Date,
  createClient: SentCopyClientFactory = (options) => new ImapFlow(options)
) => {
  if (process.env.SAVE_EMAILS_TO_SENT?.toLowerCase() === 'false') {
    return { saved: false, error: 'Sent-folder saving is disabled' };
  }

  const discoveredHosts = getImapHostCandidates({
    imapHost: process.env.IMAP_HOST,
    smtpHost: process.env.SMTP_HOST,
    mailboxAddress: process.env.IMAP_USER || process.env.SMTP_USER || process.env.MAIL_FROM,
  });
  const hosts = lastWorkingImapHost && discoveredHosts.includes(lastWorkingImapHost)
    ? [lastWorkingImapHost, ...discoveredHosts.filter((host) => host !== lastWorkingImapHost)]
    : discoveredHosts;
  const user = process.env.IMAP_USER || process.env.SMTP_USER;
  const pass = process.env.IMAP_PASS || process.env.SMTP_PASS;
  const port = Number(process.env.IMAP_PORT || 993);
  const secure = process.env.IMAP_SECURE
    ? process.env.IMAP_SECURE.toLowerCase() !== 'false'
    : port === 993;

  if (hosts.length === 0 || !user || !pass || !Number.isFinite(port)) {
    return { saved: false, error: 'IMAP configuration is incomplete' };
  }

  const connectionErrors: string[] = [];
  for (const host of hosts) {
    const client = createClient({
      host,
      port,
      secure,
      auth: { user, pass },
      logger: false,
      connectionTimeout: 7_000,
      greetingTimeout: 7_000,
      socketTimeout: 20_000,
      tls: {
        rejectUnauthorized: process.env.IMAP_TLS_REJECT_UNAUTHORIZED?.toLowerCase() !== 'false',
      },
    });

    client.on('error', (error) => {
      console.error(`[Email] IMAP Sent-copy connection error for ${host}:`, error.message);
    });

    try {
      await client.connect();
      const mailboxes = await client.list();
      const sentMailbox = selectSentMailbox(
        mailboxes.map((mailbox) => ({ path: mailbox.path, specialUse: mailbox.specialUse })),
        process.env.IMAP_SENT_MAILBOX
      );
      if (!sentMailbox) throw new Error('No Sent mailbox was found');

      const result = await client.append(sentMailbox, rawMessage, ['\\Seen'], sentAt);
      if (!result) throw new Error(`IMAP server rejected append to ${sentMailbox}`);
      lastWorkingImapHost = host;
      return { saved: true, mailbox: sentMailbox, host };
    } catch (error) {
      connectionErrors.push(`${host}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (client.usable) await client.logout().catch(() => undefined);
    }
  }

  return { saved: false, error: `Unable to save to Sent (${connectionErrors.join('; ')})` };
};

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

/**
 * Non-secret view of the SMTP configuration, for the admin integrations panel.
 * Reports which required keys are missing and whether the server can actually
 * connect — never returns credential values.
 */
export const getEmailStatus = async (): Promise<{
  configured: boolean;
  missingKeys: string[];
  host: string | null;
  port: string | null;
  user: string | null;
  from: string | null;
  connection: 'ok' | 'failed' | 'not_configured';
  error?: string;
}> => {
  const { transporter, missingKeys } = createTransporter();

  const base = {
    configured: missingKeys.length === 0,
    missingKeys,
    host: process.env.SMTP_HOST || null,
    port: process.env.SMTP_PORT || null,
    // Mailbox address is not a secret and is needed to spot typos.
    user: process.env.SMTP_USER || null,
    from: process.env.MAIL_FROM || null,
  };

  if (!transporter) {
    return { ...base, connection: 'not_configured' as const };
  }

  try {
    await transporter.verify();
    return { ...base, connection: 'ok' as const };
  } catch (error) {
    return {
      ...base,
      connection: 'failed' as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
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

  const sentAt = new Date();
  const messageId = `<${randomUUID()}@jtutors.com>`;
  const message = {
    from: process.env.MAIL_FROM!,
    to,
    subject,
    html,
    text,
    messageId,
    date: sentAt,
  };

  const info = await transporter.sendMail(message);

  try {
    const rawMessage = await buildRawEmail(message);
    const sentCopy = await saveEmailToSent(rawMessage, sentAt);
    if (!sentCopy.saved) {
      console.warn(`[Email] Delivered ${info.messageId}, but Sent copy was not saved: ${sentCopy.error}`);
    } else {
      console.log(`[Email] Saved ${info.messageId} to mailbox: ${sentCopy.mailbox}`);
    }
    return {
      delivered: true,
      messageId: info.messageId,
      sentCopySaved: sentCopy.saved,
      ...(!sentCopy.saved ? { sentCopyError: sentCopy.error } : {}),
    };
  } catch (error) {
    const sentCopyError = error instanceof Error ? error.message : String(error);
    // Delivery already succeeded. Never turn a Sent-folder issue into a failed
    // signup, booking, or payment notification.
    console.error(`[Email] Delivered ${info.messageId}, but failed to save its Sent copy:`, sentCopyError);
    return { delivered: true, messageId: info.messageId, sentCopySaved: false, sentCopyError };
  }
};

