import { Router } from 'express';
import prisma from '../../config/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';
import { successResponse } from '../../utils/response.js';
import { AppError } from '../../middlewares/errorHandler.js';

const router = Router();

// GET /api/v1/lessons - List published lessons
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const lessons = await prisma.lesson.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        concept: {
          include: { skill: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    return successResponse(res, { lessons }, 'Lessons retrieved');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/lessons/:idOrSlug - Get detailed lesson by ID or slug
router.get('/:idOrSlug', requireAuth, async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const lesson = await prisma.lesson.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug }
        ],
        status: 'PUBLISHED'
      },
      include: {
        concept: {
          include: {
            skill: true,
            prerequisites: {
              include: { prerequisiteConcept: true }
            }
          }
        },
        activities: {
          orderBy: { sequenceOrder: 'asc' }
        },
        quizzes: {
          where: { status: 'ACTIVE' },
          take: 1,
          select: {
            id: true,
            title: true,
            questions: {
              select: {
                id: true,
                questionType: true,
                questionText: true,
                options: true,
                difficulty: true
              }
            }
          }
        }
      }
    });

    if (!lesson) {
      throw new AppError('Lesson not found', 404, 'LESSON_NOT_FOUND');
    }

    return successResponse(res, { lesson }, 'Lesson loaded');
  } catch (error) {
    next(error);
  }
});

export default router;
