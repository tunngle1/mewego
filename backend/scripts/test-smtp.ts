/**
 * Проверка SMTP-настроек на сервере.
 * Запуск: npx ts-node scripts/test-smtp.ts you@example.com
 */

import dotenv from 'dotenv';
import { buildVerifyEmailMessage, isEmailTransportConfigured, sendEmail } from '../src/services/emailService';

dotenv.config();

const to = process.argv[2]?.trim();

async function main() {
  if (!to) {
    console.error('Usage: npx ts-node scripts/test-smtp.ts recipient@example.com');
    process.exit(1);
  }

  console.log('Email transport configured:', isEmailTransportConfigured());
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM || '(empty)');
  console.log('SMTP host:', process.env.YANDEX_SMTP_HOST || process.env.SMTP_HOST || '(empty)');

  if (!isEmailTransportConfigured()) {
    console.error('SMTP is not configured. Set EMAIL_FROM, YANDEX_SMTP_HOST, YANDEX_SMTP_PORT in .env');
    process.exit(1);
  }

  const message = buildVerifyEmailMessage({ code: '123456', expiresInMinutes: 10 });
  const info = await sendEmail({
    to,
    subject: `[test] ${message.subject}`,
    html: message.html,
    text: message.text,
  });

  console.log('Test email sent:', info.messageId || info);
}

main().catch((error) => {
  console.error('SMTP test failed:', error);
  process.exit(1);
});
