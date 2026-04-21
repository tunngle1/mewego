import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/users/:id/profile - публичный профиль пользователя
router.get('/:id/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const viewerId = req.auth?.userId;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        publicId: true,
        name: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        gender: true,
        cityId: true,
        activityLevel: true,
        interests: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Получаем статистику участий
    const participationStats = await prisma.participation.groupBy({
      by: ['status'],
      where: { userId: id },
      _count: true,
    });

    const statsMap: Record<string, number> = {};
    participationStats.forEach((s) => {
      statsMap[s.status] = s._count;
    });

    const totalEvents = Object.values(statsMap).reduce((a, b) => a + b, 0);
    const attendedCount = statsMap['attended'] || 0;
    const joinedCount = statsMap['joined'] || 0;

    // Вычисляем серию (streak) - последовательные недели с посещениями
    const recentAttendances = await prisma.participation.findMany({
      where: {
        userId: id,
        status: 'attended',
        attendedAt: { not: null },
      },
      orderBy: { attendedAt: 'desc' },
      take: 20,
      select: { attendedAt: true },
    });

    let streak = 0;
    if (recentAttendances.length > 0) {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const hasRecentActivity = recentAttendances.some(
        (a) => a.attendedAt && a.attendedAt >= oneWeekAgo
      );
      if (hasRecentActivity) {
        streak = Math.min(recentAttendances.length, 10); // Simplified streak calculation
      }
    }

    // Получаем любимые категории
    const categoryStats = await prisma.participation.findMany({
      where: {
        userId: id,
        status: { in: ['joined', 'attended'] },
      },
      include: {
        event: {
          select: { movementType: true },
        },
      },
    });

    const categoryCounts: Record<string, number> = {};
    categoryStats.forEach((p) => {
      const cat = p.event.movementType;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const favoriteCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    // Получаем недавнюю активность (последние события)
    const recentActivity = await prisma.participation.findMany({
      where: {
        userId: id,
        status: { in: ['joined', 'attended'] },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            movementType: true,
            startAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      take: 5,
    });

    // Получаем отзывы пользователя
    const reviews = await prisma.review.findMany({
      where: { userId: id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Проверяем, свой ли это профиль
    const isOwnProfile = viewerId === id;

    // Формируем ответ
    const profile = {
      id: user.id,
      publicId: user.publicId,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Участник',
      avatarUrl: user.avatarUrl,
      city: user.cityId,
      activityLevel: user.activityLevel,
      interests: user.interests || [],
      memberSince: user.createdAt.toISOString(),
      lastActive: user.lastActiveAt.toISOString(),
      isOwnProfile,
      stats: {
        totalEvents,
        attendedCount,
        joinedCount,
        attendanceRate: totalEvents > 0 ? Math.round((attendedCount / totalEvents) * 100) : 0,
        streak,
      },
      favoriteCategories,
      recentActivity: recentActivity.map((a) => ({
        eventId: a.event.id,
        eventTitle: a.event.title,
        category: a.event.movementType,
        date: a.event.startAt.toISOString(),
        status: a.status,
      })),
      reviews: reviews.map((r) => ({
        id: r.id,
        eventId: r.event.id,
        eventTitle: r.event.title,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
    };

    res.json(profile);
  } catch (error) {
    console.error('[Users] GET /:id/profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

export const usersRouter = router;
