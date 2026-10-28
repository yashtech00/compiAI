import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../config/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';
import { successResponse } from '../../utils/response.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { AdaptiveEngine } from '../recommendations/adaptive-engine.js';

const router = Router();

// GET /api/v1/sessions/active/:lessonId - Retrieve any resumable in-progress session
router.get('/active/:lessonId', requireAuth, async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const session = await prisma.learningSession.findFirst({
      where: {
        userId: req.user.id,
        lessonId,
        status: { in: ['STARTED', 'IN_PROGRESS'] }
      },
      orderBy: { startedAt: 'desc' }
    });

    return successResponse(res, { session: session || null }, 'Active session status');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/sessions/start - Start or resume session
const startSessionSchema = z.object({
  lessonId: z.string().uuid(),
  sessionType: z.enum(['DAILY_LESSON', 'REVIEW', 'RECALL']).default('DAILY_LESSON')
});

router.post('/start', requireAuth, async (req, res, next) => {
  try {
    const { lessonId, sessionType } = startSessionSchema.parse(req.body);

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId }
    });
    if (!lesson) {
      throw new AppError('Lesson not found', 404, 'NOT_FOUND');
    }

    // Check if an existing in-progress session already exists to avoid duplication
    const existing = await prisma.learningSession.findFirst({
      where: {
        userId: req.user.id,
        lessonId,
        status: { in: ['STARTED', 'IN_PROGRESS'] }
      },
      orderBy: { startedAt: 'desc' }
    });

    if (existing) {
      return successResponse(res, { session: existing }, 'Resuming active learning session', 200);
    }

    // Capture initial baseline concept mastery
    const userConcept = await prisma.userConcept.findUnique({
      where: {
        userId_conceptId: {
          userId: req.user.id,
          conceptId: lesson.conceptId
        }
      }
    });

    const session = await prisma.learningSession.create({
      data: {
        userId: req.user.id,
        lessonId,
        sessionType,
        status: 'STARTED',
        currentStage: 0,
        initialMastery: userConcept?.masteryScore || 0,
        finalMastery: userConcept?.masteryScore || 0,
        hintsUsed: 0,
        startedAt: new Date()
      }
    });

    return successResponse(res, { session }, 'Learning session started', 201);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/sessions/:id/progress - Save step progress during session (without completing)
const progressSessionSchema = z.object({
  currentStage: z.number().int().min(0),
  savedState: z.record(z.any()).optional(),
  durationSeconds: z.number().int().min(0).optional(),
  hintsUsed: z.number().int().min(0).optional()
});

router.patch('/:id/progress', requireAuth, async (req, res, next) => {
  try {
    const { currentStage, savedState, durationSeconds, hintsUsed } = progressSessionSchema.parse(req.body);

    const session = await prisma.learningSession.findUnique({
      where: { id: req.params.id }
    });

    if (!session || session.userId !== req.user.id) {
      throw new AppError('Session not found', 404, 'NOT_FOUND');
    }

    if (session.status === 'COMPLETED') {
      return successResponse(res, { session }, 'Session is already completed');
    }

    const updated = await prisma.learningSession.update({
      where: { id: session.id },
      data: {
        status: 'IN_PROGRESS',
        currentStage,
        lastSavedState: savedState || undefined,
        durationSeconds: durationSeconds ? Math.max(session.durationSeconds, durationSeconds) : undefined,
        hintsUsed: hintsUsed !== undefined ? Math.max(session.hintsUsed, hintsUsed) : undefined
      }
    });

    return successResponse(res, { session: updated }, 'Progress saved');
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/sessions/:id/complete - Complete learning session idempotently
const completeSessionSchema = z.object({
  durationSeconds: z.number().int().min(1),
  hintsUsed: z.number().int().min(0).optional()
});

router.patch('/:id/complete', requireAuth, async (req, res, next) => {
  try {
    const { durationSeconds, hintsUsed } = completeSessionSchema.parse(req.body);

    const session = await prisma.learningSession.findUnique({
      where: { id: req.params.id },
      include: {
        lesson: {
          include: { concept: true }
        }
      }
    });

    if (!session || session.userId !== req.user.id) {
      throw new AppError('Session not found', 404, 'NOT_FOUND');
    }

    if (session.status === 'COMPLETED') {
      return successResponse(res, { session }, 'Session already completed');
    }

    // Retrieve latest concept mastery to snapshot finalMastery
    const latestConcept = await prisma.userConcept.findUnique({
      where: {
        userId_conceptId: {
          userId: req.user.id,
          conceptId: session.lesson.conceptId
        }
      }
    });

    const finalMastery = latestConcept?.masteryScore || session.initialMastery || 0;
    const finalHints = Math.max(session.hintsUsed, hintsUsed || 0);

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mark session completed
      const updatedSession = await tx.learningSession.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          currentStage: 9,
          durationSeconds,
          hintsUsed: finalHints,
          finalMastery,
          completedAt: new Date()
        }
      });

      // 2. Record learning activity
      await tx.learningActivity.create({
        data: {
          userId: req.user.id,
          conceptId: session.lesson.conceptId,
          activityType: 'LESSON',
          sourceType: 'LEARNING_SESSION',
          sourceId: session.id,
          durationSeconds
        }
      });

      // 3. Award XP for completing lesson (30 XP, idempotently)
      await tx.xpTransaction.upsert({
        where: {
          userId_sourceType_sourceId: {
            userId: req.user.id,
            sourceType: 'LESSON',
            sourceId: session.id
          }
        },
        update: {},
        create: {
          userId: req.user.id,
          sourceType: 'LESSON',
          sourceId: session.id,
          amount: 30
        }
      });

      return updatedSession;
    });

    // 4. Check periodic adaptation checkpoints (Layer 2 & Layer 3)
    let adaptiveReview = null;
    try {
      adaptiveReview = await AdaptiveEngine.evaluatePeriodicCheckpoints(req.user.id);
    } catch (err) {
      console.error('Periodic adaptive review check failed non-critically:', err);
    }

    return successResponse(res, {
      session: updated,
      adaptiveReview
    }, 'Session completed');
  } catch (error) {
    next(error);
  }
});

export default router;
