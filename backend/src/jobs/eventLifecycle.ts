/**
 * Event Lifecycle Job
 * Автоматически завершает события через 3 часа после окончания
 * и закрывает связанные записи в waiting list
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Auto-finish grace period: 3 hours after event end
const AUTO_FINISH_GRACE_HOURS = 3;

// Fallback window for events without endAt.
// We assume events should never run longer than this; used only to limit DB scan size.
const MAX_EVENT_DURATION_HOURS_FALLBACK = 12;

/**
 * Calculate event end time from startAt and durationMin
 */
function calculateEventEndAt(startAt: Date, durationMin: number | null, endAt: Date | null): Date {
  if (endAt) return endAt;
  if (durationMin) {
    return new Date(startAt.getTime() + durationMin * 60 * 1000);
  }
  return startAt;
}

/**
 * Auto-finish events that ended more than AUTO_FINISH_GRACE_HOURS ago
 */
async function autoFinishExpiredEvents(): Promise<number> {
  const now = new Date();
  const graceMs = AUTO_FINISH_GRACE_HOURS * 60 * 60 * 1000;

  const endAtCutoff = new Date(now.getTime() - graceMs);
  const startAtFallbackCutoff = new Date(
    now.getTime() - graceMs - MAX_EVENT_DURATION_HOURS_FALLBACK * 60 * 60 * 1000
  );

  // Find all approved events that should be auto-finished
  // We need to calculate endAt for each event
  const approvedEvents = await prisma.event.findMany({
    where: {
      status: 'approved',
      OR: [
        // Preferred path: endAt exists
        { endAt: { not: null, lte: endAtCutoff } },
        // Fallback: endAt is missing, only consider very old started events
        { endAt: null, startAt: { lte: startAtFallbackCutoff } },
      ],
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      durationMin: true,
      endAt: true,
    },
  });

  let finishedCount = 0;

  for (const event of approvedEvents) {
    const eventEndAt = calculateEventEndAt(event.startAt, event.durationMin, event.endAt);
    const autoFinishTime = new Date(eventEndAt.getTime() + graceMs);

    // Check if we're past the auto-finish time
    if (now >= autoFinishTime) {
      try {
        // Transaction: finish event and close waiting list entries
        await prisma.$transaction([
          // Update event status to finished
          prisma.event.update({
            where: { id: event.id },
            data: {
              status: 'finished',
              endAt: event.endAt || eventEndAt,
            },
          }),
          // Close all waiting/offered entries
          prisma.waitingListEntry.updateMany({
            where: {
              eventId: event.id,
              status: { in: ['waiting', 'offered'] },
            },
            data: { status: 'canceled' },
          }),
        ]);

        console.log(`[EventLifecycle] Auto-finished event "${event.title}" (${event.id})`);
        finishedCount++;
      } catch (error) {
        console.error(`[EventLifecycle] Failed to auto-finish event ${event.id}:`, error);
      }
    }
  }

  return finishedCount;
}

/**
 * Mark no-show participants for finished events
 * Participants who remained in 'joined' status after event finished
 * and attendance window expired should be marked as 'no_show'
 */
async function markNoShowParticipants(): Promise<number> {
  const now = new Date();
  const ATTENDANCE_WINDOW_HOURS = 24;

  const windowCutoff = new Date(now.getTime() - ATTENDANCE_WINDOW_HOURS * 60 * 60 * 1000);

  // Find finished events where attendance window has expired
  const finishedEvents = await prisma.event.findMany({
    where: {
      status: 'finished',
      // Most finished events have endAt set (organizer finish / auto-finish). Use it to avoid full scans.
      endAt: { not: null, lte: windowCutoff },
    },
    select: {
      id: true,
      startAt: true,
      durationMin: true,
      endAt: true,
    },
  });

  let noShowCount = 0;

  for (const event of finishedEvents) {
    const eventEndAt = calculateEventEndAt(event.startAt, event.durationMin, event.endAt);
    const windowEnd = new Date(eventEndAt.getTime() + ATTENDANCE_WINDOW_HOURS * 60 * 60 * 1000);

    // If attendance window has expired
    if (now > windowEnd) {
      const result = await prisma.participation.updateMany({
        where: {
          eventId: event.id,
          status: 'joined', // Still joined = didn't confirm attendance
        },
        data: {
          status: 'no_show',
        },
      });

      if (result.count > 0) {
        console.log(`[EventLifecycle] Marked ${result.count} no-shows for event ${event.id}`);
        noShowCount += result.count;
      }
    }
  }

  return noShowCount;
}

/**
 * Main job function
 */
export async function processEventLifecycle(): Promise<void> {
  console.log('[EventLifecycle] Starting event lifecycle job...');

  const finishedCount = await autoFinishExpiredEvents();
  const noShowCount = await markNoShowParticipants();

  console.log(`[EventLifecycle] Job completed: auto-finished ${finishedCount} events, marked ${noShowCount} no-shows`);
}

/**
 * Start cron job
 * Default interval: 10 minutes
 */
export function startEventLifecycleCron(intervalMs: number = 10 * 60 * 1000): void {
  console.log(`[EventLifecycle] Starting cron job with interval ${intervalMs}ms (${intervalMs / 60000} min)`);

  // First run immediately
  processEventLifecycle().catch((err) => {
    console.error('[EventLifecycle] Error in initial run:', err);
  });

  // Repeat at interval
  setInterval(() => {
    processEventLifecycle().catch((err) => {
      console.error('[EventLifecycle] Error in cron run:', err);
    });
  }, intervalMs);
}
