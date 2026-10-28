import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../config/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';
import { successResponse } from '../../utils/response.js';
import { AppError } from '../../middlewares/errorHandler.js';

const router = Router();

// GET /api/v1/recall/due - List concepts due for spaced repetition review
router.get('/due', requireAuth, async (req, res, next) => {
  try {
    const now = new Date();
    const dueItems = await prisma.recallSchedule.findMany({
      where: {
        userId: req.user.id,
        scheduledAt: { lte: now },
        status: 'SCHEDULED'
      },
      include: {
        concept: {
          include: {
            skill: true,
            lessons: {
              take: 1,
              select: { id: true, title: true, slug: true }
            }
          }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    return successResponse(res, { dueItems }, 'Due recall concepts retrieved');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/recall/submit - Submit spaced repetition recall attempt
const recallSubmitSchema = z.object({
  conceptId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  recalled: z.boolean(),
  confidence: z.number().min(0).max(1).default(1.0)
});

router.post('/submit', requireAuth, async (req, res, next) => {
  try {
    const { conceptId, rating, recalled, confidence } = recallSubmitSchema.parse(req.body);

    const schedule = await prisma.recallSchedule.findUnique({
      where: { userId_conceptId: { userId: req.user.id, conceptId } }
    });

    const currentInterval = schedule?.intervalDays || 1;
    let nextIntervalDays = 1;

    if (recalled && rating >= 3) {
      const factor = 1.6 + (rating - 3) * 0.3; // 3->1.6x, 4->1.9x, 5->2.2x
      nextIntervalDays = Math.min(90, Math.max(2, Math.round(currentInterval * factor)));
    } else {
      nextIntervalDays = 1; // Reset to 1 day if failed
    }

    const nextScheduledDate = new Date(Date.now() + nextIntervalDays * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Record RecallAttempt
      const attempt = await tx.recallAttempt.create({
        data: {
          scheduleId: schedule?.id || null,
          userId: req.user.id,
          conceptId,
          rating,
          recalled,
          confidence,
          attemptedAt: new Date()
        }
      });

      // 2. Update RecallSchedule
      const updatedSchedule = await tx.recallSchedule.upsert({
        where: { userId_conceptId: { userId: req.user.id, conceptId } },
        update: {
          scheduledAt: nextScheduledDate,
          intervalDays: nextIntervalDays,
          predictedRecall: recalled ? 0.92 : 0.5,
          status: 'SCHEDULED'
        },
        create: {
          userId: req.user.id,
          conceptId,
          scheduledAt: nextScheduledDate,
          intervalDays: nextIntervalDays,
          predictedRecall: recalled ? 0.92 : 0.5,
          status: 'SCHEDULED'
        }
      });

      // 3. Update UserConcept confidence and next review
      await tx.userConcept.updateMany({
        where: { userId: req.user.id, conceptId },
        data: {
          confidenceScore: recalled ? 85.0 : 40.0,
          nextReviewAt: nextScheduledDate,
          lastSeenAt: new Date()
        }
      });

      // 4. Record learning activity
      await tx.learningActivity.create({
        data: {
          userId: req.user.id,
          conceptId,
          activityType: 'RECALL',
          sourceType: 'RECALL_ATTEMPT',
          sourceId: attempt.id,
          score: (rating / 5) * 100,
          durationSeconds: 60
        }
      });

      // 5. Award XP (25 XP for recall)
      await tx.xpTransaction.upsert({
        where: {
          userId_sourceType_sourceId: {
            userId: req.user.id,
            sourceType: 'RECALL',
            sourceId: attempt.id
          }
        },
        update: {},
        create: {
          userId: req.user.id,
          sourceType: 'RECALL',
          sourceId: attempt.id,
          amount: 25
        }
      });

      return {
        attemptId: attempt.id,
        nextIntervalDays,
        nextScheduledAt: nextScheduledDate,
        xpAwarded: 25
      };
    });

    return successResponse(res, { result }, 'Recall attempt recorded and review rescheduled');
  } catch (error) {
    next(error);
  }
});

export default router;
