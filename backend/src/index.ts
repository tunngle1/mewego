import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { eventsRouter } from './routes/events';
import { organizerRouter } from './routes/organizer';
import { adminRouter } from './routes/admin';
import { meRouter } from './routes/me';
import { authRouter } from './routes/auth';
import { emailAuthRouter } from './routes/emailAuth';
import { complaintsRouter } from './routes/complaints';
import { subscriptionsRouter } from './routes/subscriptions';
import { gamificationRouter } from './routes/gamification';
import { trainersRouter } from './routes/trainers';
import { usersRouter } from './routes/users';
import { trainerCrmRouter } from './routes/trainerCrm';
import { authMiddleware } from './middleware/auth';
import { startRemindersCron } from './jobs/reminders';
import { startWaitingListCron } from './jobs/waitingList';
import { startEventLifecycleCron } from './jobs/eventLifecycle';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (не требуют авторизации)
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/auth', emailAuthRouter);

// Auth middleware (temporary: uses x-user-id and x-user-role headers)
app.use('/api/v1', authMiddleware);

// Routes
app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/organizer', organizerRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/me', meRouter);
app.use('/api/v1/complaints', complaintsRouter);
app.use('/api/v1/subscriptions', subscriptionsRouter);
app.use('/api/v1', gamificationRouter);
app.use('/api/v1/trainers', trainersRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/trainer-crm', trainerCrmRouter);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/v1/health`);

  // Start background jobs
  if (process.env.ENABLE_CRON_JOBS !== 'false') {
    startRemindersCron(5 * 60 * 1000); // Every 5 minutes
    startWaitingListCron(2 * 60 * 1000); // Every 2 minutes
    startEventLifecycleCron(10 * 60 * 1000); // Every 10 minutes (auto-finish, no-show marking)
    console.log('📅 Cron jobs started (reminders, waiting list, event lifecycle)');
  }
});

export { prisma };
