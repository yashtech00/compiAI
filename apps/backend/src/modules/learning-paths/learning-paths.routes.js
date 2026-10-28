import { Router } from 'express';
import { RoadmapService } from './roadmap.service.js';
import { AdaptiveEngine } from '../recommendations/adaptive-engine.js';
import prisma from '../../config/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';
import { successResponse } from '../../utils/response.js';

const router = Router();

// GET /api/v1/learning-paths/history - My Learning user-facing view (Hides future roadmap)
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Current Learning Focus (From AdaptiveEngine)
    const decision = await AdaptiveEngine.evaluateNextAction(userId);

    // 2. Completed Concepts
    const completedUserConcepts = await prisma.userConcept.findMany({
      where: {
        userId,
        masteryScore: { gte: 70 }
      },
      include: {
        concept: {
          include: {
            skill: true,
            lessons: { where: { status: 'PUBLISHED' }, take: 1 }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // 3. Concepts Needing Reinforcement
    const reinforcementConcepts = await prisma.userConcept.findMany({
      where: {
        userId,
        attempts: { gt: 0 },
        masteryScore: { lt: 70 }
      },
      include: {
        concept: {
          include: {
            skill: true,
            lessons: { where: { status: 'PUBLISHED' }, take: 1 }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // 4. Recent Learning Activities
    const recentActivities = await prisma.learningActivity.findMany({
      where: { userId },
      include: {
        concept: {
          include: { skill: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // 5. Progress summary
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, streak: true }
    });

    return successResponse(res, {
      currentFocus: {
        actionType: decision.actionType,
        concept: decision.concept ? {
          id: decision.concept.id,
          name: decision.concept.name,
          slug: decision.concept.slug,
          skillName: decision.concept.skill?.name
        } : null,
        lessonSlug: decision.lesson?.slug || null,
        reason: decision.reason
      },
      completedConcepts: completedUserConcepts.map(uc => ({
        id: uc.concept.id,
        name: uc.concept.name,
        slug: uc.concept.slug,
        skillName: uc.concept.skill.name,
        masteryScore: uc.masteryScore,
        attempts: uc.attempts,
        lastSeenAt: uc.lastSeenAt,
        lessonSlug: uc.concept.lessons?.[0]?.slug || null
      })),
      reinforcementNeeded: reinforcementConcepts.map(uc => ({
        id: uc.concept.id,
        name: uc.concept.name,
        slug: uc.concept.slug,
        skillName: uc.concept.skill.name,
        masteryScore: uc.masteryScore,
        misconceptions: uc.misconceptions,
        lessonSlug: uc.concept.lessons?.[0]?.slug || null
      })),
      recentActivities: recentActivities.map(ra => ({
        id: ra.id,
        activityType: ra.activityType,
        conceptName: ra.concept?.name || 'General Engineering',
        skillName: ra.concept?.skill?.name || 'Fundamentals',
        durationMinutes: Math.max(1, Math.round(ra.durationSeconds / 60)),
        createdAt: ra.createdAt
      })),
      summary: {
        completedCount: completedUserConcepts.length,
        continuityDays: user?.streak?.currentStreak || 0,
        dailyMinutes: user?.profile?.dailyMinutes || 15
      }
    }, 'My Learning history loaded');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/learning-paths/current
// Learner-facing guard: Hides complete future roadmap for non-admins, returning only completed items and current active focus
router.get('/current', requireAuth, async (req, res, next) => {
  try {
    const roadmap = await RoadmapService.getCurrentRoadmap(req.user.id);
    const isAdmin = req.user.role === 'ADMIN';

    if (isAdmin) {
      return successResponse(res, { roadmap }, 'Current roadmap loaded (Admin View)');
    }

    // For standard learners: Protect learner experience by hiding future roadmap
    const sanitizedItems = roadmap.items.filter(item =>
      item.status === 'COMPLETED' || item.status === 'IN_PROGRESS'
    );

    const sanitizedRoadmap = {
      id: roadmap.id,
      title: roadmap.title,
      targetGoal: roadmap.targetGoal,
      pedagogicalApproach: roadmap.pedagogicalApproach,
      version: roadmap.version,
      status: roadmap.status,
      analysisType: roadmap.analysisType,
      completionPercentage: roadmap.completionPercentage,
      createdAt: roadmap.createdAt,
      items: sanitizedItems.map(item => ({
        ...item,
        milestoneId: item.milestoneId || item.concept?.slug,
        title: item.title || item.concept?.name,
        targetOutcome: item.targetOutcome || item.concept?.description
      })),
      totalMilestonesCount: roadmap.items.length
    };

    return successResponse(res, { roadmap: sanitizedRoadmap }, 'Current roadmap loaded');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/learning-paths/regenerate
router.post('/regenerate', requireAuth, async (req, res, next) => {
  try {
    const roadmap = await RoadmapService.generateRoadmap(req.user.id, { force: true });
    return successResponse(res, { roadmap }, 'Roadmap regenerated successfully');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/learning-paths/review-checkpoint - Manual/Admin triggered periodic review
router.post('/review-checkpoint', requireAuth, async (req, res, next) => {
  try {
    const result = await AdaptiveEngine.evaluatePeriodicCheckpoints(req.user.id);
    return successResponse(res, { result }, 'Periodic adaptive review evaluated');
  } catch (error) {
    next(error);
  }
});

export default router;
