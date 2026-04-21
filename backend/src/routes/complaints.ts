import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';

const router = Router();

// POST /api/v1/complaints - создать жалобу (для пользователей)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const { targetType, targetId, reason, description } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: 'Missing required fields: targetType, targetId, reason' });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const complaint = await prisma.complaint.create({
      data: {
        targetType,
        targetId,
        reason,
        description: description.trim(),
        reporterId: userId,
        reporterName: user?.name,
      },
    });

    res.status(201).json({
      id: complaint.id,
      status: complaint.status,
      createdAt: complaint.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('[Complaints] POST /complaints error:', error);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
});

export const complaintsRouter = router;
