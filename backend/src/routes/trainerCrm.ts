import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const DEFAULT_CURRENCY = 'RUB';
const VALID_SESSION_TYPES = new Set(['personal', 'group']);
const VALID_SESSION_VISIBILITY = new Set(['public', 'private', 'crm_only']);
const VALID_SESSION_STATUS = new Set(['draft', 'scheduled', 'confirmed', 'completed', 'cancelled_by_trainer', 'cancelled_by_client', 'cancelled', 'no_show']);
const VALID_PARTICIPANT_STATUS = new Set(['booked', 'confirmed', 'attended', 'late_cancelled', 'cancelled', 'no_show', 'waitlisted', 'offered_from_waitlist']);
const VALID_PAYMENT_STATUS = new Set(['unpaid', 'partially_paid', 'paid', 'refunded', 'waived']);
const VALID_PACKAGE_KIND = new Set(['package', 'membership', 'drop_in', 'trial', 'complimentary']);
const VALID_PACKAGE_STATUS = new Set(['draft', 'active', 'paused', 'expired', 'cancelled', 'completed']);
const VALID_CLIENT_STATUS = new Set(['lead', 'active', 'inactive', 'paused', 'archived']);
const VALID_TASK_STATUS = new Set(['open', 'done', 'cancelled']);
const VALID_TASK_PRIORITY = new Set(['low', 'medium', 'high']);
const VALID_NOTE_TYPES = new Set(['general', 'goal', 'health', 'progress', 'follow_up', 'payment']);
const VALID_NOTE_VISIBILITY = new Set(['private']);
const CAPACITY_OCCUPYING_PARTICIPANT_STATUSES = ['booked', 'confirmed', 'attended', 'offered_from_waitlist'] as const;
const CAPACITY_OCCUPYING_PARTICIPANT_STATUS_SET = new Set<string>(CAPACITY_OCCUPYING_PARTICIPANT_STATUSES);
const CANCELLED_SESSION_STATUSES = ['cancelled', 'cancelled_by_trainer', 'cancelled_by_client'] as const;

const parseDate = (value: any): Date | null => {
  if (!value || typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const asArray = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const normalizeEnum = (value: any, allowed: Set<string>, fallback?: string): string | null => {
  if (typeof value !== 'string' || !value.trim()) return fallback ?? null;
  const normalized = value.trim();
  return allowed.has(normalized) ? normalized : null;
};

const parsePositiveInt = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round(parsed));
};

const hasOwn = (value: unknown, key: string) =>
  Boolean(value) && Object.prototype.hasOwnProperty.call(value as Record<string, unknown>, key);

const participantOccupiesCapacity = (status: string | null | undefined) => {
  if (!status) return false;
  return CAPACITY_OCCUPYING_PARTICIPANT_STATUS_SET.has(status);
};

const toEventPriceValue = (priceMinor: number | null | undefined) => {
  if (typeof priceMinor !== 'number') return null;
  return Math.round(priceMinor / 100);
};

const getParticipantTimestamp = (participant: any) => {
  const value = participant.updatedAt || participant.bookedAt || participant.createdAt;
  return value instanceof Date ? value.getTime() : 0;
};

const getParticipantIdentityScore = (participant: any) => {
  let score = 0;
  if (participant.clientId) score += 4;
  if (participant.userId) score += 4;
  if (participant.amountPaidMinor > 0) score += 1;
  if (participantOccupiesCapacity(participant.status)) score += 1;
  return score;
};

const compareParticipantsByIdentityPriority = (a: any, b: any) => {
  const scoreDiff = getParticipantIdentityScore(b) - getParticipantIdentityScore(a);
  if (scoreDiff !== 0) return scoreDiff;
  return getParticipantTimestamp(b) - getParticipantTimestamp(a);
};

const dedupeParticipantsByIdentity = <T extends { clientId?: string | null; userId?: string | null; bookedAt?: Date | null; createdAt?: Date | null; updatedAt?: Date | null }>(participants: T[]) => {
  const seenClientIds = new Set<string>();
  const seenUserIds = new Set<string>();
  const unique: T[] = [];

  for (const participant of [...participants].sort(compareParticipantsByIdentityPriority)) {
    if ((participant.clientId && seenClientIds.has(participant.clientId)) || (participant.userId && seenUserIds.has(participant.userId))) {
      continue;
    }

    if (participant.clientId) seenClientIds.add(participant.clientId);
    if (participant.userId) seenUserIds.add(participant.userId);
    unique.push(participant);
  }

  return unique.sort((a, b) => {
    const left = a.bookedAt instanceof Date ? a.bookedAt.getTime() : a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
    const right = b.bookedAt instanceof Date ? b.bookedAt.getTime() : b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
    return left - right;
  });
};

const resolveParticipantStatusForCapacity = async (
  session: { id: string; capacity?: number | null; waitlistEnabled: boolean },
  requestedStatus: string,
  excludedParticipantIds: string[] = [],
) => {
  if (!participantOccupiesCapacity(requestedStatus) || !session.capacity || session.capacity <= 0) {
    return { ok: true as const, status: requestedStatus };
  }

  const occupiedCount = await prisma.trainerSessionParticipant.count({
    where: {
      sessionId: session.id,
      status: { in: [...CAPACITY_OCCUPYING_PARTICIPANT_STATUSES] },
      ...(excludedParticipantIds.length ? { id: { notIn: excludedParticipantIds } } : {}),
    },
  });

  if (occupiedCount < session.capacity) {
    return { ok: true as const, status: requestedStatus };
  }

  if (session.waitlistEnabled) {
    return { ok: true as const, status: 'waitlisted' };
  }

  return { ok: false as const, status: requestedStatus };
};

const findSessionParticipantsByIdentity = (sessionId: string, clientId: string, userId?: string | null) => {
  const orConditions: Array<Record<string, string>> = [{ clientId }];
  if (userId) {
    orConditions.push({ userId });
  }

  return prisma.trainerSessionParticipant.findMany({
    where: {
      sessionId,
      OR: orConditions,
    },
  });
};

const getEffectiveSessionEndAt = (startAt: Date, durationMin: number, endAt?: Date | null) => {
  return endAt ?? new Date(startAt.getTime() + durationMin * 60 * 1000);
};

const validateSessionSchedule = async (params: {
  trainerId: string;
  startAt: Date;
  durationMin: number;
  endAt?: Date | null;
  type: string;
  capacity?: number | null;
  excludeSessionId?: string;
}) => {
  const { trainerId, startAt, durationMin, endAt, type, capacity, excludeSessionId } = params;

  if (!durationMin || durationMin <= 0) {
    return { ok: false as const, statusCode: 400, error: 'Valid durationMin is required' };
  }
  if (type === 'personal' && typeof capacity === 'number' && capacity > 1) {
    return { ok: false as const, statusCode: 400, error: 'Personal session cannot have capacity > 1' };
  }

  const effectiveEndAt = getEffectiveSessionEndAt(startAt, durationMin, endAt);
  if (effectiveEndAt.getTime() <= startAt.getTime()) {
    return { ok: false as const, statusCode: 400, error: 'Session endAt must be after startAt' };
  }

  const candidateSessions = await prisma.trainerSession.findMany({
    where: {
      trainerId,
      status: { notIn: [...CANCELLED_SESSION_STATUSES] },
      ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
      startAt: { lt: effectiveEndAt },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      durationMin: true,
    },
  });

  const conflictingSession = candidateSessions.find((session) => {
    const sessionEndAt = getEffectiveSessionEndAt(session.startAt, session.durationMin, session.endAt);
    return sessionEndAt.getTime() > startAt.getTime();
  });

  if (conflictingSession) {
    return {
      ok: false as const,
      statusCode: 409,
      error: 'Schedule conflict',
      conflictingSessionId: conflictingSession.id,
    };
  }

  return {
    ok: true as const,
    effectiveEndAt,
  };
};

const derivePackageStatus = (params: {
  requestedStatus: string;
  sessionsIncluded: number | null;
  sessionsRemaining: number;
  endsAt: Date | null;
}) => {
  const { requestedStatus, sessionsIncluded, sessionsRemaining, endsAt } = params;

  if (requestedStatus === 'draft' || requestedStatus === 'paused' || requestedStatus === 'cancelled') {
    return requestedStatus;
  }
  if (endsAt && endsAt.getTime() < Date.now()) {
    return 'expired';
  }
  if (typeof sessionsIncluded === 'number' && sessionsRemaining <= 0) {
    return 'completed';
  }
  return 'active';
};

const normalizePackageState = (params: {
  sessionsIncluded: number | null;
  sessionsUsed?: number | null;
  sessionsRemaining?: number | null;
  endsAt: Date | null;
  requestedStatus: string;
}) => {
  const sessionsIncluded = params.sessionsIncluded;
  let sessionsUsed = params.sessionsUsed ?? 0;
  let sessionsRemaining = params.sessionsRemaining;

  if (typeof sessionsIncluded === 'number') {
    if (sessionsRemaining === null || sessionsRemaining === undefined) {
      sessionsRemaining = Math.max(sessionsIncluded - sessionsUsed, 0);
    }
    if (params.sessionsUsed === null || params.sessionsUsed === undefined) {
      sessionsUsed = sessionsIncluded - sessionsRemaining;
    }

    if (sessionsRemaining > sessionsIncluded) {
      return { ok: false as const, error: 'sessionsRemaining cannot exceed sessionsIncluded' };
    }
    if (sessionsUsed > sessionsIncluded) {
      return { ok: false as const, error: 'sessionsUsed cannot exceed sessionsIncluded' };
    }
    if (sessionsUsed + sessionsRemaining !== sessionsIncluded) {
      return { ok: false as const, error: 'sessionsUsed plus sessionsRemaining must equal sessionsIncluded' };
    }
  } else {
    sessionsUsed = sessionsUsed ?? 0;
    sessionsRemaining = sessionsRemaining ?? 0;
  }

  return {
    ok: true as const,
    sessionsIncluded,
    sessionsUsed,
    sessionsRemaining: sessionsRemaining ?? 0,
    status: derivePackageStatus({
      requestedStatus: params.requestedStatus,
      sessionsIncluded,
      sessionsRemaining: sessionsRemaining ?? 0,
      endsAt: params.endsAt,
    }),
  };
};

const ensureTrainerAccess = async (trainerId: string) => {
  await prisma.user.upsert({
    where: { id: trainerId },
    update: { lastActiveAt: new Date() },
    create: {
      id: trainerId,
      role: 'organizer',
      name: 'Trainer',
    },
  });
};

const serializeClient = (client: any) => ({
  id: client.id,
  trainerId: client.trainerId,
  userId: client.userId,
  fullName: client.fullName,
  phone: client.phone,
  telegramHandle: client.telegramHandle,
  email: client.email,
  city: client.city,
  birthDate: client.birthDate?.toISOString(),
  gender: client.gender,
  status: client.status,
  source: client.source,
  goals: client.goals,
  medicalNotes: client.medicalNotes,
  privateNotes: client.privateNotes,
  tags: client.tags || [],
  lastSessionAt: client.lastSessionAt?.toISOString(),
  nextSessionAt: client.nextSessionAt?.toISOString(),
  sessionsCompletedCount: client.sessionsCompletedCount,
  noShowCount: client.noShowCount,
  cancelledCount: client.cancelledCount,
  lifetimeValueMinor: client.lifetimeValueMinor,
  currency: client.currency || DEFAULT_CURRENCY,
  archivedAt: client.archivedAt?.toISOString(),
  createdAt: client.createdAt?.toISOString(),
  updatedAt: client.updatedAt?.toISOString(),
  linkedUser: client.user
    ? {
        id: client.user.id,
        publicId: client.user.publicId,
        name: client.user.name,
        avatarUrl: client.user.avatarUrl,
        telegramId: client.user.telegramId,
      }
    : null,
  stats: client._count
    ? {
        packagesCount: client._count.packages || 0,
        notesCount: client._count.notes || 0,
        tasksCount: client._count.tasks || 0,
        participationsCount: client._count.participants || 0,
      }
    : undefined,
});

const serializeSessionParticipant = (participant: any) => ({
  id: participant.id,
  sessionId: participant.sessionId,
  clientId: participant.clientId,
  userId: participant.userId,
  status: participant.status,
  paymentStatus: participant.paymentStatus,
  priceMinor: participant.priceMinor,
  amountPaidMinor: participant.amountPaidMinor,
  bookedAt: participant.bookedAt?.toISOString(),
  confirmedAt: participant.confirmedAt?.toISOString(),
  attendedAt: participant.attendedAt?.toISOString(),
  cancelledAt: participant.cancelledAt?.toISOString(),
  cancellationReason: participant.cancellationReason,
  note: participant.note,
  attendanceMarkedBy: participant.attendanceMarkedBy,
  createdAt: participant.createdAt?.toISOString(),
  updatedAt: participant.updatedAt?.toISOString(),
  client: participant.client ? serializeClient(participant.client) : null,
  user: participant.user
    ? {
        id: participant.user.id,
        publicId: participant.user.publicId,
        name: participant.user.name,
        avatarUrl: participant.user.avatarUrl,
      }
    : null,
});

const serializeSession = (session: any) => ({
  id: session.id,
  trainerId: session.trainerId,
  linkedEventId: session.linkedEventId,
  type: session.type,
  visibility: session.visibility,
  title: session.title,
  description: session.description,
  discipline: session.discipline,
  format: session.format,
  locationName: session.locationName,
  locationAddress: session.locationAddress,
  onlineUrl: session.onlineUrl,
  startAt: session.startAt?.toISOString(),
  endAt: session.endAt?.toISOString(),
  durationMin: session.durationMin,
  capacity: session.capacity,
  waitlistEnabled: session.waitlistEnabled,
  priceMinor: session.priceMinor,
  currency: session.currency || DEFAULT_CURRENCY,
  paymentNote: session.paymentNote,
  status: session.status,
  isRecurringTemplate: session.isRecurringTemplate,
  recurrenceRule: session.recurrenceRule,
  parentSeriesId: session.parentSeriesId,
  bufferBeforeMin: session.bufferBeforeMin,
  bufferAfterMin: session.bufferAfterMin,
  cancelledAt: session.cancelledAt?.toISOString(),
  cancelledReason: session.cancelledReason,
  createdAt: session.createdAt?.toISOString(),
  updatedAt: session.updatedAt?.toISOString(),
  linkedEvent: session.linkedEvent
    ? {
        id: session.linkedEvent.id,
        title: session.linkedEvent.title,
        status: session.linkedEvent.status,
        visibility: session.linkedEvent.visibility,
        startAt: session.linkedEvent.startAt?.toISOString(),
      }
    : null,
  stats: session._count
    ? {
        participantsCount: session._count.participants || 0,
        notesCount: session._count.notes || 0,
      }
    : undefined,
  participants: Array.isArray(session.participants)
    ? dedupeParticipantsByIdentity(session.participants).map(serializeSessionParticipant)
    : undefined,
});

const serializePackage = (pkg: any) => ({
  id: pkg.id,
  trainerId: pkg.trainerId,
  clientId: pkg.clientId,
  title: pkg.title,
  kind: pkg.kind,
  discipline: pkg.discipline,
  sessionsIncluded: pkg.sessionsIncluded,
  sessionsUsed: pkg.sessionsUsed,
  sessionsRemaining: pkg.sessionsRemaining,
  startsAt: pkg.startsAt?.toISOString(),
  endsAt: pkg.endsAt?.toISOString(),
  freezeDaysRemaining: pkg.freezeDaysRemaining,
  priceMinor: pkg.priceMinor,
  currency: pkg.currency,
  paymentStatus: pkg.paymentStatus,
  status: pkg.status,
  notes: pkg.notes,
  createdAt: pkg.createdAt?.toISOString(),
  updatedAt: pkg.updatedAt?.toISOString(),
  client: pkg.client ? serializeClient(pkg.client) : null,
  usageCount: pkg._count?.usages,
});

const serializeNote = (note: any) => ({
  id: note.id,
  trainerId: note.trainerId,
  clientId: note.clientId,
  sessionId: note.sessionId,
  type: note.type,
  title: note.title,
  content: note.content,
  visibility: note.visibility,
  createdBy: note.createdBy,
  createdAt: note.createdAt?.toISOString(),
  updatedAt: note.updatedAt?.toISOString(),
});

const serializeTask = (task: any) => ({
  id: task.id,
  trainerId: task.trainerId,
  clientId: task.clientId,
  sessionId: task.sessionId,
  title: task.title,
  description: task.description,
  dueAt: task.dueAt?.toISOString(),
  status: task.status,
  priority: task.priority,
  completedAt: task.completedAt?.toISOString(),
  createdAt: task.createdAt?.toISOString(),
  updatedAt: task.updatedAt?.toISOString(),
  client: task.client ? serializeClient(task.client) : null,
  session: task.session ? serializeSession(task.session) : null,
});

const logAudit = async (trainerId: string, actorUserId: string, entityType: string, entityId: string, action: string, beforeJson?: any, afterJson?: any) => {
  await prisma.trainerAuditLog.create({
    data: {
      trainerId,
      actorUserId,
      entityType,
      entityId,
      action,
      beforeJson: beforeJson ? JSON.stringify(beforeJson) : null,
      afterJson: afterJson ? JSON.stringify(afterJson) : null,
    },
  }).catch(() => {});
};

const refreshClientMetrics = async (trainerId: string, clientId: string) => {
  const client = await prisma.trainerClient.findFirst({
    where: { id: clientId, trainerId },
    include: {
      participants: true,
      packages: true,
    },
  });

  if (!client) return null;

  const completed = client.participants.filter((item) => item.status === 'attended').length;
  const cancelled = client.participants.filter((item) => item.status === 'cancelled' || item.status === 'late_cancelled').length;
  const noShow = client.participants.filter((item) => item.status === 'no_show').length;
  const paidAmount = client.participants.reduce((sum, item) => sum + (item.amountPaidMinor || 0), 0);

  const nextSession = await prisma.trainerSessionParticipant.findFirst({
    where: {
      clientId,
      session: {
        trainerId,
        startAt: { gte: new Date() },
        status: { in: ['scheduled', 'confirmed'] },
      },
    },
    include: { session: true },
    orderBy: { session: { startAt: 'asc' } },
  });

  const lastSession = await prisma.trainerSessionParticipant.findFirst({
    where: {
      clientId,
      session: { trainerId },
      status: 'attended',
    },
    include: { session: true },
    orderBy: { attendedAt: 'desc' },
  });

  return prisma.trainerClient.update({
    where: { id: clientId },
    data: {
      sessionsCompletedCount: completed,
      cancelledCount: cancelled,
      noShowCount: noShow,
      lifetimeValueMinor: paidAmount,
      nextSessionAt: nextSession?.session.startAt || null,
      lastSessionAt: lastSession?.attendedAt || lastSession?.session.startAt || null,
    },
  });
};

const ensureTrainerClient = async (trainerId: string, payload: { clientId?: string | null; userId?: string | null; fullName?: string | null; phone?: string | null; telegramHandle?: string | null; email?: string | null; }) => {
  if (payload.clientId) {
    const existing = await prisma.trainerClient.findFirst({
      where: { id: payload.clientId, trainerId },
    });
    if (!existing) {
      throw new Error('Client not found');
    }
    return existing;
  }

  if (payload.userId) {
    const linkedUser = await prisma.user.findUnique({ where: { id: payload.userId } });
    const fullName = payload.fullName || linkedUser?.name || 'Client';
    return prisma.trainerClient.upsert({
      where: {
        trainerId_userId: {
          trainerId,
          userId: payload.userId,
        },
      },
      update: {
        fullName,
        phone: payload.phone ?? undefined,
        telegramHandle: payload.telegramHandle ?? undefined,
        email: payload.email ?? undefined,
      },
      create: {
        trainerId,
        userId: payload.userId,
        fullName,
        phone: payload.phone || null,
        telegramHandle: payload.telegramHandle || linkedUser?.telegramId || null,
        email: payload.email || null,
        status: 'active',
        source: 'manual',
        tags: [],
      },
    });
  }

  if (payload.fullName) {
    return prisma.trainerClient.create({
      data: {
        trainerId,
        fullName: payload.fullName,
        phone: payload.phone || null,
        telegramHandle: payload.telegramHandle || null,
        email: payload.email || null,
        status: 'active',
        source: 'manual',
        tags: [],
      },
    });
  }

  throw new Error('clientId, userId or fullName is required');
};

router.use(requireAuth, requireRole('organizer', 'admin', 'superadmin'));
router.use(async (req: Request, _res: Response, next) => {
  await ensureTrainerAccess(req.auth!.userId);
  next();
});

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [todaySessions, nextSessions, activeClientsCount, unpaidParticipantsCount, packageExpiringCount, overdueTasksCount, totalSessionsCount, completedSessionsCount, revenueAgg] = await Promise.all([
      prisma.trainerSession.findMany({
        where: { trainerId, startAt: { gte: new Date(now.setHours(0, 0, 0, 0)), lte: endOfDay } },
        orderBy: { startAt: 'asc' },
        take: 10,
        include: { _count: { select: { participants: true } } },
      }),
      prisma.trainerSession.findMany({
        where: { trainerId, startAt: { gt: endOfDay, lte: inSevenDays }, status: { in: ['scheduled', 'confirmed'] } },
        orderBy: { startAt: 'asc' },
        take: 10,
        include: { _count: { select: { participants: true } } },
      }),
      prisma.trainerClient.count({ where: { trainerId, archivedAt: null, status: { in: ['lead', 'active', 'paused'] } } }),
      prisma.trainerSessionParticipant.count({ where: { session: { trainerId }, paymentStatus: { in: ['unpaid', 'partially_paid'] } } }),
      prisma.trainerPackage.count({ where: { trainerId, status: 'active', endsAt: { gte: new Date(), lte: inSevenDays } } }),
      prisma.trainerTask.count({ where: { trainerId, status: 'open', dueAt: { not: null, lt: new Date() } } }),
      prisma.trainerSession.count({ where: { trainerId } }),
      prisma.trainerSession.count({ where: { trainerId, status: 'completed' } }),
      prisma.trainerSessionParticipant.aggregate({ where: { session: { trainerId } }, _sum: { amountPaidMinor: true } }),
    ]);

    res.json({
      todaySessions: todaySessions.map(serializeSession),
      nextSessions: nextSessions.map(serializeSession),
      stats: {
        activeClientsCount,
        unpaidParticipantsCount,
        packageExpiringCount,
        totalSessionsCount,
        completedSessionsCount,
        recordedRevenueMinor: revenueAgg._sum.amountPaidMinor || 0,
      },
      alerts: {
        hasOverdueTasks: overdueTasksCount > 0,
        hasUnpaidParticipants: unpaidParticipantsCount > 0,
        hasExpiringPackages: packageExpiringCount > 0,
      },
    });
  } catch (error) {
    console.error('[TrainerCRM] GET /dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

router.get('/clients', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const { q, status, source, tag, archived, limit = '50', cursor } = req.query;
    const take = Math.min(parsePositiveInt(limit) || 50, 100);

    const where: any = { trainerId };
    if (typeof q === 'string' && q.trim()) {
      where.OR = [
        { fullName: { contains: q.trim(), mode: 'insensitive' } },
        { phone: { contains: q.trim(), mode: 'insensitive' } },
        { telegramHandle: { contains: q.trim(), mode: 'insensitive' } },
        { email: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }
    if (typeof status === 'string' && status.trim()) where.status = status.trim();
    if (typeof source === 'string' && source.trim()) where.source = source.trim();
    if (typeof tag === 'string' && tag.trim()) where.tags = { has: tag.trim() };
    if (archived === 'true') where.archivedAt = { not: null };
    if (archived === 'false') where.archivedAt = null;
    if (typeof cursor === 'string' && cursor.trim()) where.id = { lt: cursor.trim() };

    const clients = await prisma.trainerClient.findMany({
      where,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } },
        _count: { select: { participants: true, packages: true, notes: true, tasks: true } },
      },
    });

    res.json({
      items: clients.map(serializeClient),
      nextCursor: clients.length === take ? clients[clients.length - 1].id : null,
    });
  } catch (error) {
    console.error('[TrainerCRM] GET /clients error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

router.post('/clients', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const tags = asArray(req.body.tags);
    const status = normalizeEnum(req.body.status, VALID_CLIENT_STATUS, 'active') || 'active';
    const source = typeof req.body.source === 'string' && req.body.source.trim() ? req.body.source.trim() : 'manual';
    const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';

    if (!fullName) {
      return res.status(400).json({ error: 'fullName is required' });
    }

    const client = await prisma.trainerClient.create({
      data: {
        trainerId,
        userId: typeof req.body.userId === 'string' && req.body.userId.trim() ? req.body.userId.trim() : null,
        fullName,
        phone: typeof req.body.phone === 'string' ? req.body.phone.trim() : null,
        telegramHandle: typeof req.body.telegramHandle === 'string' ? req.body.telegramHandle.trim() : null,
        email: typeof req.body.email === 'string' ? req.body.email.trim() : null,
        city: typeof req.body.city === 'string' ? req.body.city.trim() : null,
        birthDate: parseDate(req.body.birthDate),
        gender: typeof req.body.gender === 'string' ? req.body.gender.trim() : null,
        status,
        source,
        goals: typeof req.body.goals === 'string' ? req.body.goals.trim() : null,
        medicalNotes: typeof req.body.medicalNotes === 'string' ? req.body.medicalNotes.trim() : null,
        privateNotes: typeof req.body.privateNotes === 'string' ? req.body.privateNotes.trim() : null,
        tags,
        currency: typeof req.body.currency === 'string' && req.body.currency.trim() ? req.body.currency.trim() : DEFAULT_CURRENCY,
      },
      include: {
        user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } },
        _count: { select: { participants: true, packages: true, notes: true, tasks: true } },
      },
    });

    await logAudit(trainerId, trainerId, 'trainer_client', client.id, 'create', null, { fullName: client.fullName, status: client.status });
    res.status(201).json(serializeClient(client));
  } catch (error) {
    console.error('[TrainerCRM] POST /clients error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

router.get('/clients/:id', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const client = await prisma.trainerClient.findFirst({
      where: { id: req.params.id, trainerId },
      include: {
        user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } },
        _count: { select: { participants: true, packages: true, notes: true, tasks: true } },
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(serializeClient(client));
  } catch (error) {
    console.error('[TrainerCRM] GET /clients/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

router.patch('/clients/:id', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const existing = await prisma.trainerClient.findFirst({ where: { id: req.params.id, trainerId } });
    if (!existing) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const nextStatus = req.body.status === undefined ? existing.status : normalizeEnum(req.body.status, VALID_CLIENT_STATUS);
    if (req.body.status !== undefined && !nextStatus) {
      return res.status(400).json({ error: 'Invalid client status' });
    }

    const client = await prisma.trainerClient.update({
      where: { id: existing.id },
      data: {
        fullName: typeof req.body.fullName === 'string' ? req.body.fullName.trim() : undefined,
        phone: typeof req.body.phone === 'string' ? req.body.phone.trim() : req.body.phone === null ? null : undefined,
        telegramHandle: typeof req.body.telegramHandle === 'string' ? req.body.telegramHandle.trim() : req.body.telegramHandle === null ? null : undefined,
        email: typeof req.body.email === 'string' ? req.body.email.trim() : req.body.email === null ? null : undefined,
        city: typeof req.body.city === 'string' ? req.body.city.trim() : req.body.city === null ? null : undefined,
        birthDate: req.body.birthDate !== undefined ? parseDate(req.body.birthDate) : undefined,
        gender: typeof req.body.gender === 'string' ? req.body.gender.trim() : req.body.gender === null ? null : undefined,
        status: nextStatus || undefined,
        source: typeof req.body.source === 'string' ? req.body.source.trim() : undefined,
        goals: typeof req.body.goals === 'string' ? req.body.goals.trim() : req.body.goals === null ? null : undefined,
        medicalNotes: typeof req.body.medicalNotes === 'string' ? req.body.medicalNotes.trim() : req.body.medicalNotes === null ? null : undefined,
        privateNotes: typeof req.body.privateNotes === 'string' ? req.body.privateNotes.trim() : req.body.privateNotes === null ? null : undefined,
        tags: req.body.tags !== undefined ? asArray(req.body.tags) : undefined,
        archivedAt: nextStatus === 'archived' ? new Date() : req.body.archivedAt === null ? null : undefined,
      },
      include: {
        user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } },
        _count: { select: { participants: true, packages: true, notes: true, tasks: true } },
      },
    });

    await logAudit(trainerId, trainerId, 'trainer_client', client.id, 'update', existing, { fullName: client.fullName, status: client.status });
    res.json(serializeClient(client));
  } catch (error) {
    console.error('[TrainerCRM] PATCH /clients/:id error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

router.post('/clients/:id/archive', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const client = await prisma.trainerClient.findFirst({ where: { id: req.params.id, trainerId } });
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const updated = await prisma.trainerClient.update({
      where: { id: client.id },
      data: { status: 'archived', archivedAt: new Date() },
      include: {
        user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } },
        _count: { select: { participants: true, packages: true, notes: true, tasks: true } },
      },
    });

    await logAudit(trainerId, trainerId, 'trainer_client', client.id, 'archive', { status: client.status }, { status: updated.status });
    res.json(serializeClient(updated));
  } catch (error) {
    console.error('[TrainerCRM] POST /clients/:id/archive error:', error);
    res.status(500).json({ error: 'Failed to archive client' });
  }
});

router.get('/clients/:id/history', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const client = await prisma.trainerClient.findFirst({ where: { id: req.params.id, trainerId } });
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const [participants, packages, notes] = await Promise.all([
      prisma.trainerSessionParticipant.findMany({
        where: { clientId: client.id, session: { trainerId } },
        orderBy: { bookedAt: 'desc' },
        include: {
          session: { include: { _count: { select: { participants: true } } } },
          client: true,
          user: { select: { id: true, publicId: true, name: true, avatarUrl: true } },
        },
      }),
      prisma.trainerPackage.findMany({
        where: { clientId: client.id, trainerId },
        orderBy: { createdAt: 'desc' },
        include: { client: true, _count: { select: { usages: true } } },
      }),
      prisma.trainerClientNote.findMany({
        where: { clientId: client.id, trainerId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      clientId: client.id,
      sessions: participants.map((item) => ({
        ...serializeSessionParticipant(item),
        session: item.session ? serializeSession(item.session) : null,
      })),
      packages: packages.map(serializePackage),
      notes: notes.map(serializeNote),
      summary: {
        sessionsCompletedCount: client.sessionsCompletedCount,
        cancelledCount: client.cancelledCount,
        noShowCount: client.noShowCount,
        lifetimeValueMinor: client.lifetimeValueMinor,
      },
    });
  } catch (error) {
    console.error('[TrainerCRM] GET /clients/:id/history error:', error);
    res.status(500).json({ error: 'Failed to fetch client history' });
  }
});

router.get('/clients/:id/notes', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const notes = await prisma.trainerClientNote.findMany({
      where: { trainerId, clientId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notes.map(serializeNote));
  } catch (error) {
    console.error('[TrainerCRM] GET /clients/:id/notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.post('/clients/:id/notes', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const client = await prisma.trainerClient.findFirst({ where: { id: req.params.id, trainerId } });
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (typeof req.body.content !== 'string' || !req.body.content.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }

    const type = normalizeEnum(req.body.type, VALID_NOTE_TYPES, 'general') || 'general';
    const visibility = normalizeEnum(req.body.visibility, VALID_NOTE_VISIBILITY, 'private') || 'private';
    const note = await prisma.trainerClientNote.create({
      data: {
        trainerId,
        clientId: client.id,
        sessionId: typeof req.body.sessionId === 'string' && req.body.sessionId.trim() ? req.body.sessionId.trim() : null,
        type,
        title: typeof req.body.title === 'string' ? req.body.title.trim() : null,
        content: req.body.content.trim(),
        visibility,
        createdBy: trainerId,
      },
    });

    await logAudit(trainerId, trainerId, 'trainer_client_note', note.id, 'create', null, { clientId: client.id, type: note.type });
    res.status(201).json(serializeNote(note));
  } catch (error) {
    console.error('[TrainerCRM] POST /clients/:id/notes error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.patch('/notes/:id', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const existing = await prisma.trainerClientNote.findFirst({ where: { id: req.params.id, trainerId } });
    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const type = req.body.type === undefined ? existing.type : normalizeEnum(req.body.type, VALID_NOTE_TYPES);
    if (req.body.type !== undefined && !type) {
      return res.status(400).json({ error: 'Invalid note type' });
    }

    const note = await prisma.trainerClientNote.update({
      where: { id: existing.id },
      data: {
        type: type || undefined,
        title: typeof req.body.title === 'string' ? req.body.title.trim() : req.body.title === null ? null : undefined,
        content: typeof req.body.content === 'string' ? req.body.content.trim() : undefined,
      },
    });

    await logAudit(trainerId, trainerId, 'trainer_client_note', note.id, 'update', existing, { type: note.type, title: note.title });
    res.json(serializeNote(note));
  } catch (error) {
    console.error('[TrainerCRM] PATCH /notes/:id error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.delete('/notes/:id', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const existing = await prisma.trainerClientNote.findFirst({ where: { id: req.params.id, trainerId } });
    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await prisma.trainerClientNote.delete({ where: { id: existing.id } });
    await logAudit(trainerId, trainerId, 'trainer_client_note', existing.id, 'delete', { clientId: existing.clientId, type: existing.type }, null);
    res.json({ ok: true });
  } catch (error) {
    console.error('[TrainerCRM] DELETE /notes/:id error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const { from, to, type, status, visibility, clientId } = req.query;
    const where: any = { trainerId };
    const fromDate = parseDate(from);
    const toDate = parseDate(to);

    if (fromDate || toDate) {
      where.startAt = {};
      if (fromDate) where.startAt.gte = fromDate;
      if (toDate) where.startAt.lte = toDate;
    }
    if (typeof type === 'string' && type.trim()) where.type = type.trim();
    if (typeof status === 'string' && status.trim()) where.status = status.trim();
    if (typeof visibility === 'string' && visibility.trim()) where.visibility = visibility.trim();
    if (typeof clientId === 'string' && clientId.trim()) {
      where.participants = { some: { clientId: clientId.trim() } };
    }

    const sessions = await prisma.trainerSession.findMany({
      where,
      orderBy: { startAt: 'asc' },
      include: {
        linkedEvent: true,
        _count: { select: { participants: true, notes: true } },
      },
    });

    res.json(sessions.map(serializeSession));
  } catch (error) {
    console.error('[TrainerCRM] GET /sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const type = normalizeEnum(req.body.type, VALID_SESSION_TYPES);
    const visibility = normalizeEnum(req.body.visibility, VALID_SESSION_VISIBILITY, 'crm_only') || 'crm_only';
    const startAt = parseDate(req.body.startAt);
    const durationMin = parsePositiveInt(req.body.durationMin);

    if (!type) {
      return res.status(400).json({ error: 'Invalid session type' });
    }
    if (!startAt || !durationMin || durationMin <= 0) {
      return res.status(400).json({ error: 'Valid startAt and durationMin are required' });
    }
    if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const hasEndAtInput = hasOwn(req.body, 'endAt');
    const parsedEndAt = hasEndAtInput ? parseDate(req.body.endAt) : null;
    if (hasEndAtInput && req.body.endAt !== null && req.body.endAt !== '' && !parsedEndAt) {
      return res.status(400).json({ error: 'Invalid endAt' });
    }
    const status = normalizeEnum(req.body.status, VALID_SESSION_STATUS, 'scheduled') || 'scheduled';
    const capacity = parsePositiveInt(req.body.capacity);
    const scheduleValidation = await validateSessionSchedule({
      trainerId,
      startAt,
      durationMin,
      endAt: parsedEndAt,
      type,
      capacity: capacity ?? (type === 'personal' ? 1 : null),
    });
    if (!scheduleValidation.ok) {
      return res.status(scheduleValidation.statusCode).json({
        error: scheduleValidation.error,
        ...(scheduleValidation.conflictingSessionId ? { conflictingSessionId: scheduleValidation.conflictingSessionId } : {}),
      });
    }
    const endAt = scheduleValidation.effectiveEndAt;

    const session = await prisma.trainerSession.create({
      data: {
        trainerId,
        type,
        visibility,
        title: req.body.title.trim(),
        description: typeof req.body.description === 'string' ? req.body.description.trim() : null,
        discipline: typeof req.body.discipline === 'string' ? req.body.discipline.trim() : null,
        format: typeof req.body.format === 'string' && req.body.format.trim() ? req.body.format.trim() : 'offline',
        locationName: typeof req.body.locationName === 'string' ? req.body.locationName.trim() : null,
        locationAddress: typeof req.body.locationAddress === 'string' ? req.body.locationAddress.trim() : null,
        onlineUrl: typeof req.body.onlineUrl === 'string' ? req.body.onlineUrl.trim() : null,
        startAt,
        endAt,
        durationMin,
        capacity: capacity ?? (type === 'personal' ? 1 : null),
        waitlistEnabled: Boolean(req.body.waitlistEnabled),
        priceMinor: parsePositiveInt(req.body.priceMinor),
        currency: typeof req.body.currency === 'string' && req.body.currency.trim() ? req.body.currency.trim() : DEFAULT_CURRENCY,
        paymentNote: typeof req.body.paymentNote === 'string' ? req.body.paymentNote.trim() : null,
        status,
        isRecurringTemplate: Boolean(req.body.isRecurringTemplate),
        recurrenceRule: typeof req.body.recurrenceRule === 'string' ? req.body.recurrenceRule.trim() : null,
        parentSeriesId: typeof req.body.parentSeriesId === 'string' ? req.body.parentSeriesId.trim() : null,
        bufferBeforeMin: parsePositiveInt(req.body.bufferBeforeMin),
        bufferAfterMin: parsePositiveInt(req.body.bufferAfterMin),
      },
      include: {
        linkedEvent: true,
        _count: { select: { participants: true, notes: true } },
      },
    });

    await logAudit(trainerId, trainerId, 'trainer_session', session.id, 'create', null, { type: session.type, visibility: session.visibility, startAt: session.startAt });
    res.status(201).json(serializeSession(session));
  } catch (error) {
    console.error('[TrainerCRM] POST /sessions error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const session = await prisma.trainerSession.findFirst({
      where: { id: req.params.id, trainerId },
      include: {
        linkedEvent: true,
        participants: {
          orderBy: { bookedAt: 'asc' },
          include: {
            client: { include: { user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } } } },
            user: { select: { id: true, publicId: true, name: true, avatarUrl: true } },
          },
        },
        _count: { select: { participants: true, notes: true } },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(serializeSession(session));
  } catch (error) {
    console.error('[TrainerCRM] GET /sessions/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

router.patch('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const existing = await prisma.trainerSession.findFirst({ where: { id: req.params.id, trainerId } });
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const nextType = req.body.type === undefined ? existing.type : normalizeEnum(req.body.type, VALID_SESSION_TYPES);
    const nextVisibility = req.body.visibility === undefined ? existing.visibility : normalizeEnum(req.body.visibility, VALID_SESSION_VISIBILITY);
    const nextStatus = req.body.status === undefined ? existing.status : normalizeEnum(req.body.status, VALID_SESSION_STATUS);
    if (req.body.type !== undefined && !nextType) return res.status(400).json({ error: 'Invalid session type' });
    if (req.body.visibility !== undefined && !nextVisibility) return res.status(400).json({ error: 'Invalid session visibility' });
    if (req.body.status !== undefined && !nextStatus) return res.status(400).json({ error: 'Invalid session status' });

    const startAt = req.body.startAt !== undefined ? parseDate(req.body.startAt) : existing.startAt;
    const durationMin = req.body.durationMin !== undefined ? parsePositiveInt(req.body.durationMin) : existing.durationMin;
    if (req.body.startAt !== undefined && !startAt) {
      return res.status(400).json({ error: 'Invalid startAt' });
    }
    if (req.body.durationMin !== undefined && (!durationMin || durationMin <= 0)) {
      return res.status(400).json({ error: 'Valid durationMin is required' });
    }
    const hasEndAtInput = hasOwn(req.body, 'endAt');
    const parsedEndAt = hasEndAtInput ? parseDate(req.body.endAt) : undefined;
    if (hasEndAtInput && req.body.endAt !== null && req.body.endAt !== '' && !parsedEndAt) {
      return res.status(400).json({ error: 'Invalid endAt' });
    }
    const endAt = hasEndAtInput
      ? (req.body.endAt === null || req.body.endAt === '' ? null : parsedEndAt || null)
      : req.body.startAt !== undefined || req.body.durationMin !== undefined
        ? getEffectiveSessionEndAt(startAt || existing.startAt, durationMin || existing.durationMin, null)
        : existing.endAt;
    const nextCapacity = req.body.capacity !== undefined ? parsePositiveInt(req.body.capacity) : existing.capacity;
    const scheduleValidation = await validateSessionSchedule({
      trainerId,
      startAt: startAt || existing.startAt,
      durationMin: durationMin || existing.durationMin,
      endAt,
      type: nextType || existing.type,
      capacity: nextCapacity,
      excludeSessionId: existing.id,
    });
    if (!scheduleValidation.ok) {
      return res.status(scheduleValidation.statusCode).json({
        error: scheduleValidation.error,
        ...(scheduleValidation.conflictingSessionId ? { conflictingSessionId: scheduleValidation.conflictingSessionId } : {}),
      });
    }

    const session = await prisma.trainerSession.update({
      where: { id: existing.id },
      data: {
        type: nextType || undefined,
        visibility: nextVisibility || undefined,
        title: typeof req.body.title === 'string' ? req.body.title.trim() : undefined,
        description: typeof req.body.description === 'string' ? req.body.description.trim() : req.body.description === null ? null : undefined,
        discipline: typeof req.body.discipline === 'string' ? req.body.discipline.trim() : req.body.discipline === null ? null : undefined,
        format: typeof req.body.format === 'string' ? req.body.format.trim() : undefined,
        locationName: typeof req.body.locationName === 'string' ? req.body.locationName.trim() : req.body.locationName === null ? null : undefined,
        locationAddress: typeof req.body.locationAddress === 'string' ? req.body.locationAddress.trim() : req.body.locationAddress === null ? null : undefined,
        onlineUrl: typeof req.body.onlineUrl === 'string' ? req.body.onlineUrl.trim() : req.body.onlineUrl === null ? null : undefined,
        startAt: startAt || undefined,
        endAt,
        durationMin: durationMin || undefined,
        capacity: req.body.capacity !== undefined ? nextCapacity : undefined,
        waitlistEnabled: req.body.waitlistEnabled !== undefined ? Boolean(req.body.waitlistEnabled) : undefined,
        priceMinor: req.body.priceMinor !== undefined ? parsePositiveInt(req.body.priceMinor) : undefined,
        currency: typeof req.body.currency === 'string' ? req.body.currency.trim() : undefined,
        paymentNote: typeof req.body.paymentNote === 'string' ? req.body.paymentNote.trim() : req.body.paymentNote === null ? null : undefined,
        status: nextStatus || undefined,
        isRecurringTemplate: req.body.isRecurringTemplate !== undefined ? Boolean(req.body.isRecurringTemplate) : undefined,
        recurrenceRule: typeof req.body.recurrenceRule === 'string' ? req.body.recurrenceRule.trim() : req.body.recurrenceRule === null ? null : undefined,
        parentSeriesId: typeof req.body.parentSeriesId === 'string' ? req.body.parentSeriesId.trim() : req.body.parentSeriesId === null ? null : undefined,
        bufferBeforeMin: req.body.bufferBeforeMin !== undefined ? parsePositiveInt(req.body.bufferBeforeMin) : undefined,
        bufferAfterMin: req.body.bufferAfterMin !== undefined ? parsePositiveInt(req.body.bufferAfterMin) : undefined,
      },
      include: {
        linkedEvent: true,
        _count: { select: { participants: true, notes: true } },
      },
    });

    await logAudit(trainerId, trainerId, 'trainer_session', session.id, 'update', { title: existing.title, status: existing.status }, { title: session.title, status: session.status });
    res.json(serializeSession(session));
  } catch (error) {
    console.error('[TrainerCRM] PATCH /sessions/:id error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

router.post('/sessions/:id/cancel', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const existing = await prisma.trainerSession.findFirst({ where: { id: req.params.id, trainerId } });
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const cancelledReason = typeof req.body.reason === 'string' ? req.body.reason.trim() : null;
    const session = await prisma.trainerSession.update({
      where: { id: existing.id },
      data: {
        status: 'cancelled_by_trainer',
        cancelledAt: new Date(),
        cancelledReason,
      },
      include: { linkedEvent: true, _count: { select: { participants: true, notes: true } } },
    });

    if (session.linkedEventId) {
      await prisma.event.update({
        where: { id: session.linkedEventId },
        data: { status: 'canceled' },
      }).catch(() => {});
    }

    await prisma.trainerSessionParticipant.updateMany({
      where: { sessionId: session.id, status: { in: ['booked', 'confirmed', 'waitlisted', 'offered_from_waitlist'] } },
      data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: cancelledReason },
    });

    await logAudit(trainerId, trainerId, 'trainer_session', session.id, 'cancel', { status: existing.status }, { status: session.status, reason: cancelledReason });
    res.json(serializeSession(session));
  } catch (error) {
    console.error('[TrainerCRM] POST /sessions/:id/cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel session' });
  }
});

router.post('/sessions/:id/reschedule', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const existing = await prisma.trainerSession.findFirst({ where: { id: req.params.id, trainerId } });
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const startAt = parseDate(req.body.startAt);
    const durationMin = req.body.durationMin !== undefined ? parsePositiveInt(req.body.durationMin) : existing.durationMin;
    if (!startAt) {
      return res.status(400).json({ error: 'Valid startAt is required' });
    }
    if (req.body.durationMin !== undefined && (!durationMin || durationMin <= 0)) {
      return res.status(400).json({ error: 'Valid durationMin is required' });
    }
    const hasEndAtInput = hasOwn(req.body, 'endAt');
    const parsedEndAt = hasEndAtInput ? parseDate(req.body.endAt) : null;
    if (hasEndAtInput && req.body.endAt !== null && req.body.endAt !== '' && !parsedEndAt) {
      return res.status(400).json({ error: 'Invalid endAt' });
    }
    const scheduleValidation = await validateSessionSchedule({
      trainerId,
      startAt,
      durationMin: durationMin || existing.durationMin,
      endAt: hasEndAtInput ? (req.body.endAt === null || req.body.endAt === '' ? null : parsedEndAt || null) : null,
      type: existing.type,
      capacity: existing.capacity,
      excludeSessionId: existing.id,
    });
    if (!scheduleValidation.ok) {
      return res.status(scheduleValidation.statusCode).json({
        error: scheduleValidation.error,
        ...(scheduleValidation.conflictingSessionId ? { conflictingSessionId: scheduleValidation.conflictingSessionId } : {}),
      });
    }
    const endAt = scheduleValidation.effectiveEndAt;

    const session = await prisma.trainerSession.update({
      where: { id: existing.id },
      data: {
        startAt,
        endAt,
        durationMin: durationMin || existing.durationMin,
        status: existing.status,
      },
      include: { linkedEvent: true, _count: { select: { participants: true, notes: true } } },
    });

    if (session.linkedEventId) {
      await prisma.event.update({
        where: { id: session.linkedEventId },
        data: {
          startAt,
          endAt,
          durationMin,
        },
      }).catch(() => {});
    }

    await logAudit(trainerId, trainerId, 'trainer_session', session.id, 'reschedule', { startAt: existing.startAt, endAt: existing.endAt }, { startAt: session.startAt, endAt: session.endAt });
    res.json(serializeSession(session));
  } catch (error) {
    console.error('[TrainerCRM] POST /sessions/:id/reschedule error:', error);
    res.status(500).json({ error: 'Failed to reschedule session' });
  }
});

router.post('/sessions/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const existing = await prisma.trainerSession.findFirst({ where: { id: req.params.id, trainerId } });
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const shiftDays = parsePositiveInt(req.body.shiftDays) || 7;
    const startAt = new Date(existing.startAt.getTime() + shiftDays * 24 * 60 * 60 * 1000);
    const endAt = existing.endAt ? new Date(existing.endAt.getTime() + shiftDays * 24 * 60 * 60 * 1000) : null;
    const scheduleValidation = await validateSessionSchedule({
      trainerId,
      startAt,
      durationMin: existing.durationMin,
      endAt,
      type: existing.type,
      capacity: existing.capacity,
    });
    if (!scheduleValidation.ok) {
      return res.status(scheduleValidation.statusCode).json({
        error: scheduleValidation.error,
        ...(scheduleValidation.conflictingSessionId ? { conflictingSessionId: scheduleValidation.conflictingSessionId } : {}),
      });
    }

    const session = await prisma.trainerSession.create({
      data: {
        trainerId,
        type: existing.type,
        visibility: existing.visibility,
        title: existing.title,
        description: existing.description,
        discipline: existing.discipline,
        format: existing.format,
        locationName: existing.locationName,
        locationAddress: existing.locationAddress,
        onlineUrl: existing.onlineUrl,
        startAt,
        endAt: scheduleValidation.effectiveEndAt,
        durationMin: existing.durationMin,
        capacity: existing.capacity,
        waitlistEnabled: existing.waitlistEnabled,
        priceMinor: existing.priceMinor,
        currency: existing.currency,
        paymentNote: existing.paymentNote,
        status: 'scheduled',
        bufferBeforeMin: existing.bufferBeforeMin,
        bufferAfterMin: existing.bufferAfterMin,
      },
      include: { linkedEvent: true, _count: { select: { participants: true, notes: true } } },
    });

    await logAudit(trainerId, trainerId, 'trainer_session', session.id, 'duplicate', { sourceSessionId: existing.id }, { sourceSessionId: existing.id, newSessionId: session.id });
    res.status(201).json(serializeSession(session));
  } catch (error) {
    console.error('[TrainerCRM] POST /sessions/:id/duplicate error:', error);
    res.status(500).json({ error: 'Failed to duplicate session' });
  }
});

router.post('/sessions/:id/publish', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const session = await prisma.trainerSession.findFirst({ where: { id: req.params.id, trainerId } });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.type !== 'group') {
      return res.status(400).json({ error: 'Only group sessions can be published as marketplace events' });
    }

    const eventData = {
      organizerId: trainerId,
      title: session.title,
      description: session.description,
      movementType: session.discipline || 'other',
      level: 'novice',
      startAt: session.startAt,
      endAt: session.endAt,
      durationMin: session.durationMin,
      locationName: session.format === 'online' ? session.locationName || 'Онлайн' : session.locationName || 'TBD',
      locationAddress: session.format === 'online' ? session.onlineUrl || session.locationAddress : session.locationAddress,
      locationType: session.format === 'online' ? 'online' : 'public_place',
      capacity: session.capacity,
      priceType: typeof session.priceMinor === 'number' && session.priceMinor > 0 ? 'fixed' : 'free',
      priceValue: toEventPriceValue(session.priceMinor),
      paymentInstructions: session.paymentNote,
      status: 'pending',
      visibility: session.visibility === 'public' ? 'public' : 'private',
    };

    const linkedEvent = session.linkedEventId
      ? await prisma.event.update({ where: { id: session.linkedEventId }, data: eventData })
      : await prisma.event.create({ data: eventData });

    const updated = await prisma.trainerSession.update({
      where: { id: session.id },
      data: { linkedEventId: linkedEvent.id, visibility: session.visibility === 'crm_only' ? 'public' : session.visibility },
      include: { linkedEvent: true, _count: { select: { participants: true, notes: true } } },
    });

    await logAudit(trainerId, trainerId, 'trainer_session', session.id, 'publish', { linkedEventId: session.linkedEventId }, { linkedEventId: linkedEvent.id });
    res.json(serializeSession(updated));
  } catch (error) {
    console.error('[TrainerCRM] POST /sessions/:id/publish error:', error);
    res.status(500).json({ error: 'Failed to publish session' });
  }
});

router.get('/sessions/:id/participants', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const session = await prisma.trainerSession.findFirst({ where: { id: req.params.id, trainerId } });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const participants = await prisma.trainerSessionParticipant.findMany({
      where: { sessionId: session.id },
      orderBy: { bookedAt: 'asc' },
      include: {
        client: { include: { user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } } } },
        user: { select: { id: true, publicId: true, name: true, avatarUrl: true } },
      },
    });

    res.json(dedupeParticipantsByIdentity(participants).map(serializeSessionParticipant));
  } catch (error) {
    console.error('[TrainerCRM] GET /sessions/:id/participants error:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

router.post('/sessions/:id/participants', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const session = await prisma.trainerSession.findFirst({ where: { id: req.params.id, trainerId } });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const participantStatus = normalizeEnum(req.body.status, VALID_PARTICIPANT_STATUS, 'booked') || 'booked';
    const paymentStatus = normalizeEnum(req.body.paymentStatus, VALID_PAYMENT_STATUS, 'unpaid') || 'unpaid';
    const client = await ensureTrainerClient(trainerId, {
      clientId: typeof req.body.clientId === 'string' ? req.body.clientId.trim() : null,
      userId: typeof req.body.userId === 'string' ? req.body.userId.trim() : null,
      fullName: typeof req.body.fullName === 'string' ? req.body.fullName.trim() : null,
      phone: typeof req.body.phone === 'string' ? req.body.phone.trim() : null,
      telegramHandle: typeof req.body.telegramHandle === 'string' ? req.body.telegramHandle.trim() : null,
      email: typeof req.body.email === 'string' ? req.body.email.trim() : null,
    });
    const participantUserId =
      (typeof req.body.userId === 'string' && req.body.userId.trim() ? req.body.userId.trim() : null) ||
      client.userId ||
      null;
    const existingParticipants = await findSessionParticipantsByIdentity(session.id, client.id, participantUserId);
    const primaryParticipant = [...existingParticipants].sort(compareParticipantsByIdentityPriority)[0];

    let participantRecord;
    let responseStatusCode = 201;

    if (primaryParticipant) {
      participantRecord = await prisma.trainerSessionParticipant.update({
        where: { id: primaryParticipant.id },
        data: {
          clientId: client.id,
          userId: participantUserId,
        },
      });
      responseStatusCode = 200;
    } else {
      const capacityResult = await resolveParticipantStatusForCapacity(session, participantStatus);
      if (!capacityResult.ok) {
        return res.status(409).json({ error: 'Session capacity is full' });
      }

      const nextStatus = capacityResult.status;
      participantRecord = await prisma.trainerSessionParticipant.create({
        data: {
          sessionId: session.id,
          clientId: client.id,
          userId: participantUserId,
          status: nextStatus,
          paymentStatus,
          priceMinor: parsePositiveInt(req.body.priceMinor),
          amountPaidMinor: parsePositiveInt(req.body.amountPaidMinor) || 0,
          note: typeof req.body.note === 'string' ? req.body.note.trim() : null,
          confirmedAt: nextStatus === 'confirmed' ? new Date() : null,
          attendedAt: nextStatus === 'attended' ? new Date() : null,
          cancelledAt: nextStatus === 'cancelled' || nextStatus === 'late_cancelled' ? new Date() : null,
          attendanceMarkedBy: nextStatus === 'attended' || nextStatus === 'no_show' ? trainerId : null,
        },
      });
    }

    const participant = await prisma.trainerSessionParticipant.findUnique({
      where: { id: participantRecord.id },
      include: {
        client: { include: { user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } } } },
        user: { select: { id: true, publicId: true, name: true, avatarUrl: true } },
      },
    });

    if (!participant) {
      return res.status(500).json({ error: 'Failed to load participant after upsert' });
    }

    await refreshClientMetrics(trainerId, client.id);
    await logAudit(trainerId, trainerId, 'trainer_session_participant', participant.id, 'upsert', null, { sessionId: session.id, status: participant.status });
    res.status(responseStatusCode).json(serializeSessionParticipant(participant));
  } catch (error: any) {
    console.error('[TrainerCRM] POST /sessions/:id/participants error:', error);
    res.status(error?.message === 'Client not found' ? 404 : 500).json({ error: error?.message || 'Failed to add participant' });
  }
});

router.patch('/participants/:id', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const existing = await prisma.trainerSessionParticipant.findFirst({
      where: { id: req.params.id, session: { trainerId } },
      include: { client: true, session: { select: { id: true, capacity: true, waitlistEnabled: true } } },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    const nextStatus = req.body.status === undefined ? existing.status : normalizeEnum(req.body.status, VALID_PARTICIPANT_STATUS);
    const nextPaymentStatus = req.body.paymentStatus === undefined ? existing.paymentStatus : normalizeEnum(req.body.paymentStatus, VALID_PAYMENT_STATUS);
    if (req.body.status !== undefined && !nextStatus) return res.status(400).json({ error: 'Invalid participant status' });
    if (req.body.paymentStatus !== undefined && !nextPaymentStatus) return res.status(400).json({ error: 'Invalid payment status' });

    let effectiveStatus = nextStatus || existing.status;
    if (req.body.status !== undefined) {
      const capacityResult = await resolveParticipantStatusForCapacity(existing.session, effectiveStatus, [existing.id]);
      if (!capacityResult.ok) {
        return res.status(409).json({ error: 'Session capacity is full' });
      }
      effectiveStatus = capacityResult.status;
    }

    const participant = await prisma.trainerSessionParticipant.update({
      where: { id: existing.id },
      data: {
        status: effectiveStatus,
        paymentStatus: nextPaymentStatus || undefined,
        amountPaidMinor: req.body.amountPaidMinor !== undefined ? parsePositiveInt(req.body.amountPaidMinor) || 0 : undefined,
        priceMinor: req.body.priceMinor !== undefined ? parsePositiveInt(req.body.priceMinor) : undefined,
        note: typeof req.body.note === 'string' ? req.body.note.trim() : req.body.note === null ? null : undefined,
        cancellationReason: typeof req.body.cancellationReason === 'string' ? req.body.cancellationReason.trim() : undefined,
        confirmedAt: effectiveStatus === 'confirmed' ? new Date() : effectiveStatus !== 'confirmed' && req.body.status !== undefined ? null : undefined,
        attendedAt: effectiveStatus === 'attended' ? new Date() : effectiveStatus !== 'attended' && req.body.status !== undefined ? null : undefined,
        cancelledAt: effectiveStatus === 'cancelled' || effectiveStatus === 'late_cancelled' ? new Date() : undefined,
        attendanceMarkedBy: req.body.status !== undefined ? trainerId : undefined,
      },
      include: {
        client: { include: { user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } } } },
        user: { select: { id: true, publicId: true, name: true, avatarUrl: true } },
      },
    });

    if (participant.clientId) {
      await refreshClientMetrics(trainerId, participant.clientId);
    }

    await logAudit(trainerId, trainerId, 'trainer_session_participant', participant.id, 'update', { status: existing.status, paymentStatus: existing.paymentStatus }, { status: participant.status, paymentStatus: participant.paymentStatus });
    res.json(serializeSessionParticipant(participant));
  } catch (error) {
    console.error('[TrainerCRM] PATCH /participants/:id error:', error);
    res.status(500).json({ error: 'Failed to update participant' });
  }
});

router.post('/sessions/:id/attendance/bulk', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const session = await prisma.trainerSession.findFirst({ where: { id: req.params.id, trainerId } });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updates = Array.isArray(req.body.items) ? req.body.items : [];
    if (!updates.length) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const results = [] as any[];
    for (const item of updates) {
      if (!item?.participantId || typeof item.participantId !== 'string') continue;
      const status = normalizeEnum(item.status, VALID_PARTICIPANT_STATUS);
      if (!status) continue;

      const participant = await prisma.trainerSessionParticipant.updateMany({
        where: { id: item.participantId, sessionId: session.id },
        data: {
          status,
          paymentStatus: normalizeEnum(item.paymentStatus, VALID_PAYMENT_STATUS) || undefined,
          amountPaidMinor: item.amountPaidMinor !== undefined ? parsePositiveInt(item.amountPaidMinor) || 0 : undefined,
          attendanceMarkedBy: trainerId,
          attendedAt: status === 'attended' ? new Date() : undefined,
          confirmedAt: status === 'confirmed' ? new Date() : undefined,
          cancelledAt: status === 'cancelled' || status === 'late_cancelled' ? new Date() : undefined,
        },
      });
      results.push({ participantId: item.participantId, updated: participant.count > 0, status });
    }

    const affectedParticipants = await prisma.trainerSessionParticipant.findMany({
      where: { sessionId: session.id },
      select: { clientId: true },
    });
    for (const participant of affectedParticipants) {
      if (participant.clientId) {
        await refreshClientMetrics(trainerId, participant.clientId);
      }
    }

    await logAudit(trainerId, trainerId, 'trainer_session', session.id, 'bulk_attendance', null, { count: results.length });
    res.json({ items: results });
  } catch (error) {
    console.error('[TrainerCRM] POST /sessions/:id/attendance/bulk error:', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

router.get('/packages', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const packages = await prisma.trainerPackage.findMany({
      where: { trainerId },
      orderBy: { createdAt: 'desc' },
      include: {
        client: { include: { user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } } } },
        _count: { select: { usages: true } },
      },
    });

    res.json(packages.map(serializePackage));
  } catch (error) {
    console.error('[TrainerCRM] GET /packages error:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

router.post('/packages', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const kind = normalizeEnum(req.body.kind, VALID_PACKAGE_KIND);
    if (!kind) {
      return res.status(400).json({ error: 'Invalid package kind' });
    }
    if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const client = await ensureTrainerClient(trainerId, {
      clientId: typeof req.body.clientId === 'string' ? req.body.clientId.trim() : null,
      userId: typeof req.body.userId === 'string' ? req.body.userId.trim() : null,
      fullName: typeof req.body.fullName === 'string' ? req.body.fullName.trim() : null,
      phone: typeof req.body.phone === 'string' ? req.body.phone.trim() : null,
      telegramHandle: typeof req.body.telegramHandle === 'string' ? req.body.telegramHandle.trim() : null,
      email: typeof req.body.email === 'string' ? req.body.email.trim() : null,
    });

    const included = parsePositiveInt(req.body.sessionsIncluded);
    const remaining = req.body.sessionsRemaining !== undefined ? parsePositiveInt(req.body.sessionsRemaining) : included;
    const requestedStatus = normalizeEnum(req.body.status, VALID_PACKAGE_STATUS, 'draft') || 'draft';
    const paymentStatus = normalizeEnum(req.body.paymentStatus, VALID_PAYMENT_STATUS, 'unpaid') || 'unpaid';
    const startsAt = parseDate(req.body.startsAt);
    const endsAt = parseDate(req.body.endsAt);
    const normalizedPackageState = normalizePackageState({
      sessionsIncluded: included,
      sessionsRemaining: remaining,
      endsAt,
      requestedStatus,
    });
    if (!normalizedPackageState.ok) {
      return res.status(400).json({ error: normalizedPackageState.error });
    }

    const pkg = await prisma.trainerPackage.create({
      data: {
        trainerId,
        clientId: client.id,
        title: req.body.title.trim(),
        kind,
        discipline: typeof req.body.discipline === 'string' ? req.body.discipline.trim() : null,
        sessionsIncluded: normalizedPackageState.sessionsIncluded,
        sessionsUsed: normalizedPackageState.sessionsUsed,
        sessionsRemaining: normalizedPackageState.sessionsRemaining,
        startsAt,
        endsAt,
        freezeDaysRemaining: parsePositiveInt(req.body.freezeDaysRemaining),
        priceMinor: parsePositiveInt(req.body.priceMinor),
        currency: typeof req.body.currency === 'string' && req.body.currency.trim() ? req.body.currency.trim() : DEFAULT_CURRENCY,
        paymentStatus,
        status: normalizedPackageState.status,
        notes: typeof req.body.notes === 'string' ? req.body.notes.trim() : null,
      },
      include: {
        client: { include: { user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } } } },
        _count: { select: { usages: true } },
      },
    });

    await logAudit(trainerId, trainerId, 'trainer_package', pkg.id, 'create', null, { title: pkg.title, status: pkg.status });
    res.status(201).json(serializePackage(pkg));
  } catch (error: any) {
    console.error('[TrainerCRM] POST /packages error:', error);
    res.status(error?.message === 'Client not found' ? 404 : 500).json({ error: error?.message || 'Failed to create package' });
  }
});

router.get('/packages/:id', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const pkg = await prisma.trainerPackage.findFirst({
      where: { id: req.params.id, trainerId },
      include: {
        client: { include: { user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } } } },
        usages: { include: { session: true, participant: true }, orderBy: { createdAt: 'desc' } },
        _count: { select: { usages: true } },
      },
    });

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({
      ...serializePackage(pkg),
      usages: pkg.usages.map((usage) => ({
        id: usage.id,
        usedUnits: usage.usedUnits,
        createdAt: usage.createdAt.toISOString(),
        session: usage.session ? serializeSession(usage.session) : null,
        participantId: usage.participantId,
      })),
    });
  } catch (error) {
    console.error('[TrainerCRM] GET /packages/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch package' });
  }
});

router.patch('/packages/:id', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const existing = await prisma.trainerPackage.findFirst({ where: { id: req.params.id, trainerId } });
    if (!existing) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const nextStatus = req.body.status === undefined ? existing.status : normalizeEnum(req.body.status, VALID_PACKAGE_STATUS);
    const nextPaymentStatus = req.body.paymentStatus === undefined ? existing.paymentStatus : normalizeEnum(req.body.paymentStatus, VALID_PAYMENT_STATUS);
    if (req.body.status !== undefined && !nextStatus) return res.status(400).json({ error: 'Invalid package status' });
    if (req.body.paymentStatus !== undefined && !nextPaymentStatus) return res.status(400).json({ error: 'Invalid payment status' });
    const nextSessionsIncluded = req.body.sessionsIncluded !== undefined ? parsePositiveInt(req.body.sessionsIncluded) : existing.sessionsIncluded;
    const nextSessionsUsed = req.body.sessionsUsed !== undefined ? parsePositiveInt(req.body.sessionsUsed) : existing.sessionsUsed;
    const nextSessionsRemaining = req.body.sessionsRemaining !== undefined ? parsePositiveInt(req.body.sessionsRemaining) : existing.sessionsRemaining;
    const nextEndsAt = req.body.endsAt !== undefined ? parseDate(req.body.endsAt) : existing.endsAt;
    const normalizedPackageState = normalizePackageState({
      sessionsIncluded: nextSessionsIncluded,
      sessionsUsed: nextSessionsUsed,
      sessionsRemaining: nextSessionsRemaining,
      endsAt: nextEndsAt,
      requestedStatus: nextStatus || existing.status,
    });
    if (!normalizedPackageState.ok) {
      return res.status(400).json({ error: normalizedPackageState.error });
    }

    const pkg = await prisma.trainerPackage.update({
      where: { id: existing.id },
      data: {
        title: typeof req.body.title === 'string' ? req.body.title.trim() : undefined,
        discipline: typeof req.body.discipline === 'string' ? req.body.discipline.trim() : req.body.discipline === null ? null : undefined,
        sessionsIncluded: req.body.sessionsIncluded !== undefined ? normalizedPackageState.sessionsIncluded : undefined,
        sessionsUsed: req.body.sessionsUsed !== undefined || req.body.sessionsIncluded !== undefined || req.body.sessionsRemaining !== undefined ? normalizedPackageState.sessionsUsed : undefined,
        sessionsRemaining: req.body.sessionsRemaining !== undefined || req.body.sessionsIncluded !== undefined || req.body.sessionsUsed !== undefined ? normalizedPackageState.sessionsRemaining : undefined,
        startsAt: req.body.startsAt !== undefined ? parseDate(req.body.startsAt) : undefined,
        endsAt: req.body.endsAt !== undefined ? nextEndsAt : undefined,
        freezeDaysRemaining: req.body.freezeDaysRemaining !== undefined ? parsePositiveInt(req.body.freezeDaysRemaining) : undefined,
        priceMinor: req.body.priceMinor !== undefined ? parsePositiveInt(req.body.priceMinor) : undefined,
        currency: typeof req.body.currency === 'string' ? req.body.currency.trim() : undefined,
        paymentStatus: nextPaymentStatus || undefined,
        status: normalizedPackageState.status,
        notes: typeof req.body.notes === 'string' ? req.body.notes.trim() : req.body.notes === null ? null : undefined,
      },
      include: {
        client: { include: { user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } } } },
        _count: { select: { usages: true } },
      },
    });

    await logAudit(trainerId, trainerId, 'trainer_package', pkg.id, 'update', { status: existing.status, paymentStatus: existing.paymentStatus }, { status: pkg.status, paymentStatus: pkg.paymentStatus });
    res.json(serializePackage(pkg));
  } catch (error) {
    console.error('[TrainerCRM] PATCH /packages/:id error:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

router.post('/packages/:id/pause', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const pkg = await prisma.trainerPackage.findFirst({ where: { id: req.params.id, trainerId } });
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    const updated = await prisma.trainerPackage.update({ where: { id: pkg.id }, data: { status: 'paused' }, include: { client: { include: { user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } } } }, _count: { select: { usages: true } } } });
    await logAudit(trainerId, trainerId, 'trainer_package', updated.id, 'pause', { status: pkg.status }, { status: updated.status });
    res.json(serializePackage(updated));
  } catch (error) {
    console.error('[TrainerCRM] POST /packages/:id/pause error:', error);
    res.status(500).json({ error: 'Failed to pause package' });
  }
});

router.post('/packages/:id/resume', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const pkg = await prisma.trainerPackage.findFirst({ where: { id: req.params.id, trainerId } });
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    const updated = await prisma.trainerPackage.update({ where: { id: pkg.id }, data: { status: 'active' }, include: { client: { include: { user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } } } }, _count: { select: { usages: true } } } });
    await logAudit(trainerId, trainerId, 'trainer_package', updated.id, 'resume', { status: pkg.status }, { status: updated.status });
    res.json(serializePackage(updated));
  } catch (error) {
    console.error('[TrainerCRM] POST /packages/:id/resume error:', error);
    res.status(500).json({ error: 'Failed to resume package' });
  }
});

router.post('/packages/:id/expire', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const pkg = await prisma.trainerPackage.findFirst({ where: { id: req.params.id, trainerId } });
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    const updated = await prisma.trainerPackage.update({ where: { id: pkg.id }, data: { status: 'expired', endsAt: new Date() }, include: { client: { include: { user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } } } }, _count: { select: { usages: true } } } });
    await logAudit(trainerId, trainerId, 'trainer_package', updated.id, 'expire', { status: pkg.status }, { status: updated.status });
    res.json(serializePackage(updated));
  } catch (error) {
    console.error('[TrainerCRM] POST /packages/:id/expire error:', error);
    res.status(500).json({ error: 'Failed to expire package' });
  }
});

router.post('/packages/:id/consume', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const pkg = await prisma.trainerPackage.findFirst({ where: { id: req.params.id, trainerId } });
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }
    if (pkg.sessionsRemaining <= 0) {
      return res.status(400).json({ error: 'No sessions remaining in package' });
    }
    if (typeof req.body.sessionId !== 'string' || typeof req.body.participantId !== 'string') {
      return res.status(400).json({ error: 'sessionId and participantId are required' });
    }

    const participant = await prisma.trainerSessionParticipant.findFirst({
      where: {
        id: req.body.participantId,
        clientId: pkg.clientId,
        session: { id: req.body.sessionId, trainerId },
      },
    });
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found for this package' });
    }

    const usedUnits = parsePositiveInt(req.body.usedUnits) || 1;
    if (pkg.sessionsRemaining < usedUnits) {
      return res.status(400).json({ error: 'Not enough remaining sessions in package' });
    }

    let usage;
    try {
      [usage] = await prisma.$transaction([
        prisma.trainerPackageUsage.create({
          data: {
            packageId: pkg.id,
            sessionId: req.body.sessionId,
            participantId: participant.id,
            usedUnits,
          },
        }),
        prisma.trainerPackage.update({
          where: { id: pkg.id },
          data: {
            sessionsUsed: { increment: usedUnits },
            sessionsRemaining: { decrement: usedUnits },
            status: derivePackageStatus({
              requestedStatus: pkg.status,
              sessionsIncluded: pkg.sessionsIncluded,
              sessionsRemaining: pkg.sessionsRemaining - usedUnits,
              endsAt: pkg.endsAt,
            }),
          },
        }),
      ]);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return res.status(409).json({ error: 'Package usage for this participant and session already exists' });
      }
      throw error;
    }

    await logAudit(trainerId, trainerId, 'trainer_package', pkg.id, 'consume', null, { participantId: participant.id, usedUnits });
    res.status(201).json({ ok: true, usageId: usage.id, usedUnits });
  } catch (error) {
    console.error('[TrainerCRM] POST /packages/:id/consume error:', error);
    res.status(500).json({ error: 'Failed to consume package' });
  }
});

router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const tasks = await prisma.trainerTask.findMany({
      where: { trainerId },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        client: { include: { user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } } } },
        session: { include: { linkedEvent: true, _count: { select: { participants: true, notes: true } } } },
      },
    });
    res.json(tasks.map(serializeTask));
  } catch (error) {
    console.error('[TrainerCRM] GET /tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const status = normalizeEnum(req.body.status, VALID_TASK_STATUS, 'open') || 'open';
    const priority = normalizeEnum(req.body.priority, VALID_TASK_PRIORITY, 'medium') || 'medium';

    const task = await prisma.trainerTask.create({
      data: {
        trainerId,
        clientId: typeof req.body.clientId === 'string' ? req.body.clientId.trim() : null,
        sessionId: typeof req.body.sessionId === 'string' ? req.body.sessionId.trim() : null,
        title: req.body.title.trim(),
        description: typeof req.body.description === 'string' ? req.body.description.trim() : null,
        dueAt: parseDate(req.body.dueAt),
        status,
        priority,
      },
      include: {
        client: { include: { user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } } } },
        session: { include: { linkedEvent: true, _count: { select: { participants: true, notes: true } } } },
      },
    });

    await logAudit(trainerId, trainerId, 'trainer_task', task.id, 'create', null, { title: task.title, status: task.status });
    res.status(201).json(serializeTask(task));
  } catch (error) {
    console.error('[TrainerCRM] POST /tasks error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const existing = await prisma.trainerTask.findFirst({ where: { id: req.params.id, trainerId } });
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const nextStatus = req.body.status === undefined ? existing.status : normalizeEnum(req.body.status, VALID_TASK_STATUS);
    const nextPriority = req.body.priority === undefined ? existing.priority : normalizeEnum(req.body.priority, VALID_TASK_PRIORITY);
    if (req.body.status !== undefined && !nextStatus) return res.status(400).json({ error: 'Invalid task status' });
    if (req.body.priority !== undefined && !nextPriority) return res.status(400).json({ error: 'Invalid task priority' });

    const task = await prisma.trainerTask.update({
      where: { id: existing.id },
      data: {
        title: typeof req.body.title === 'string' ? req.body.title.trim() : undefined,
        description: typeof req.body.description === 'string' ? req.body.description.trim() : req.body.description === null ? null : undefined,
        dueAt: req.body.dueAt !== undefined ? parseDate(req.body.dueAt) : undefined,
        status: nextStatus || undefined,
        priority: nextPriority || undefined,
        completedAt: nextStatus === 'done' ? new Date() : req.body.status !== undefined && nextStatus !== 'done' ? null : undefined,
      },
      include: {
        client: { include: { user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } } } },
        session: { include: { linkedEvent: true, _count: { select: { participants: true, notes: true } } } },
      },
    });

    await logAudit(trainerId, trainerId, 'trainer_task', task.id, 'update', { status: existing.status, priority: existing.priority }, { status: task.status, priority: task.priority });
    res.json(serializeTask(task));
  } catch (error) {
    console.error('[TrainerCRM] PATCH /tasks/:id error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.post('/tasks/:id/complete', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const existing = await prisma.trainerTask.findFirst({ where: { id: req.params.id, trainerId } });
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = await prisma.trainerTask.update({
      where: { id: existing.id },
      data: { status: 'done', completedAt: new Date() },
      include: {
        client: { include: { user: { select: { id: true, publicId: true, name: true, avatarUrl: true, telegramId: true } } } },
        session: { include: { linkedEvent: true, _count: { select: { participants: true, notes: true } } } },
      },
    });

    await logAudit(trainerId, trainerId, 'trainer_task', task.id, 'complete', { status: existing.status }, { status: task.status });
    res.json(serializeTask(task));
  } catch (error) {
    console.error('[TrainerCRM] POST /tasks/:id/complete error:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

router.get('/analytics/overview', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const range = typeof req.query.range === 'string' ? req.query.range : '30d';
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [sessions, participants, clientsCount, newClientsCount, reviewsAgg] = await Promise.all([
      prisma.trainerSession.findMany({ where: { trainerId, startAt: { gte: from } }, select: { id: true, type: true, capacity: true, status: true } }),
      prisma.trainerSessionParticipant.findMany({ where: { session: { trainerId, startAt: { gte: from } } }, select: { status: true, amountPaidMinor: true, priceMinor: true, sessionId: true } }),
      prisma.trainerClient.count({ where: { trainerId, archivedAt: null } }),
      prisma.trainerClient.count({ where: { trainerId, createdAt: { gte: from } } }),
      prisma.review.aggregate({ where: { event: { organizerId: trainerId }, createdAt: { gte: from } }, _avg: { rating: true }, _count: { rating: true } }),
    ]);

    const scheduled = sessions.length;
    const completed = sessions.filter((session) => session.status === 'completed').length;
    const attended = participants.filter((item) => item.status === 'attended').length;
    const noShow = participants.filter((item) => item.status === 'no_show').length;
    const cancelled = participants.filter((item) => item.status === 'cancelled' || item.status === 'late_cancelled').length;
    const confirmed = participants.filter((item) => item.status === 'confirmed' || item.status === 'booked').length;
    const revenueMinor = participants.reduce((sum, item) => sum + (item.amountPaidMinor || 0), 0);
    const capacityTotal = sessions.reduce((sum, item) => sum + (item.capacity || 0), 0);
    const occupancyRate = capacityTotal > 0 ? Math.round(((attended + confirmed) / capacityTotal) * 1000) / 10 : 0;
    const attendanceBase = attended + noShow + cancelled;
    const attendanceRate = attendanceBase > 0 ? Math.round((attended / attendanceBase) * 1000) / 10 : 0;
    const repeatClients = await prisma.trainerClient.count({ where: { trainerId, sessionsCompletedCount: { gte: 2 } } });

    res.json({
      range,
      stats: {
        scheduledSessions: scheduled,
        completedSessions: completed,
        attendanceRate,
        noShowRate: attendanceBase > 0 ? Math.round((noShow / attendanceBase) * 1000) / 10 : 0,
        cancellationRate: attendanceBase > 0 ? Math.round((cancelled / attendanceBase) * 1000) / 10 : 0,
        activeClients: clientsCount,
        newClients: newClientsCount,
        repeatClients,
        repeatRate: clientsCount > 0 ? Math.round((repeatClients / clientsCount) * 1000) / 10 : 0,
        recordedRevenueMinor: revenueMinor,
        occupancyRate,
        ratingAvg: reviewsAgg._avg.rating ? Math.round(reviewsAgg._avg.rating * 10) / 10 : null,
        ratingCount: reviewsAgg._count.rating || 0,
      },
    });
  } catch (error) {
    console.error('[TrainerCRM] GET /analytics/overview error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

router.get('/analytics/clients', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const total = await prisma.trainerClient.count({ where: { trainerId } });
    const byStatus = await prisma.trainerClient.groupBy({ by: ['status'], where: { trainerId }, _count: true });
    const bySource = await prisma.trainerClient.groupBy({ by: ['source'], where: { trainerId }, _count: true });

    res.json({
      total,
      byStatus: byStatus.map((row) => ({ key: row.status, count: row._count })),
      bySource: bySource.map((row) => ({ key: row.source, count: row._count })),
    });
  } catch (error) {
    console.error('[TrainerCRM] GET /analytics/clients error:', error);
    res.status(500).json({ error: 'Failed to fetch client analytics' });
  }
});

router.get('/analytics/sessions', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const sessionsByType = await prisma.trainerSession.groupBy({ by: ['type', 'status'], where: { trainerId }, _count: true });
    const sessionsByDiscipline = await prisma.trainerSession.groupBy({ by: ['discipline'], where: { trainerId }, _count: true });

    res.json({
      byType: sessionsByType.map((row) => ({ type: row.type, status: row.status, count: row._count })),
      byDiscipline: sessionsByDiscipline.map((row) => ({ discipline: row.discipline || 'unknown', count: row._count })),
    });
  } catch (error) {
    console.error('[TrainerCRM] GET /analytics/sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch session analytics' });
  }
});

router.get('/export/clients.csv', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const clients = await prisma.trainerClient.findMany({ where: { trainerId }, orderBy: { createdAt: 'desc' } });
    const header = 'id,fullName,phone,telegramHandle,email,status,source,sessionsCompletedCount,noShowCount,cancelledCount,lifetimeValueMinor,currency\n';
    const rows = clients.map((client) => [client.id, client.fullName, client.phone || '', client.telegramHandle || '', client.email || '', client.status, client.source, client.sessionsCompletedCount, client.noShowCount, client.cancelledCount, client.lifetimeValueMinor, client.currency].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(header + rows.join('\n'));
  } catch (error) {
    console.error('[TrainerCRM] GET /export/clients.csv error:', error);
    res.status(500).json({ error: 'Failed to export clients' });
  }
});

router.get('/export/sessions.csv', async (req: Request, res: Response) => {
  try {
    const trainerId = req.auth!.userId;
    const sessions = await prisma.trainerSession.findMany({ where: { trainerId }, orderBy: { startAt: 'desc' } });
    const header = 'id,title,type,visibility,status,startAt,endAt,durationMin,capacity,priceMinor,currency,linkedEventId\n';
    const rows = sessions.map((session) => [session.id, session.title, session.type, session.visibility, session.status, session.startAt.toISOString(), session.endAt?.toISOString() || '', session.durationMin, session.capacity || '', session.priceMinor || '', session.currency, session.linkedEventId || ''].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(header + rows.join('\n'));
  } catch (error) {
    console.error('[TrainerCRM] GET /export/sessions.csv error:', error);
    res.status(500).json({ error: 'Failed to export sessions' });
  }
});

export { router as trainerCrmRouter };
