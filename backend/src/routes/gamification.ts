import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import {
  getTotalPoints,
  getPointsLedger,
  getUserStatus,
  getAvailableChallenges,
  acceptChallenge,
  ensureTwoInSevenChallenge,
} from '../services/gamification';
import { getUserEntitlements } from './subscriptions';

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/me/points - get user's points
router.get('/me/points', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;

    const totalPoints = await getTotalPoints(userId);
    const ledger = await getPointsLedger(userId);

    res.json({
      totalPoints,
      ledger: ledger.map((entry) => ({
        points: entry.points,
        reason: entry.reason,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        createdAt: entry.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[Gamification] GET /me/points error:', error);
    res.status(500).json({ error: 'Failed to get points' });
  }
});

// GET /api/v1/me/status - get user's gamification status
router.get('/me/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;

    const status = await getUserStatus(userId);

    if (!status) {
      return res.json({
        statusKey: null,
        awardedAt: null,
      });
    }

    res.json({
      statusKey: status.statusKey,
      awardedAt: status.awardedAt.toISOString(),
    });
  } catch (error) {
    console.error('[Gamification] GET /me/status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// GET /api/v1/me/stats - get user's activity stats
router.get('/me/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const period = (req.query.period as string) || '30d';

    // Parse period
    let daysBack = 30;
    if (period === '7d') daysBack = 7;
    else if (period === '90d') daysBack = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get attended count in period
    const attendedCount = await prisma.participation.count({
      where: {
        userId,
        status: 'attended',
        attendedAt: { gte: startDate },
      },
    });

    // Get total attended
    const totalAttended = await prisma.participation.count({
      where: { userId, status: 'attended' },
    });

    // Get total points
    const totalPoints = await getTotalPoints(userId);

    // Get current status
    const status = await getUserStatus(userId);

    // Get entitlements to check if user has full stats access
    const entitlements = await getUserEntitlements(userId, req.auth!.role);
    const hasFullStats = entitlements.canUseChallenges; // PRO feature

    res.json({
      period,
      attendedCount,
      totalAttended,
      totalPoints,
      statusKey: status?.statusKey || null,
      hasFullStats,
    });
  } catch (error) {
    console.error('[Gamification] GET /me/stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// GET /api/v1/challenges/available - get available challenges
router.get('/challenges/available', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;

    // Check subscription entitlements
    const entitlements = await getUserEntitlements(userId, req.auth!.role);

    if (!entitlements.canUseChallenges) {
      return res.json({
        challenges: [],
        requiresSubscription: true,
        message: 'Челленджи доступны с подпиской',
      });
    }

    // Ensure default challenge exists
    await ensureTwoInSevenChallenge();

    const challenges = await getAvailableChallenges(userId);

    res.json({
      challenges,
      requiresSubscription: false,
    });
  } catch (error) {
    console.error('[Gamification] GET /challenges/available error:', error);
    res.status(500).json({ error: 'Failed to get challenges' });
  }
});

// POST /api/v1/challenges/:key/accept - accept a challenge
router.post('/challenges/:key/accept', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const { key } = req.params;

    // Check subscription entitlements
    const entitlements = await getUserEntitlements(userId, req.auth!.role);

    if (!entitlements.canUseChallenges) {
      return res.status(403).json({
        error: 'Челленджи доступны только с подпиской',
        requiresSubscription: true,
      });
    }

    const result = await acceptChallenge(userId, key);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: 'Челлендж принят!' });
  } catch (error) {
    console.error('[Gamification] POST /challenges/:key/accept error:', error);
    res.status(500).json({ error: 'Failed to accept challenge' });
  }
});

export { router as gamificationRouter };
