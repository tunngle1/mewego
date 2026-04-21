/**
 * Push Notification Service
 * Отправка push-уведомлений через Expo Push API
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

export interface PushResult {
  successCount: number;
  failedCount: number;
  errors: string[];
}

type ExpoPushApiResponse = {
  data?: Array<{
    status?: string;
    message?: string;
  }>;
};

/**
 * Отправить push-уведомление на указанные Expo Push Token'ы
 */
export async function sendExpoPush(
  tokens: string[],
  payload: PushPayload
): Promise<PushResult> {
  if (!tokens.length) {
    return { successCount: 0, failedCount: 0, errors: [] };
  }

  // Фильтруем только валидные Expo Push Token'ы
  const validTokens = tokens.filter(
    (t) => t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[')
  );

  if (!validTokens.length) {
    return {
      successCount: 0,
      failedCount: tokens.length,
      errors: ['No valid Expo push tokens'],
    };
  }

  const messages = validTokens.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    sound: payload.sound ?? 'default',
    badge: payload.badge,
    channelId: payload.channelId || 'default',
  }));

  // Expo рекомендует отправлять пачками по 100
  const BATCH_SIZE = 100;
  const batches: typeof messages[] = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    batches.push(messages.slice(i, i + BATCH_SIZE));
  }

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const batch of batches) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      const json = (await response.json().catch(() => null)) as ExpoPushApiResponse | null;

      if (!response.ok) {
        failedCount += batch.length;
        errors.push(`Expo API error: ${response.status}`);
        continue;
      }

      // Проверяем результаты
      if (json?.data && Array.isArray(json.data)) {
        for (const result of json.data) {
          if (result.status === 'ok') {
            successCount++;
          } else {
            failedCount++;
            if (result.message) {
              errors.push(result.message);
            }
          }
        }
      } else {
        successCount += batch.length;
      }
    } catch (error) {
      failedCount += batch.length;
      errors.push(String(error));
    }
  }

  return { successCount, failedCount, errors };
}

/**
 * Отправить push-уведомление пользователю по userId
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<PushResult> {
  const tokens = await prisma.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });

  return sendExpoPush(
    tokens.map((t) => t.token),
    payload
  );
}

/**
 * Отправить push-уведомление нескольким пользователям
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<PushResult> {
  if (!userIds.length) {
    return { successCount: 0, failedCount: 0, errors: [] };
  }

  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });

  return sendExpoPush(
    tokens.map((t) => t.token),
    payload
  );
}
