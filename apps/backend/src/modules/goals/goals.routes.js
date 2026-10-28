import { Router } from 'express';
import prisma from '../../config/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';
import { successResponse } from '../../utils/response.js';
import { z } from 'zod';

const router = Router();

import { MasterPathRegistry } from '../../curriculum/master-paths/master-path.registry.js';

// GET /api/v1/roles - Public or authenticated
router.get('/roles', async (req, res, next) => {
  try {
    let roles = [];
    try {
      roles = await prisma.targetRole.findMany({
        where: { status: 'ACTIVE' },
        include: {
          roleSkills: {
            include: { skill: true }
          }
        },
        orderBy: { name: 'asc' }
      });
    } catch (dbErr) {
      // Fallback if DB is temporarily unreachable
      roles = [];
    }

    if (!roles || roles.length === 0) {
      const supported = MasterPathRegistry.listSupportedGoals();
      roles = supported.map(g => ({
        id: g.goalId,
        slug: g.goalId,
        name: g.title,
        description: g.description,
        status: 'ACTIVE'
      }));
    }

    return successResponse(res, { roles }, 'Target roles retrieved');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/goals/current
router.get('/goals/current', requireAuth, async (req, res, next) => {
  try {
    const goal = await prisma.learningGoal.findFirst({
      where: { userId: req.user.id, status: 'ACTIVE' },
      include: {
        targetRole: {
          include: {
            roleSkills: {
              include: { skill: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return successResponse(res, { goal }, 'Current learning goal');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/goals
const createGoalSchema = z.object({
  title: z.string().min(2),
  targetRoleId: z.string().uuid().optional(),
  targetReadiness: z.number().int().min(10).max(100).default(80)
});

router.post('/goals', requireAuth, async (req, res, next) => {
  try {
    const validated = createGoalSchema.parse(req.body);

    // Archive previous active goals
    await prisma.learningGoal.updateMany({
      where: { userId: req.user.id, status: 'ACTIVE' },
      data: { status: 'ARCHIVED' }
    });

    const goal = await prisma.learningGoal.create({
      data: {
        userId: req.user.id,
        title: validated.title,
        targetRoleId: validated.targetRoleId || null,
        targetReadiness: validated.targetReadiness,
        status: 'ACTIVE'
      },
      include: { targetRole: true }
    });

    return successResponse(res, { goal }, 'Learning goal saved', 201);
  } catch (error) {
    next(error);
  }
});

export default router;
