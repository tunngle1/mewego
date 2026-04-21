import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { ensurePublicId } from '../utils/publicId';

const router = Router();
const prisma = new PrismaClient();

// In-memory store for auth codes (в продакшене использовать Redis)
const authCodes: Map<string, { visitorId: string; visitorRole: string; expiresAt: Date; telegramChatId?: string }> = new Map();

// Telegram Bot Token из env
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'MeWeGoAuthBot';
const TELEGRAM_CONFIRM_SECRET = process.env.TELEGRAM_CONFIRM_SECRET || '';

const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || '';
const AUTH_JWT_EXPIRES_IN = (process.env.AUTH_JWT_EXPIRES_IN || '30d') as SignOptions['expiresIn'];

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

// Генерация 6-значного кода
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/v1/auth/telegram/start - начать авторизацию, получить код
router.post('/telegram/start', async (req: Request, res: Response) => {
  try {
    const { role = 'user' } = req.body;
    const visitorId = `visitor-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Генерируем код
    const code = generateCode();
    
    // Сохраняем код (действителен 10 минут)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    authCodes.set(code, {
      visitorId,
      visitorRole: role,
      expiresAt,
    });
    
    // Очистка старых кодов
    for (const [key, value] of authCodes.entries()) {
      if (value.expiresAt < new Date()) {
        authCodes.delete(key);
      }
    }
    
    console.log(`[Auth] Generated code ${code} for visitor ${visitorId}, role: ${role}`);
    
    res.json({
      code,
      botUsername: TELEGRAM_BOT_USERNAME,
      botLink: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[Auth] POST /telegram/start error:', error);
    res.status(500).json({ error: 'Failed to start auth' });
  }
});

// POST /api/v1/auth/telegram/confirm - подтвердить код (для локального бота на polling)
// Этот endpoint должен вызываться только ботом (через секрет), чтобы не требовался webhook.
router.post('/telegram/confirm', async (req: Request, res: Response) => {
  try {
    const secret = (req.headers['x-telegram-confirm-secret'] as string) || '';
    const { code, chatId } = req.body;

    if (!TELEGRAM_CONFIRM_SECRET) {
      return res.status(500).json({ error: 'TELEGRAM_CONFIRM_SECRET is not configured' });
    }

    if (!secret || secret !== TELEGRAM_CONFIRM_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!code || !chatId) {
      return res.status(400).json({ error: 'code and chatId are required' });
    }

    const authData = authCodes.get(code);

    if (!authData) {
      return res.status(404).json({ error: 'Code not found' });
    }

    if (authData.expiresAt < new Date()) {
      authCodes.delete(code);
      return res.status(400).json({ error: 'Code expired' });
    }

    authData.telegramChatId = String(chatId);
    authCodes.set(code, authData);

    console.log(`[Auth] Code ${code} confirmed via polling bot, chatId=${chatId}`);
    res.json({ status: 'confirmed' });
  } catch (error) {
    console.error('[Auth] POST /telegram/confirm error:', error);
    res.status(500).json({ error: 'Failed to confirm code' });
  }
});

// POST /api/v1/auth/telegram/verify - проверить код и завершить авторизацию
router.post('/telegram/verify', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    const authData = authCodes.get(code);
    
    if (!authData) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }
    
    if (authData.expiresAt < new Date()) {
      authCodes.delete(code);
      return res.status(400).json({ error: 'Code expired' });
    }
    
    if (!authData.telegramChatId) {
      // Код ещё не подтверждён через Telegram бота
      return res.status(400).json({ error: 'Code not confirmed in Telegram yet' });
    }
    
    // Код подтверждён — только вход для существующего пользователя
    const telegramId = authData.telegramChatId;

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { telegramId },
          { phone: `tg:${telegramId}` },
        ],
      },
    });

    if (!user) {
      authCodes.delete(code);
      return res.status(403).json({
        error: 'Telegram registration is disabled. Please register with email.',
        code: 'TELEGRAM_REGISTRATION_DISABLED',
      });
    }
    // Важно: НЕ меняем роль существующего пользователя через auth-флоу.
    // Ролями управляет superadmin/admin через админку.
    
    // Удаляем использованный код
    authCodes.delete(code);

    // Ensure publicId for existing users
    const publicId = await ensurePublicId(prisma, user.id);

    // IMPORTANT: allow auth even for banned/frozen users so the app can set auth context
    // and access /me/ban-appeal. Access to the app is still gated by /me (403) and UI.
    if (user.status === 'frozen') {
      // Auto-unfreeze if time has passed
      if (user.frozenUntil && user.frozenUntil.getTime() <= Date.now()) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            status: 'active',
            frozenAt: null,
            frozenUntil: null,
            frozenReason: null,
          },
        });
      }
    }
    
    // Выдаём JWT токен (Authorization: Bearer <token>)
    const token = signAuthToken({ userId: user.id });
    
    console.log(`[Auth] User ${user.id} authenticated via Telegram`);
    
    res.json({
      token,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        publicId,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        gender: user.gender,
        birthDate: user.birthDate?.toISOString(),
        cityId: user.cityId,
        interests: user.interests,
        onboardingCompleted: user.onboardingCompleted,
        accountStatus: user.status,
        bannedAt: user.bannedAt?.toISOString(),
        bannedReason: user.bannedReason,
        frozenAt: user.frozenAt?.toISOString(),
        frozenUntil: user.frozenUntil?.toISOString(),
        frozenReason: (user as any).frozenReason,
      },
    });
  } catch (error) {
    console.error('[Auth] POST /telegram/verify error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// POST /api/v1/auth/telegram/webhook - webhook для Telegram бота
router.post('/telegram/webhook', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.text) {
      return res.sendStatus(200);
    }
    
    const chatId = message.chat.id.toString();
    const text = message.text.trim();
    
    // Обработка команды /start с кодом
    if (text.startsWith('/start ')) {
      const code = text.replace('/start ', '').trim();
      
      const authData = authCodes.get(code);
      
      if (!authData) {
        await sendTelegramMessage(chatId, '❌ Код недействителен или истёк. Попробуйте снова в приложении.');
        return res.sendStatus(200);
      }
      
      if (authData.expiresAt < new Date()) {
        authCodes.delete(code);
        await sendTelegramMessage(chatId, '❌ Код истёк. Попробуйте снова в приложении.');
        return res.sendStatus(200);
      }
      
      // Подтверждаем код
      authData.telegramChatId = chatId;
      authCodes.set(code, authData);
      
      await sendTelegramMessage(chatId, `✅ Код подтверждён!\n\nВернитесь в приложение ME·WE·GO и нажмите "Продолжить".`);
      
      console.log(`[Auth] Code ${code} confirmed by Telegram chat ${chatId}`);
    } else if (text === '/start') {
      await sendTelegramMessage(chatId, `👋 Привет!\n\nЯ бот для авторизации в ME·WE·GO.\n\nЧтобы войти, откройте приложение и нажмите "Войти через Telegram".`);
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('[Auth] Telegram webhook error:', error);
    res.sendStatus(200); // Всегда отвечаем 200 для Telegram
  }
});

// GET /api/v1/auth/telegram/check/:code - проверить статус кода (polling)
router.get('/telegram/check/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    
    const authData = authCodes.get(code);
    
    if (!authData) {
      return res.json({ status: 'invalid' });
    }
    
    if (authData.expiresAt < new Date()) {
      authCodes.delete(code);
      return res.json({ status: 'expired' });
    }
    
    if (authData.telegramChatId) {
      return res.json({ status: 'confirmed' });
    }
    
    return res.json({ status: 'pending' });
  } catch (error) {
    console.error('[Auth] GET /telegram/check error:', error);
    res.status(500).json({ error: 'Failed to check code' });
  }
});

// Функция отправки сообщения в Telegram
async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Auth] TELEGRAM_BOT_TOKEN not set');
    return;
  }
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[Auth] Telegram API error:', error);
    }
  } catch (error) {
    console.error('[Auth] Failed to send Telegram message:', error);
  }
}

export { router as authRouter, authCodes };
