/**
 * Скрипт для выдачи подписки пользователю
 * 
 * Использование:
 *   node scripts/grant-subscription.js <telegramId> <plan>
 * 
 * Примеры:
 *   node scripts/grant-subscription.js 414153884 organizer_999
 *   node scripts/grant-subscription.js 414153884 user_349
 * 
 * Планы:
 *   - organizer_999 — подписка организатора (платные события, CRM, статистика)
 *   - user_349 — подписка пользователя (челленджи, лист ожидания)
 */

const { PrismaClient } = require('@prisma/client');

const PLANS = {
  organizer_999: {
    name: 'Организатор',
    duration: 365, // дней
  },
  user_349: {
    name: 'Пользователь',
    duration: 30, // дней
  },
};

async function main() {
  const [,, telegramId, plan = 'organizer_999'] = process.argv;

  if (!telegramId) {
    console.log('❌ Укажи telegramId пользователя');
    console.log('');
    console.log('Использование:');
    console.log('  node scripts/grant-subscription.js <telegramId> <plan>');
    console.log('');
    console.log('Планы:');
    console.log('  - organizer_999 — подписка организатора');
    console.log('  - user_349 — подписка пользователя');
    console.log('');
    console.log('Пример:');
    console.log('  node scripts/grant-subscription.js 414153884 organizer_999');
    process.exit(1);
  }

  if (!PLANS[plan]) {
    console.log(`❌ Неизвестный план: ${plan}`);
    console.log('Доступные планы: organizer_999, user_349');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    // Ищем пользователя
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { telegramId: telegramId },
          { telegramId: `${telegramId}` },
          { id: telegramId },
          { id: `tg-${telegramId}` },
        ],
      },
    });

    if (!user) {
      console.log(`❌ Пользователь с telegramId=${telegramId} не найден`);
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log('');
    console.log('👤 Пользователь найден:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Telegram: ${user.telegramId}`);
    console.log(`   Имя: ${user.name || user.firstName || '—'}`);
    console.log(`   Роль: ${user.role}`);
    console.log('');

    // Проверяем существующие подписки
    const existingSubs = await prisma.subscription.findMany({
      where: { userId: user.id, status: 'active' },
    });

    if (existingSubs.length > 0) {
      console.log('📋 Текущие активные подписки:');
      for (const sub of existingSubs) {
        console.log(`   - ${sub.plan} (до ${sub.endAt.toLocaleDateString('ru-RU')})`);
      }
      console.log('');
    }

    // Создаём подписку
    const planInfo = PLANS[plan];
    const startAt = new Date();
    const endAt = new Date(Date.now() + planInfo.duration * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: plan,
        status: 'active',
        startAt,
        endAt,
        autoRenew: false,
      },
    });

    console.log('✅ Подписка выдана!');
    console.log(`   План: ${plan} (${planInfo.name})`);
    console.log(`   Начало: ${startAt.toLocaleDateString('ru-RU')}`);
    console.log(`   Окончание: ${endAt.toLocaleDateString('ru-RU')}`);
    console.log(`   ID подписки: ${subscription.id}`);
    console.log('');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
