import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../config/prisma.js';
import { requireAuth, requireAdmin } from '../../middlewares/auth.js';
import { successResponse, errorResponse } from '../../utils/response.js';

const router = Router();

// Protect all admin endpoints with requireAuth and requireAdmin
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/v1/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [totalUsers, totalSessions, totalSkills, totalConcepts, proSubscriptions] = await Promise.all([
      prisma.user.count(),
      prisma.learningSession.count(),
      prisma.skill.count(),
      prisma.concept.count(),
      prisma.subscription.count({
        where: { plan: { code: 'PRO' }, status: 'ACTIVE' }
      })
    ]);

    return successResponse(res, {
      totalUsers,
      totalSessions,
      totalSkills,
      totalConcepts,
      proSubscriptions
    }, 'Admin statistics retrieved');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/skills
router.get('/skills', async (req, res, next) => {
  try {
    const skills = await prisma.skill.findMany({
      include: {
        concepts: {
          select: { id: true, name: true, difficulty: true, status: true }
        },
        prerequisites: {
          include: { prerequisiteSkill: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return successResponse(res, { skills }, 'Admin skills list');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/admin/skills
const createSkillSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  category: z.string(),
  description: z.string(),
  difficulty: z.number().int().min(1).max(5).default(1)
});

router.post('/skills', async (req, res, next) => {
  try {
    const validated = createSkillSchema.parse(req.body);
    const skill = await prisma.skill.create({
      data: validated
    });
    return successResponse(res, { skill }, 'Skill created', 201);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/admin/check-cycles - Algorithmic validation to ensure no prerequisite cycles exist
router.get('/check-cycles', async (req, res, next) => {
  try {
    // 1. Check Concept Prerequisite Graph
    const conceptPrereqs = await prisma.conceptPrerequisite.findMany({
      select: { conceptId: true, prerequisiteConceptId: true }
    });

    const adj = new Map();
    const allNodes = new Set();

    for (const cp of conceptPrereqs) {
      allNodes.add(cp.conceptId);
      allNodes.add(cp.prerequisiteConceptId);
      if (!adj.has(cp.conceptId)) adj.set(cp.conceptId, []);
      adj.get(cp.conceptId).push(cp.prerequisiteConceptId);
    }

    // DFS Cycle detection: 0 = unvisited, 1 = visiting, 2 = visited
    const state = new Map();
    let hasCycle = false;
    let cyclePath = [];

    function dfs(node, path) {
      state.set(node, 1);
      const neighbors = adj.get(node) || [];
      for (const n of neighbors) {
        if (state.get(n) === 1) {
          hasCycle = true;
          cyclePath = [...path, n];
          return true;
        }
        if (!state.has(n) || state.get(n) === 0) {
          if (dfs(n, [...path, n])) return true;
        }
      }
      state.set(node, 2);
      return false;
    }

    for (const node of allNodes) {
      if (!state.has(node) || state.get(node) === 0) {
        if (dfs(node, [node])) break;
      }
    }

    return successResponse(res, {
      hasCycle,
      nodesChecked: allNodes.size,
      edgesChecked: conceptPrereqs.length,
      cycleDetails: hasCycle ? `Cycle detected involving: ${cyclePath.join(' -> ')}` : 'Prerequisite graph is a valid Directed Acyclic Graph (DAG).'
    }, 'Prerequisite graph validation complete');
  } catch (error) {
    next(error);
  }
});

export default router;
