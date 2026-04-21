import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Points values
const POINTS = {
  ATTENDED: 10,
  REVIEW: 3,
  CHALLENGE_COMPLETE: 20,
  LATE_CANCEL_PENALTY: -5, // Penalty for canceling after event start (grace window)
};

// Status keys
type StatusKey = 'started' | 'in_rhythm' | 'habit_forming' | 'stable';

/**
 * Award points to user (idempotent - won't duplicate)
 */
export async function awardPoints(params: {
  userId: string;
  points: number;
  reason: 'attended' | 'review' | 'challenge_complete' | 'late_cancel';
  sourceType: 'event' | 'review' | 'challenge';
  sourceId: string;
}): Promise<boolean> {
  const { userId, points, reason, sourceType, sourceId } = params;

  try {
    // Idempotent: unique constraint will prevent duplicates
    await prisma.pointsLedger.create({
      data: {
        userId,
        points,
        reason,
        sourceType,
        sourceId,
      },
    });
    return true;
  } catch (error: any) {
    // Unique constraint violation - already awarded
    if (error.code === 'P2002') {
      console.log(`[Gamification] Points already awarded: ${reason} for ${sourceType}:${sourceId}`);
      return false;
    }
    throw error;
  }
}

/**
 * Get total points for user
 */
export async function getTotalPoints(userId: string): Promise<number> {
  const result = await prisma.pointsLedger.aggregate({
    where: { userId },
    _sum: { points: true },
  });
  return result._sum.points || 0;
}

/**
 * Get points ledger for user
 */
export async function getPointsLedger(userId: string) {
  return prisma.pointsLedger.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

/**
 * Recalculate and update user status based on their activity
 */
export async function recalculateUserStatus(userId: string): Promise<StatusKey | null> {
  // Get attended count total
  const attendedTotal = await prisma.participation.count({
    where: { userId, status: 'attended' },
  });

  // Get attended count last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const attendedLast30Days = await prisma.participation.count({
    where: {
      userId,
      status: 'attended',
      attendedAt: { gte: thirtyDaysAgo },
    },
  });

  // Check if challenge completed
  const completedChallenge = await prisma.userChallenge.findFirst({
    where: { userId, status: 'completed' },
  });

  // Determine status (priority: habit_forming > in_rhythm > started)
  let newStatus: StatusKey | null = null;

  if (attendedLast30Days >= 4) {
    newStatus = 'habit_forming';
  } else if (completedChallenge) {
    newStatus = 'in_rhythm';
  } else if (attendedTotal >= 1) {
    newStatus = 'started';
  }

  if (!newStatus) {
    return null;
  }

  // Upsert user status
  await prisma.userStatus.upsert({
    where: { userId },
    create: {
      userId,
      statusKey: newStatus,
    },
    update: {
      statusKey: newStatus,
      awardedAt: new Date(),
    },
  });

  return newStatus;
}

/**
 * Get current user status
 */
export async function getUserStatus(userId: string): Promise<{ statusKey: StatusKey; awardedAt: Date } | null> {
  const status = await prisma.userStatus.findUnique({
    where: { userId },
  });
  return status ? { statusKey: status.statusKey as StatusKey, awardedAt: status.awardedAt } : null;
}

/**
 * Ensure challenge "two_in_seven" exists (seed on demand)
 */
export async function ensureTwoInSevenChallenge() {
  return prisma.challenge.upsert({
    where: { key: 'two_in_seven' },
    create: {
      key: 'two_in_seven',
      title: '2 движения за 7 дней',
      description: 'Посети 2 события за 7 дней и получи бонусные баллы!',
      targetCount: 2,
      durationDays: 7,
      rewardPoints: POINTS.CHALLENGE_COMPLETE,
      isActive: true,
    },
    update: {},
  });
}

/**
 * Offer challenge to user if eligible (first attended)
 */
export async function offerTwoInSevenIfNeeded(userId: string): Promise<boolean> {
  // Check if user already has this challenge (any status)
  const existing = await prisma.userChallenge.findFirst({
    where: {
      userId,
      challenge: { key: 'two_in_seven' },
    },
  });

  if (existing) {
    return false; // Already offered/active/completed
  }

  // Ensure challenge exists
  const challenge = await ensureTwoInSevenChallenge();

  // Create offer
  await prisma.userChallenge.create({
    data: {
      userId,
      challengeId: challenge.id,
      status: 'offered',
      progress: 0,
    },
  });

  console.log(`[Gamification] Offered challenge two_in_seven to user ${userId}`);
  return true;
}

/**
 * Accept challenge
 */
export async function acceptChallenge(userId: string, challengeKey: string): Promise<{ success: boolean; error?: string }> {
  const challenge = await prisma.challenge.findUnique({
    where: { key: challengeKey },
  });

  if (!challenge || !challenge.isActive) {
    return { success: false, error: 'Challenge not found or inactive' };
  }

  const userChallenge = await prisma.userChallenge.findFirst({
    where: { userId, challengeId: challenge.id },
  });

  if (!userChallenge) {
    return { success: false, error: 'Challenge not offered to user' };
  }

  if (userChallenge.status !== 'offered') {
    return { success: false, error: `Challenge already ${userChallenge.status}` };
  }

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setDate(endsAt.getDate() + challenge.durationDays);

  await prisma.userChallenge.update({
    where: { id: userChallenge.id },
    data: {
      status: 'active',
      startedAt: now,
      endsAt,
    },
  });

  console.log(`[Gamification] User ${userId} accepted challenge ${challengeKey}`);
  return { success: true };
}

/**
 * Update challenge progress after attendance
 */
export async function updateChallengeProgressFromAttendance(userId: string): Promise<boolean> {
  // Find active challenge
  const userChallenge = await prisma.userChallenge.findFirst({
    where: {
      userId,
      status: 'active',
      endsAt: { gte: new Date() },
    },
    include: { challenge: true },
  });

  if (!userChallenge) {
    return false;
  }

  const newProgress = userChallenge.progress + 1;

  // Check if completed
  if (newProgress >= userChallenge.challenge.targetCount) {
    // Complete challenge
    await prisma.userChallenge.update({
      where: { id: userChallenge.id },
      data: {
        status: 'completed',
        progress: newProgress,
        completedAt: new Date(),
      },
    });

    // Award points for challenge completion
    await awardPoints({
      userId,
      points: userChallenge.challenge.rewardPoints,
      reason: 'challenge_complete',
      sourceType: 'challenge',
      sourceId: userChallenge.challengeId,
    });

    console.log(`[Gamification] User ${userId} completed challenge ${userChallenge.challenge.key}`);
    return true;
  }

  // Just update progress
  await prisma.userChallenge.update({
    where: { id: userChallenge.id },
    data: { progress: newProgress },
  });

  console.log(`[Gamification] User ${userId} challenge progress: ${newProgress}/${userChallenge.challenge.targetCount}`);
  return false;
}

/**
 * Check and pause expired challenges (can be called by cron)
 */
export async function pauseExpiredChallenges(): Promise<number> {
  const result = await prisma.userChallenge.updateMany({
    where: {
      status: 'active',
      endsAt: { lt: new Date() },
    },
    data: { status: 'paused' },
  });
  return result.count;
}

/**
 * Main hook: called when participation is marked as attended
 */
export async function onParticipationAttended(userId: string, eventId: string): Promise<void> {
  // 1. Award points for attendance
  const awarded = await awardPoints({
    userId,
    points: POINTS.ATTENDED,
    reason: 'attended',
    sourceType: 'event',
    sourceId: eventId,
  });

  if (!awarded) {
    // Already processed
    return;
  }

  // 2. Check if this is first attended → offer challenge
  const attendedCount = await prisma.participation.count({
    where: { userId, status: 'attended' },
  });

  if (attendedCount === 1) {
    await offerTwoInSevenIfNeeded(userId);
  }

  // 3. Update challenge progress if active
  await updateChallengeProgressFromAttendance(userId);

  // 4. Recalculate user status
  await recalculateUserStatus(userId);
}

/**
 * Hook: called when review is created
 */
export async function onReviewCreated(userId: string, reviewId: string, eventId: string): Promise<void> {
  await awardPoints({
    userId,
    points: POINTS.REVIEW,
    reason: 'review',
    sourceType: 'review',
    sourceId: reviewId,
  });

  // Optionally recalculate status (reviews don't affect status in current rules)
}

/**
 * Hook: called when user cancels participation after event start (grace window cancel)
 * Applies penalty points for late cancellation
 */
export async function onLateCancelAfterStart(userId: string, eventId: string): Promise<void> {
  await awardPoints({
    userId,
    points: POINTS.LATE_CANCEL_PENALTY,
    reason: 'late_cancel',
    sourceType: 'event',
    sourceId: `cancel_${eventId}`, // unique source to prevent duplicate penalties
  });

  console.log(`[Gamification] Applied late cancel penalty to user ${userId} for event ${eventId}`);
}

/**
 * Get available challenges for user
 */
export async function getAvailableChallenges(userId: string) {
  const challenges = await prisma.challenge.findMany({
    where: { isActive: true },
    include: {
      userChallenges: {
        where: { userId },
      },
    },
  });

  return challenges.map((c) => {
    const userChallenge = c.userChallenges[0];
    return {
      key: c.key,
      title: c.title,
      description: c.description,
      target: c.targetCount,
      durationDays: c.durationDays,
      rewardPoints: c.rewardPoints,
      status: userChallenge?.status || null,
      progress: userChallenge?.progress || 0,
      startedAt: userChallenge?.startedAt || null,
      endsAt: userChallenge?.endsAt || null,
      completedAt: userChallenge?.completedAt || null,
    };
  });
}
