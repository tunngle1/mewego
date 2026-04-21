import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt, { SignOptions } from 'jsonwebtoken';
import { ensurePublicId } from '../utils/publicId';
import { buildResetPasswordMessage, buildVerifyEmailMessage, isEmailTransportConfigured, sendEmail } from '../services/emailService';
import { hashPassword, normalizeEmail, validatePasswordStrength, verifyPassword } from '../services/passwords';
import { buildAbsoluteUrl, createOpaqueToken, hashOpaqueToken } from '../services/tokenService';

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

const issueEmailVerification = async (user: { id: string; email: string; emailNormalized: string }) => {
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

  try {
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

  const resetUrl = buildAbsoluteUrl(`/auth/email/reset-password?token=${encodeURIComponent(token)}`);
  const message = buildResetPasswordMessage({ resetUrl });

  if (!isEmailTransportConfigured()) {
    await logEmailResult({
      userId: user.id,
      email: user.email,
      templateKey: 'reset_password',
      category: 'transactional',
      status: 'skipped',
      error: 'Email transport is not configured',
      metadataJson: JSON.stringify({ resetUrl }),
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
      metadataJson: JSON.stringify({ resetUrl }),
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
      metadataJson: JSON.stringify({ resetUrl }),
    });
    throw error;
  }
};

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

    const verification = await issueEmailVerification({
      id: updatedUser.id,
      email: emailRaw,
      emailNormalized,
    }).catch((error: any) => ({
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

    const result = await issueEmailVerification({
      id: user.id,
      email: user.email,
      emailNormalized: user.emailNormalized || emailNormalized,
    }).catch(() => ({ deliveryStatus: 'failed' as const }));
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
