import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Helper: проверить активную подписку пользователя
export const getActiveSubscription = async (userId: string) => {
  const now = new Date();
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['trial', 'active', 'grace'] },
      endAt: { gte: now },
    },
    orderBy: { endAt: 'desc' },
  });
  return subscription;
};

// Helper: получить все активные подписки пользователя (на случай нескольких планов)
export const getActiveSubscriptions = async (userId: string) => {
  const now = new Date();
  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId,
      status: { in: ['trial', 'active', 'grace'] },
      endAt: { gte: now },
    },
    orderBy: { endAt: 'desc' },
  });
  return subscriptions;
};

// Helper: проверить, есть ли у пользователя активная подписка определённого плана
export const hasActivePlan = async (userId: string, plan?: string) => {
  const subscription = await getActiveSubscription(userId);
  if (!subscription) return false;
  if (plan && subscription.plan !== plan) return false;
  return true;
};

// Helper: проверить entitlements пользователя
export const getUserEntitlements = async (userId: string, role?: 'user' | 'organizer' | 'admin' | 'superadmin') => {
  if (process.env.DISABLE_SUBSCRIPTIONS === 'true') {
    const now = new Date();
    const endAt = new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000);

    const effectiveRole = role || 'user';
    const isOrganizer = effectiveRole === 'organizer' || effectiveRole === 'admin' || effectiveRole === 'superadmin';

    return {
      hasSubscription: true,
      plan: isOrganizer ? 'organizer_999' : 'user_349',
      status: 'active',
      endAt: endAt.toISOString(),
      canUseWaitingList: true,
      canUseChallenges: true,
      canCreatePaidEvents: isOrganizer,
      canUseCRM: isOrganizer,
      hasFullStats: true,
    };
  }

  const subscriptions = await getActiveSubscriptions(userId);

  if (!subscriptions || subscriptions.length === 0) {
    return {
      hasSubscription: false,
      plan: null,
      status: 'none',
      endAt: null,
      // Гейты по TZ.md: без подписки
      canUseWaitingList: false,
      canUseChallenges: false,
      canCreatePaidEvents: false,
      canUseCRM: false,
      hasFullStats: false,
    };
  }

  const isUserPlan = subscriptions.some((s) => s.plan === 'user_349');
  const isOrganizerPlan = subscriptions.some((s) => s.plan === 'organizer_999');
  const primary = isOrganizerPlan
    ? subscriptions.find((s) => s.plan === 'organizer_999') || subscriptions[0]
    : subscriptions[0];

  return {
    hasSubscription: true,
    plan: primary.plan,
    status: primary.status,
    endAt: primary.endAt.toISOString(),
    // Гейты по TZ.md
    canUseWaitingList: isUserPlan || isOrganizerPlan,
    canUseChallenges: isUserPlan || isOrganizerPlan,
    canCreatePaidEvents: isOrganizerPlan,
    canUseCRM: isOrganizerPlan,
    hasFullStats: isUserPlan || isOrganizerPlan,
  };
};

// GET /api/v1/subscriptions/status - статус подписки текущего пользователя
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const entitlements = await getUserEntitlements(userId, req.auth!.role);

    res.json(entitlements);
  } catch (error) {
    console.error('[Subscriptions] GET /status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// POST /api/v1/subscriptions/start - начать подписку (заглушка для dev, без реальной проверки receipt)
router.post('/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const { plan, platform, receipt, trial } = req.body;

    // Валидация плана
    if (!['user_349', 'organizer_999'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be user_349 or organizer_999' });
    }

    // Проверяем, нет ли уже активной подписки
    const existing = await getActiveSubscription(userId);
    if (existing) {
      return res.status(400).json({ 
        error: 'Already have active subscription',
        currentPlan: existing.plan,
        endAt: existing.endAt.toISOString(),
      });
    }

    // Определяем тип подписки: trial (7 дней) или active (30 дней)
    // Проверяем, использовал ли пользователь trial раньше
    const hadTrial = await prisma.subscription.findFirst({
      where: { userId, status: { in: ['trial', 'active', 'expired', 'canceled'] } },
    });

    const now = new Date();

    // Trial выдаём ТОЛЬКО по явному действию пользователя
    const wantsTrial = trial === true;
    const canStartTrial = wantsTrial && !hadTrial;

    if (!receipt && !canStartTrial) {
      return res.status(400).json({
        error: 'Receipt required',
        message: 'Для подписки требуется оплата. Пробный период доступен только по кнопке и один раз.',
      });
    }

    const isTrial = canStartTrial && !receipt;
    const durationDays = isTrial ? 7 : 30;
    const endAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        plan,
        status: isTrial ? 'trial' : 'active',
        startAt: now,
        endAt,
        autoRenew: !isTrial,
        platform: platform || null,
        storeReceipt: receipt || null,
      },
    });

    console.log(`[Subscriptions] Created ${subscription.status} subscription for user ${userId}, plan: ${plan}`);

    res.status(201).json({
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      startAt: subscription.startAt.toISOString(),
      endAt: subscription.endAt.toISOString(),
      autoRenew: subscription.autoRenew,
    });
  } catch (error) {
    console.error('[Subscriptions] POST /start error:', error);
    res.status(500).json({ error: 'Failed to start subscription' });
  }
});

// POST /api/v1/subscriptions/cancel - отменить автопродление
router.post('/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;

    const subscription = await getActiveSubscription(userId);
    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { 
        autoRenew: false,
        status: subscription.status === 'trial' ? 'trial' : 'canceled',
      },
    });

    console.log(`[Subscriptions] Canceled auto-renew for user ${userId}`);

    res.json({
      id: updated.id,
      plan: updated.plan,
      status: updated.status,
      endAt: updated.endAt.toISOString(),
      autoRenew: updated.autoRenew,
      message: 'Subscription will not renew. Access continues until end date.',
    });
  } catch (error) {
    console.error('[Subscriptions] POST /cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ============================================================
// RevenueCat Webhook
// POST /api/v1/subscriptions/webhook/revenuecat
// Документация: https://www.revenuecat.com/docs/webhooks
// ============================================================

interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    type: string; // INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, etc.
    app_user_id: string;
    product_id: string;
    entitlement_ids?: string[];
    purchased_at_ms?: number;
    expiration_at_ms?: number;
    store: string; // APP_STORE, PLAY_STORE
    environment: string; // SANDBOX, PRODUCTION
    is_trial_conversion?: boolean;
    cancel_reason?: string;
  };
}

// Маппинг RevenueCat product_id -> наш plan
const PRODUCT_TO_PLAN: Record<string, string> = {
  'mewego_user_monthly': 'user_349',
  'mewego_user_349': 'user_349',
  'mewego_organizer_monthly': 'organizer_999',
  'mewego_organizer_999': 'organizer_999',
  // Sandbox/test product IDs
  'rc_349_1m': 'user_349',
  'rc_999_1m': 'organizer_999',
};

router.post('/webhook/revenuecat', async (req: Request, res: Response) => {
  try {
    const payload = req.body as RevenueCatWebhookEvent;
    const event = payload.event;

    if (!event || !event.app_user_id) {
      console.warn('[RevenueCat Webhook] Invalid payload:', payload);
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const userId = event.app_user_id;
    const productId = event.product_id || '';
    const plan = PRODUCT_TO_PLAN[productId] || 'user_349';
    const platform = event.store === 'APP_STORE' ? 'ios' : 'android';

    console.log(`[RevenueCat Webhook] ${event.type} for user ${userId}, product ${productId}`);

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE': {
        // Создаём или обновляем подписку
        const startAt = event.purchased_at_ms ? new Date(event.purchased_at_ms) : new Date();
        const endAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await prisma.subscription.upsert({
          where: {
            userId_plan: { userId, plan },
          },
          create: {
            userId,
            plan,
            status: 'active',
            startAt,
            endAt,
            autoRenew: true,
            platform,
          },
          update: {
            status: 'active',
            endAt,
            autoRenew: true,
          },
        });

        console.log(`[RevenueCat Webhook] Subscription activated: ${userId} -> ${plan}`);
        break;
      }

      case 'CANCELLATION': {
        // Пользователь отключил автопродление
        await prisma.subscription.updateMany({
          where: { userId, plan, status: { in: ['active', 'trial'] } },
          data: { autoRenew: false },
        });
        console.log(`[RevenueCat Webhook] Auto-renew disabled: ${userId} -> ${plan}`);
        break;
      }

      case 'EXPIRATION': {
        // Подписка истекла
        await prisma.subscription.updateMany({
          where: { userId, plan },
          data: { status: 'expired' },
        });
        console.log(`[RevenueCat Webhook] Subscription expired: ${userId} -> ${plan}`);
        break;
      }

      case 'BILLING_ISSUE': {
        // Проблема с оплатой — grace period
        await prisma.subscription.updateMany({
          where: { userId, plan, status: 'active' },
          data: { status: 'grace' },
        });
        console.log(`[RevenueCat Webhook] Billing issue (grace): ${userId} -> ${plan}`);
        break;
      }

      case 'SUBSCRIBER_ALIAS': {
        // Игнорируем alias события
        break;
      }

      default:
        console.log(`[RevenueCat Webhook] Unhandled event type: ${event.type}`);
    }

    // RevenueCat ожидает 200 OK
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[RevenueCat Webhook] Error:', error);
    // Всё равно отвечаем 200, чтобы RevenueCat не ретраил бесконечно
    res.status(200).json({ received: true, error: 'Internal error logged' });
  }
});

export { router as subscriptionsRouter };
