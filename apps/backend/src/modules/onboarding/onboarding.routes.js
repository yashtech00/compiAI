import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../config/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';
import { successResponse } from '../../utils/response.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { RoadmapService } from '../learning-paths/roadmap.service.js';

const router = Router();

// GET /api/v1/onboarding/state
router.get('/state', requireAuth, async (req, res, next) => {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: req.user.id }
    });

    const activeGoal = await prisma.learningGoal.findFirst({
      where: { userId: req.user.id, status: 'ACTIVE' },
      include: { targetRole: true },
      orderBy: { createdAt: 'desc' }
    });

    const userSkills = await prisma.userSkill.findMany({
      where: { userId: req.user.id },
      include: { skill: true }
    });

    return successResponse(res, {
      onboardingCompleted: profile?.onboardingCompleted ?? false,
      currentStep: profile?.onboardingStep ?? 1,
      profile,
      activeGoal,
      knownSkills: userSkills.map(us => us.skill.slug)
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/onboarding/step
const saveStepSchema = z.object({
  step: z.number().int().min(1).max(5),
  goalTitle: z.string().optional(),
  targetRoleId: z.string().uuid().optional(),
  experienceLevel: z.enum(['BEGINNER', 'STUDENT', 'JUNIOR', 'INTERMEDIATE', 'ADVANCED']).optional(),
  dailyMinutes: z.number().int().min(5).max(120).optional(),
  knownSkillSlugs: z.array(z.string()).optional()
});

router.post('/step', requireAuth, async (req, res, next) => {
  try {
    const data = saveStepSchema.parse(req.body);

    await prisma.$transaction(async (tx) => {
      // 1. Update Profile step and preferences
      const profileUpdate = {
        onboardingStep: Math.max(data.step + 1, req.user.profile?.onboardingStep || 1)
      };
      if (data.experienceLevel) profileUpdate.experienceLevel = data.experienceLevel;
      if (data.dailyMinutes) profileUpdate.dailyMinutes = data.dailyMinutes;

      await tx.userProfile.update({
        where: { userId: req.user.id },
        data: profileUpdate
      });

      // 2. Update or create Learning Goal if provided
      if (data.goalTitle || data.targetRoleId) {
        const existingGoal = await tx.learningGoal.findFirst({
          where: { userId: req.user.id, status: 'ACTIVE' }
        });

        if (existingGoal) {
          await tx.learningGoal.update({
            where: { id: existingGoal.id },
            data: {
              title: data.goalTitle || existingGoal.title,
              targetRoleId: data.targetRoleId || existingGoal.targetRoleId
            }
          });
        } else {
          await tx.learningGoal.create({
            data: {
              userId: req.user.id,
              title: data.goalTitle || 'Become a Software Engineer',
              targetRoleId: data.targetRoleId || null,
              status: 'ACTIVE'
            }
          });
        }
      }

      // 3. Save Known Skills as self-reported exposure WITHOUT fabricating mastery
      if (data.knownSkillSlugs && data.knownSkillSlugs.length > 0) {
        const skills = await tx.skill.findMany({
          where: { slug: { in: data.knownSkillSlugs } }
        });

        for (const s of skills) {
          // Record skill record with 0.0 mastery score until verified by assessment or practice evidence
          await tx.userSkill.upsert({
            where: {
              userId_skillId: {
                userId: req.user.id,
                skillId: s.id
              }
            },
            update: {
              // Preserve existing mastery if already assessed; do NOT fabricate scores
            },
            create: {
              userId: req.user.id,
              skillId: s.id,
              masteryScore: 0.0,
              confidenceScore: 10.0,
              lastPracticedAt: null
            }
          });
        }
      }
    });

    const updatedProfile = await prisma.userProfile.findUnique({
      where: { userId: req.user.id }
    });

    return successResponse(res, { profile: updatedProfile }, 'Onboarding step saved');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/onboarding/complete
router.post('/complete', requireAuth, async (req, res, next) => {
  try {
    const profile = await prisma.userProfile.update({
      where: { userId: req.user.id },
      data: {
        onboardingCompleted: true,
        onboardingStep: 5
      }
    });

    // Proactively generate the version 1 learning path tailored to onboarding selections
    let initialRoadmap = null;
    try {
      initialRoadmap = await RoadmapService.generateRoadmap(req.user.id);
    } catch (err) {
      console.error('Roadmap generation on onboarding complete error:', err);
    }

    return successResponse(res, {
      profile,
      roadmap: initialRoadmap
    }, 'Onboarding marked complete and initial roadmap initialized');
  } catch (error) {
    next(error);
  }
});

export default router;
