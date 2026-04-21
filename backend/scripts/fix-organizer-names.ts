/**
 * Скрипт для исправления displayName организаторов
 * Заменяет "Организатор" на реальное имя из user.name
 * 
 * Запуск: npx ts-node scripts/fix-organizer-names.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing organizer display names...\n');

  // Найти все профили организаторов с displayName = "Организатор"
  const profiles = await prisma.organizerProfile.findMany({
    where: {
      displayName: 'Организатор',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  console.log(`Found ${profiles.length} organizer(s) with default name "Организатор"\n`);

  let updated = 0;
  let skipped = 0;

  for (const profile of profiles) {
    const user = profile.user;
    
    // Определяем новое имя
    let newName: string | null = null;
    
    if (user.name && user.name.trim()) {
      newName = user.name.trim();
    } else if (user.firstName || user.lastName) {
      newName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    }

    if (newName) {
      await prisma.organizerProfile.update({
        where: { userId: profile.userId },
        data: { displayName: newName },
      });
      console.log(`✅ Updated: ${profile.userId} -> "${newName}"`);
      updated++;
    } else {
      console.log(`⚠️  Skipped: ${profile.userId} (no name in user profile)`);
      skipped++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total:   ${profiles.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
