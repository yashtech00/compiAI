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
      where: {
        status: 'PUBLISHED',
        OR: [
          { userId: null },
          { userId: req.user.id }
        ]
      },
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
    let lesson = await prisma.lesson.findFirst({
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

    // If lesson not found directly by id or slug, check if idOrSlug refers to a custom Concept or Milestone
    if (!lesson) {
      const { SessionGeneratorService } = await import('./session-generator.service.js');
      const concept = await prisma.concept.findFirst({
        where: {
          AND: [
            {
              OR: [
                { id: idOrSlug },
                { slug: idOrSlug }
              ]
            },
            {
              OR: [
                { isCustom: false },
                { userId: req.user.id }
              ]
            }
          ]
        }
      });

      if (concept) {
        const generated = await SessionGeneratorService.getOrCreateSession({
          userId: req.user.id,
          conceptId: concept.id
        });

        if (generated) {
          // Re-fetch sanitized lesson structure (stripping answer and explanation)
          lesson = await prisma.lesson.findUnique({
            where: { id: generated.id },
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
        }
      }
    }

    if (!lesson) {
      throw new AppError('Lesson not found', 404, 'LESSON_NOT_FOUND');
    }

    // Authorization check: If this is an AI-generated lesson scoped to another user, forbid access
    if (lesson.userId && lesson.userId !== req.user.id) {
      throw new AppError('Unauthorized access to lesson', 403, 'FORBIDDEN');
    }

    return successResponse(res, { lesson }, 'Lesson loaded');
  } catch (error) {
    next(error);
  }
});

export default router;
