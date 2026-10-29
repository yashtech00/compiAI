import { Router } from 'express';
import prisma from '../../config/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';
import { successResponse } from '../../utils/response.js';

const router = Router();

// GET /api/v1/dashboard/stats
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. User profile and streak
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        streak: true
      }
    });

    // 2. User skills with concepts and userConcepts
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: {
          include: {
            concepts: {
              include: {
                userConcepts: {
                  where: { userId }
                },
                lessons: {
                  where: { status: 'PUBLISHED' },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    const skills = userSkills.map(us => {
      const concepts = (us.skill?.concepts || []).map(c => {
        const uc = c.userConcepts?.[0];
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          masteryScore: uc?.masteryScore || 0,
          updatedAt: uc?.updatedAt || c.updatedAt,
          misconceptions: uc?.misconceptions || [],
          lessons: c.lessons || []
        };
      });

      return {
        id: us.skillId,
        name: us.skill.name,
        slug: us.skill.slug,
        category: us.skill.category,
        masteryScore: us.masteryScore,
        confidenceScore: us.confidenceScore,
        concepts
      };
    });

    return successResponse(res, {
      profile: {
        ...(user?.profile || {}),
        streakDays: user?.streak?.currentStreak || 0,
        totalPoints: user?.profile?.totalPoints || 0
      },
      skills,
      streak: {
        current: user?.streak?.currentStreak || 0,
        longest: user?.streak?.longestStreak || 0
      }
    }, 'Dashboard stats loaded');
  } catch (error) {
    next(error);
  }
});

export default router;
