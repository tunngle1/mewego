import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt, { SignOptions } from 'jsonwebtoken';
import { ensurePublicId } from '../utils/publicId';
import { buildResetPasswordMessage, buildVerifyEmailMessage, isEmailTransportConfigured, sendEmail } from '../services/emailService';
import { hashPassword, normalizeEmail, validatePasswordStrength, verifyPassword } from '../services/passwords';
import { buildAbsoluteUrl, buildAppDeepLink, createOpaqueToken, hashOpaqueToken } from '../services/tokenService';

const router = Router();
const prisma = new PrismaClient();

const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || '';
const AUTH_JWT_EXPIRES_IN = (process.env.AUTH_JWT_EXPIRES_IN || '30d') as SignOptions['expiresIn'];
const EMAIL_VERIFY_TTL_MINUTES = Number(process.env.EMAIL_VERIFY_TTL_MINUTES || 60 * 24);
const PASSWORD_RESET_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);
const EMAIL_SEND_TIMEOUT_MS = Number(process.env.EMAIL_SEND_TIMEOUT_MS || 5000);

const signAuthToken = (params: { userId: string }) => {
  if (!AUTH_JWT_SECRET) {
    throw new Error('AUTH_JWT_SECRET is not configured');
  }

  return jwt.sign(
    {
      sub: params.userId,
    },
    AUTH_JWT_SECRET,
    {
      expiresIn: AUTH_JWT_EXPIRES_IN,
    }
  );
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const generateEmailVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const buildEmailVerificationTokenHash = (emailNormalized: string, code: string) => hashOpaqueToken(`${emailNormalized}:${code}`);

const buildUserResponse = async (user: any) => {
  const publicId = await ensurePublicId(prisma, user.id);
  return {
    id: user.id,
    publicId,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
    isEmailVerified: Boolean(user.emailVerifiedAt),
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    cityId: user.cityId,
    interests: user.interests,
    onboardingCompleted: user.onboardingCompleted,
    accountStatus: user.status,
    bannedAt: user.bannedAt?.toISOString(),
    bannedReason: user.bannedReason,
    frozenAt: user.frozenAt?.toISOString(),
    frozenUntil: user.frozenUntil?.toISOString(),
    frozenReason: user.frozenReason,
    marketingEmailOptIn: Boolean(user.marketingEmailOptIn),
  };
};

const logEmailResult = async (params: {
  userId?: string | null;
  email: string;
  templateKey: string;
  category: 'transactional' | 'marketing';
  status: string;
  error?: string | null;
  providerMessageId?: string | null;
  metadataJson?: string | null;
}) => {
  await prisma.emailLog.create({
    data: {
      userId: params.userId || null,
      email: params.email,
      templateKey: params.templateKey,
      category: params.category,
      status: params.status,
      provider: 'yandex360',
      providerMessageId: params.providerMessageId || null,
      error: params.error || null,
      metadataJson: params.metadataJson || null,
      sentAt: params.status === 'sent' ? new Date() : null,
    },
  }).catch(() => {});
};

const sendEmailWithTimeout = async (payload: Parameters<typeof sendEmail>[0]) => {
  return Promise.race([
    sendEmail(payload),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Email send timed out after ${EMAIL_SEND_TIMEOUT_MS}ms`)), EMAIL_SEND_TIMEOUT_MS);
    }),
  ]);
};

const issueEmailVerification = async (
  user: { id: string; email: string; emailNormalized: string },
  options?: { sendAsync?: boolean }
) => {
  const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_MINUTES * 60 * 1000);
  let code = '';

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidateCode = generateEmailVerificationCode();
    const tokenHash = buildEmailVerificationTokenHash(user.emailNormalized, candidateCode);
    try {
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
      code = candidateCode;
      break;
    } catch (error: any) {
      const uniqueError = error?.code === 'P2002';
      if (!uniqueError || attempt === 4) {
        throw error;
      }
    }
  }

  const message = buildVerifyEmailMessage({
    code,
    expiresInMinutes: EMAIL_VERIFY_TTL_MINUTES,
  });

  if (!isEmailTransportConfigured()) {
    await logEmailResult({
      userId: user.id,
      email: user.email,
      templateKey: 'verify_email',
      category: 'transactional',
      status: 'skipped',
      error: 'Email transport is not configured',
      metadataJson: JSON.stringify({ codeLength: code.length }),
    });
    return { deliveryStatus: 'skipped' as const };
  }

  const run = async () => {
    const info = await sendEmailWithTimeout({
      to: user.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    await logEmailResult({
      userId: user.id,
      email: user.email,
      templateKey: 'verify_email',
      category: 'transactional',
      status: 'sent',
      providerMessageId: info.messageId || null,
      metadataJson: JSON.stringify({ codeLength: code.length }),
    });
  };

  if (options?.sendAsync) {
    run().catch((error: any) => {
      logEmailResult({
        userId: user.id,
        email: user.email,
        templateKey: 'verify_email',
        category: 'transactional',
        status: 'failed',
        error: error?.message || 'Failed to send verification email',
        metadataJson: JSON.stringify({ codeLength: code.length }),
      }).catch(() => {});
      console.error('[EmailAuth] verify email send async error:', error);
    });
    return { deliveryStatus: 'queued' as const };
  }

  try {
    await run();
    return { deliveryStatus: 'sent' as const };
  } catch (error: any) {
    await logEmailResult({
      userId: user.id,
      email: user.email,
      templateKey: 'verify_email',
      category: 'transactional',
      status: 'failed',
      error: error?.message || 'Failed to send verification email',
      metadataJson: JSON.stringify({ codeLength: code.length }),
    });
    throw error;
  }
};

const issuePasswordReset = async (user: { id: string; email: string }) => {
  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const appUrl = buildAppDeepLink(`/auth/reset-password?token=${encodeURIComponent(token)}`);
  const resetUrl = buildAbsoluteUrl(`/api/v1/auth/reset-password?token=${encodeURIComponent(token)}`);
  const message = buildResetPasswordMessage({ resetUrl, appUrl });

  if (!isEmailTransportConfigured()) {
    await logEmailResult({
      userId: user.id,
      email: user.email,
      templateKey: 'reset_password',
      category: 'transactional',
      status: 'skipped',
      error: 'Email transport is not configured',
      metadataJson: JSON.stringify({ resetUrl, appUrl }),
    });
    return { deliveryStatus: 'skipped' as const, resetUrl };
  }

  try {
    const info = await sendEmail({
      to: user.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    await logEmailResult({
      userId: user.id,
      email: user.email,
      templateKey: 'reset_password',
      category: 'transactional',
      status: 'sent',
      providerMessageId: info.messageId || null,
      metadataJson: JSON.stringify({ resetUrl, appUrl }),
    });

    return { deliveryStatus: 'sent' as const, resetUrl };
  } catch (error: any) {
    await logEmailResult({
      userId: user.id,
      email: user.email,
      templateKey: 'reset_password',
      category: 'transactional',
      status: 'failed',
      error: error?.message || 'Failed to send password reset email',
      metadataJson: JSON.stringify({ resetUrl, appUrl }),
    });
    throw error;
  }
};

router.get('/reset-password', (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  const appUrl = token ? buildAppDeepLink(`/auth/reset-password?token=${encodeURIComponent(token)}`) : buildAppDeepLink('/auth/reset-password');
  const apiBaseUrl = buildAbsoluteUrl('/api/v1').replace(/\/+$/, '');

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Сброс пароля | ME·WE·GO</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #fbf5e5;
      --surface: #ffffff;
      --text: #171e22;
      --muted: #6b7280;
      --accent: #e8336c;
      --border: #e5e7eb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      width: 100%;
      max-width: 440px;
      background: var(--surface);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 16px 40px rgba(23, 30, 34, 0.12);
    }
    h1 {
      margin: 0 0 12px;
      font-size: 28px;
      line-height: 1.2;
    }
    p {
      margin: 0 0 16px;
      color: var(--muted);
      line-height: 1.5;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 20px 0 24px;
    }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 48px;
      border-radius: 14px;
      border: 1px solid var(--border);
      text-decoration: none;
      font-weight: 700;
      cursor: pointer;
      font-size: 16px;
      padding: 0 16px;
    }
    .button-primary {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
    }
    .button-secondary {
      background: white;
      color: var(--text);
    }
    label {
      display: block;
      margin: 0 0 8px;
      font-weight: 700;
      font-size: 14px;
    }
    input {
      width: 100%;
      min-height: 48px;
      border-radius: 14px;
      border: 1px solid var(--border);
      padding: 12px 14px;
      font-size: 16px;
      margin-bottom: 16px;
    }
    .hint {
      font-size: 13px;
      color: var(--muted);
      margin-top: -8px;
      margin-bottom: 16px;
    }
    .status {
      margin-top: 16px;
      font-size: 14px;
      line-height: 1.5;
    }
    .status.error { color: #b91c1c; }
    .status.success { color: #15803d; }
    .token-box {
      margin-top: 16px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 12px;
      border: 1px solid var(--border);
      word-break: break-all;
      font-size: 12px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Сброс пароля</h1>
    <p>Если приложение установлено на этом устройстве, откройте форму сброса прямо в приложении. Если нет, задайте новый пароль здесь, в браузере.</p>
    <div class="actions">
      <a class="button button-primary" href="${appUrl}">Открыть в приложении</a>
    </div>
    <form id="reset-form">
      <label for="password">Новый пароль</label>
      <input id="password" name="password" type="password" placeholder="Минимум 8 символов" minlength="8" required />
      <div class="hint">Пароль должен содержать не меньше 8 символов.</div>
      <button class="button button-secondary" type="submit">Сохранить новый пароль</button>
    </form>
    <div id="status" class="status"></div>
    ${token ? `<div class="token-box">Token: ${token}</div>` : ''}
  </div>
  <script>
    const token = ${JSON.stringify(token)};
    const form = document.getElementById('reset-form');
    const statusNode = document.getElementById('status');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      statusNode.textContent = '';
      statusNode.className = 'status';

      const passwordInput = document.getElementById('password');
      const password = passwordInput.value;

      if (!token) {
        statusNode.textContent = 'В ссылке отсутствует token для сброса пароля.';
        statusNode.classList.add('error');
        return;
      }

      if (!password || password.length < 8) {
        statusNode.textContent = 'Введите пароль длиной не менее 8 символов.';
        statusNode.classList.add('error');
        return;
      }

      statusNode.textContent = 'Сохраняем новый пароль...';

      try {
        const response = await fetch('${apiBaseUrl}/auth/password/reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, password }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = payload && typeof payload.error === 'string'
            ? payload.error
            : 'Не удалось обновить пароль.';
          throw new Error(message);
        }

        statusNode.textContent = 'Пароль обновлен. Теперь можно войти в приложение с новым паролем.';
        statusNode.classList.add('success');
        form.reset();
      } catch (error) {
        statusNode.textContent = error instanceof Error ? error.message : 'Не удалось обновить пароль.';
        statusNode.classList.add('error');
      }
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const emailRaw = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const marketingEmailOptIn = Boolean(req.body.marketingEmailOptIn);
    const requestedRole = req.body.role === 'organizer' ? 'organizer' : 'user';

    if (!emailRaw || !password || !name) {
      return res.status(400).json({ error: 'email, password and name are required' });
    }

    if (!isValidEmail(emailRaw)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const emailNormalized = normalizeEmail(emailRaw);
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { emailNormalized },
          { email: emailRaw },
        ],
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'Email is already in use' });
    }

    const passwordHash = await hashPassword(password);
    const updatedUser = await prisma.user.create({
      data: {
        name,
        role: requestedRole,
        onboardingCompleted: false,
        email: emailRaw,
        emailNormalized,
        passwordHash,
        authProviders: ['email'],
        marketingEmailOptIn,
        marketingEmailOptInAt: marketingEmailOptIn ? new Date() : null,
        marketingEmailOptOutAt: marketingEmailOptIn ? null : new Date(),
        lastActiveAt: new Date(),
      },
    });

    const verification = await issueEmailVerification(
      {
        id: updatedUser.id,
        email: emailRaw,
        emailNormalized,
      },
      { sendAsync: true }
    ).catch((error: any) => ({
      deliveryStatus: 'failed' as const,
      error: error?.message || 'Failed to send verification email',
    }));

    const token = signAuthToken({ userId: updatedUser.id });
    res.status(201).json({
      token,
      user: await buildUserResponse(updatedUser),
      verification: {
        required: true,
        deliveryStatus: verification.deliveryStatus,
      },
    });
  } catch (error) {
    console.error('[EmailAuth] POST /register error:', error);
    res.status(500).json({ error: 'Failed to register with email' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const emailRaw = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!emailRaw || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const emailNormalized = normalizeEmail(emailRaw);
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { emailNormalized },
          { email: emailRaw },
        ],
      },
    });

    if (!user?.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastActiveAt: new Date(),
        email: user.email || emailRaw,
        emailNormalized,
        authProviders: Array.from(new Set([...(user.authProviders || []), 'email'])),
      },
    });

    const token = signAuthToken({ userId: updatedUser.id });
    res.json({
      token,
      user: await buildUserResponse(updatedUser),
    });
  } catch (error) {
    console.error('[EmailAuth] POST /login error:', error);
    res.status(500).json({ error: 'Failed to login with email' });
  }
});

router.post('/verify-email/request', async (req: Request, res: Response) => {
  try {
    const emailRaw = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    if (!emailRaw) {
      return res.status(400).json({ error: 'email is required' });
    }

    const emailNormalized = normalizeEmail(emailRaw);
    const user = await prisma.user.findFirst({ where: { emailNormalized } });
    if (!user?.email) {
      return res.json({ ok: true });
    }

    await prisma.emailVerificationToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    const result = await issueEmailVerification(
      {
        id: user.id,
        email: user.email,
        emailNormalized: user.emailNormalized || emailNormalized,
      },
      { sendAsync: true }
    ).catch(() => ({ deliveryStatus: 'failed' as const }));
    res.json({ ok: true, deliveryStatus: result.deliveryStatus });
  } catch (error) {
    console.error('[EmailAuth] POST /verify-email/request error:', error);
    res.status(500).json({ error: 'Failed to request email verification' });
  }
});

router.post('/verify-email/confirm', async (req: Request, res: Response) => {
  try {
    const emailRaw = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    if (!emailRaw || !code) {
      return res.status(400).json({ error: 'email and code are required' });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Verification code must contain 6 digits' });
    }

    if (!isValidEmail(emailRaw)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const emailNormalized = normalizeEmail(emailRaw);
    const tokenHash = buildEmailVerificationTokenHash(emailNormalized, code);
    const verificationToken = await prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        user: {
          emailNormalized,
        },
      },
      include: {
        user: true,
      },
    });

    if (!verificationToken || verificationToken.usedAt || verificationToken.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Verification code is invalid or expired' });
    }

    const [, user] = await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerifiedAt: new Date(),
          authProviders: Array.from(new Set([...(verificationToken.user.authProviders || []), 'email'])),
          lastActiveAt: new Date(),
        },
      }),
    ]);

    const authToken = signAuthToken({ userId: user.id });
    res.json({
      token: authToken,
      user: await buildUserResponse(user),
    });
  } catch (error) {
    console.error('[EmailAuth] POST /verify-email/confirm error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

router.post('/password/forgot', async (req: Request, res: Response) => {
  try {
    const emailRaw = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    if (!emailRaw) {
      return res.status(400).json({ error: 'email is required' });
    }

    const emailNormalized = normalizeEmail(emailRaw);
    const user = await prisma.user.findFirst({ where: { emailNormalized } });
    if (user?.email) {
      await prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
      });
      await issuePasswordReset({ id: user.id, email: user.email }).catch(() => null);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('[EmailAuth] POST /password/forgot error:', error);
    res.status(500).json({ error: 'Failed to start password reset' });
  }
});

router.post('/password/reset', async (req: Request, res: Response) => {
  try {
    const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!token || !password) {
      return res.status(400).json({ error: 'token and password are required' });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const tokenHash = hashOpaqueToken(token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Reset token is invalid or expired' });
    }

    const passwordHash = await hashPassword(password);
    const [, user] = await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          authProviders: Array.from(new Set([...(resetToken.user.authProviders || []), 'email'])),
          lastActiveAt: new Date(),
        },
      }),
    ]);

    const authToken = signAuthToken({ userId: user.id });
    res.json({
      token: authToken,
      user: await buildUserResponse(user),
    });
  } catch (error) {
    console.error('[EmailAuth] POST /password/reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.post('/logout', async (_req: Request, res: Response) => {
  res.json({ ok: true });
});

export { router as emailAuthRouter };
