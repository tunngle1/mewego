export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || 'yandex360').trim();
const EMAIL_FROM = (process.env.EMAIL_FROM || '').trim();
const EMAIL_REPLY_TO = (process.env.EMAIL_REPLY_TO || '').trim();
const SMTP_HOST = (process.env.YANDEX_SMTP_HOST || process.env.SMTP_HOST || '').trim();
const SMTP_PORT = Number(process.env.YANDEX_SMTP_PORT || process.env.SMTP_PORT || 465);
const SMTP_USER = (process.env.YANDEX_SMTP_USER || process.env.SMTP_USER || '').trim();
const SMTP_PASSWORD = (process.env.YANDEX_SMTP_PASSWORD || process.env.SMTP_PASSWORD || '').trim();
const SMTP_SECURE = String(process.env.YANDEX_SMTP_SECURE || process.env.SMTP_SECURE || 'true').trim().toLowerCase() !== 'false';
const SMTP_CONNECTION_TIMEOUT_MS = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 20000);
const SMTP_GREETING_TIMEOUT_MS = Number(process.env.SMTP_GREETING_TIMEOUT_MS || 20000);
const SMTP_SOCKET_TIMEOUT_MS = Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 60000);
const SMTP_IP_FAMILY_RAW = String(process.env.SMTP_IP_FAMILY || '').trim();
const SMTP_IP_FAMILY = SMTP_IP_FAMILY_RAW === '4' ? 4 : SMTP_IP_FAMILY_RAW === '6' ? 6 : undefined;
const SMTP_TLS_SERVERNAME = (process.env.SMTP_TLS_SERVERNAME || '').trim();
const SMTP_FORCE_IPV6 = String(process.env.SMTP_FORCE_IPV6 || 'false').trim().toLowerCase() === 'true';

const hasEmailTransportConfig = Boolean(EMAIL_FROM && SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASSWORD);

let transporterCache: { sendMail: (payload: any) => Promise<any> } | null | undefined;

const getTransporter = () => {
  if (!hasEmailTransportConfig) {
    return null;
  }

  if (transporterCache !== undefined) {
    return transporterCache;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require('nodemailer');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dns = require('dns');
    transporterCache = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
      connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
      greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
      socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
      ...(SMTP_IP_FAMILY ? { family: SMTP_IP_FAMILY } : {}),
      ...(SMTP_TLS_SERVERNAME ? { tls: { servername: SMTP_TLS_SERVERNAME } } : {}),
      ...(SMTP_FORCE_IPV6
        ? {
            // Force AAAA resolution even if Node prefers IPv4.
            // smtp-connection will call this lookup for the TCP connect.
            lookup: (hostname: string, _options: any, callback: (err: any, address?: string, family?: number) => void) => {
              dns.resolve6(hostname, (err: any, addresses: string[]) => {
                if (err) return callback(err);
                if (!addresses || addresses.length === 0) return callback(new Error(`No AAAA records for ${hostname}`));
                return callback(null, addresses[0], 6);
              });
            },
          }
        : {}),
    });
    return transporterCache;
  } catch {
    transporterCache = null;
    return null;
  }
};

export const isEmailTransportConfigured = () => hasEmailTransportConfig;

export const sendEmail = async (input: SendEmailInput) => {
  const transporter = getTransporter();
  if (!transporter || !EMAIL_FROM) {
    throw new Error('Email transport is not configured');
  }

  return transporter.sendMail({
    from: EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO || undefined,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    headers: {
      'X-Email-Provider': EMAIL_PROVIDER,
    },
  });
};

export const buildVerifyEmailMessage = (params: { code: string; expiresInMinutes: number; appName?: string }) => {
  const appName = params.appName || 'ME·WE·GO';
  const subject = `Подтвердите почту в ${appName}`;
  const text = `Код подтверждения для ${appName}: ${params.code}. Код действует ${params.expiresInMinutes} минут.`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#111827;">
  <h2 style="margin-bottom:16px;">Подтвердите почту</h2>
  <p style="margin:0 0 16px;">Чтобы завершить регистрацию в ${appName}, введите этот код в приложении:</p>
  <div style="margin:0 0 16px;font-size:28px;letter-spacing:6px;font-weight:700;color:#111827;">${params.code}</div>
  <p style="margin:0;color:#6b7280;">Код действует ${params.expiresInMinutes} минут.</p>
</div>`;

  return { subject, text, html };
};

export const buildResetPasswordMessage = (params: { resetUrl: string; appName?: string }) => {
  const appName = params.appName || 'ME·WE·GO';
  const subject = `Сброс пароля в ${appName}`;
  const text = `Чтобы задать новый пароль, откройте ссылку: ${params.resetUrl}`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#111827;">
  <h2 style="margin-bottom:16px;">Сброс пароля</h2>
  <p style="margin:0 0 16px;">Мы получили запрос на сброс пароля для вашего аккаунта в ${appName}.</p>
  <p style="margin:0 0 24px;"><a href="${params.resetUrl}" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;">Задать новый пароль</a></p>
  <p style="margin:0;color:#6b7280;">Если вы не запрашивали сброс, просто проигнорируйте это письмо.</p>
  <p style="margin:8px 0 0;color:#2563eb;word-break:break-all;">${params.resetUrl}</p>
</div>`;

  return { subject, text, html };
};
