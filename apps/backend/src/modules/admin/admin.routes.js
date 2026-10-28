import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import prisma from '../../config/prisma.js';
import { requireAuth, requireAdmin } from '../../middlewares/auth.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { AdminOverviewService } from './admin-overview.service.js';
import { AdminStudentsService } from './admin-students.service.js';
import { AdminRoadmapsService } from './admin-roadmaps.service.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { AdminAdaptationService } from './admin-adaptation.service.js';
import { AdminRolesService } from './admin-roles.service.js';
import { AuditService } from './audit.service.js';

const router = Router();

// Protect ALL admin endpoints with server-side authentication and authorization
router.use(requireAuth);
router.use(requireAdmin);

// ==========================================
// 1. OVERVIEW & TELEMETRY
// ==========================================

// GET /api/v1/admin/overview
router.get('/overview', async (req, res, next) => {
  try {
    const { timeRange, startDate, endDate, targetRoleId, status } = req.query;
    const overview = await AdminOverviewService.getOverview({
      timeRange: timeRange || '30d',
      startDate,
      endDate,
      targetRoleId,
      status
    });
    return successResponse(res, overview, 'Admin overview intelligence retrieved');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/stats (Fast summary counts)
router.get('/stats', async (req, res, next) => {
  try {
    const [totalUsers, totalStudents, totalSessions, totalSkills, totalConcepts, proSubscriptions] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'LEARNER' } }),
      prisma.learningSession.count(),
      prisma.skill.count(),
      prisma.concept.count(),
      prisma.subscription.count({
        where: { plan: { code: 'PRO' }, status: 'ACTIVE' }
      })
    ]);

    return successResponse(res, {
      totalUsers,
      totalStudents,
      totalSessions,
      totalSkills,
      totalConcepts,
      proSubscriptions
    }, 'Admin statistics retrieved');
  } catch (error) {
    next(error);
  }
});

// ==========================================
// TARGET ROLES MANAGEMENT (CRUD)
// ==========================================

// GET /api/v1/admin/roles
router.get('/roles', async (req, res, next) => {
  try {
    const data = await AdminRolesService.listRoles();
    return successResponse(res, data, 'Target roles retrieved');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/admin/roles
const createRoleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  skillIds: z.array(z.string().uuid()).optional().default([]),
  customSkills: z.array(z.string().min(2)).optional().default([])
});

router.post('/roles', async (req, res, next) => {
  try {
    const validated = createRoleSchema.parse(req.body);
    const role = await AdminRolesService.createRole({
      ...validated,
      actor: req.user,
      req
    });
    return successResponse(res, role, 'Target role created successfully', 201);
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/admin/roles/:id
const updateRoleSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(5).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  skillIds: z.array(z.string().uuid()).optional(),
  customSkills: z.array(z.string().min(2)).optional()
});

router.put('/roles/:id', async (req, res, next) => {
  try {
    const validated = updateRoleSchema.parse(req.body);
    const role = await AdminRolesService.updateRole(req.params.id, {
      ...validated,
      actor: req.user,
      req
    });
    return successResponse(res, role, 'Target role updated successfully');
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/admin/roles/:id
router.delete('/roles/:id', async (req, res, next) => {
  try {
    const force = req.query.force === 'true';
    const result = await AdminRolesService.deleteRole(req.params.id, {
      force,
      actor: req.user,
      req
    });
    return successResponse(res, result, 'Target role removed successfully');
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 2. STUDENT MANAGEMENT (FULL CRUD)
// ==========================================

// GET /api/v1/admin/students
router.get('/students', async (req, res, next) => {
  try {
    const { page, limit, search, status, targetRoleId, sortField, sortOrder } = req.query;
    const result = await AdminStudentsService.listStudents({
      page,
      limit,
      search,
      status,
      targetRoleId,
      sortField,
      sortOrder
    });
    return successResponse(res, result, 'Student directory retrieved');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/admin/students
const createStudentSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  targetRoleId: z.string().uuid().optional().nullable(),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  dailyMinutes: z.number().int().min(5).max(120).default(15)
});

router.post('/students', async (req, res, next) => {
  try {
    const validated = createStudentSchema.parse(req.body);
    const newStudent = await AdminStudentsService.createStudent(validated, req.user, req);
    return successResponse(res, { student: newStudent }, 'Student account created successfully', 201);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/students/:id
router.get('/students/:id', async (req, res, next) => {
  try {
    const detail = await AdminStudentsService.getStudentDetail(req.params.id);
    return successResponse(res, detail, 'Student profile and intelligence retrieved');
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/admin/students/:id
const updateStudentSchema = z.object({
  displayName: z.string().min(2).optional(),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  dailyMinutes: z.number().int().min(5).max(120).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']).optional()
});

router.put('/students/:id', async (req, res, next) => {
  try {
    const validated = updateStudentSchema.parse(req.body);
    const updated = await AdminStudentsService.updateStudent(req.params.id, validated, req.user, req);
    return successResponse(res, { student: updated }, 'Student profile updated successfully');
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/admin/students/:id/status
router.patch('/students/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) throw new AppError('Status is required', 400, 'BAD_REQUEST');
    const updated = await AdminStudentsService.setStudentStatus(req.params.id, status, req.user, req);
    return successResponse(res, { student: updated }, `Student account ${status.toLowerCase()} successfully`);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/admin/students/:id
router.delete('/students/:id', async (req, res, next) => {
  try {
    const result = await AdminStudentsService.deleteStudent(req.params.id, req.user, req);
    return successResponse(res, result, 'Student account safely removed');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/admin/students/bulk
router.post('/students/bulk', async (req, res, next) => {
  try {
    const { studentIds, action, value } = req.body;
    const result = await AdminStudentsService.bulkAction({ studentIds, action, value }, req.user, req);
    return successResponse(res, result, 'Bulk action applied');
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 3. ROADMAP INTELLIGENCE & VERSIONING
// ==========================================

// GET /api/v1/admin/students/:id/roadmaps
router.get('/students/:id/roadmaps', async (req, res, next) => {
  try {
    const history = await AdminRoadmapsService.getStudentRoadmapHistory(req.params.id);
    return successResponse(res, history, 'Student roadmap version history retrieved');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/students/:id/roadmaps/compare?versionA=1&versionB=2
router.get('/students/:id/roadmaps/compare', async (req, res, next) => {
  try {
    const { versionA = 1, versionB = 2 } = req.query;
    const diff = await AdminRoadmapsService.compareVersions(req.params.id, versionA, versionB);
    return successResponse(res, diff, 'Roadmap version comparison calculated');
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 4. LEARNING ANALYTICS & BOTTLENECK FINDINGS
// ==========================================

// GET /api/v1/admin/analytics/topics
router.get('/analytics/topics', async (req, res, next) => {
  try {
    const { careerGoalId, sortBy, sortOrder } = req.query;
    const result = await AdminAnalyticsService.getTopicPerformance({
      careerGoalId,
      sortBy: sortBy || 'failureRate',
      sortOrder: sortOrder || 'desc'
    });
    return successResponse(res, result, 'Topic performance analytics retrieved');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/analytics/retention
router.get('/analytics/retention', async (req, res, next) => {
  try {
    const retention = await AdminAnalyticsService.getRetentionAnalytics();
    return successResponse(res, retention, 'Retention analytics retrieved');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/analytics/roles
router.get('/analytics/roles', async (req, res, next) => {
  try {
    const segments = await AdminAnalyticsService.getRoleAnalytics();
    return successResponse(res, { segments }, 'Role segment analytics retrieved');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/analytics/adaptation
router.get('/analytics/adaptation', async (req, res, next) => {
  try {
    const data = await AdminAdaptationService.getAdaptationIntelligence();
    return successResponse(res, data, 'Adaptive engine telemetry retrieved');
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 5. SYSTEM ACTIVITY & AUDIT LOGS
// ==========================================

// GET /api/v1/admin/audit-logs
router.get('/audit-logs', async (req, res, next) => {
  try {
    const { page, limit, action, entityType, startDate, endDate } = req.query;
    const logs = await AuditService.getAuditLogs({
      page,
      limit,
      action,
      entityType,
      startDate,
      endDate
    });
    return successResponse(res, logs, 'Administrative audit logs retrieved');
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 6. ADMINISTRATIVE SETTINGS
// ==========================================

// GET /api/v1/admin/settings
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' }
    });
    return successResponse(res, { settings }, 'System settings retrieved');
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/admin/settings/:key
router.put('/settings/:key', async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    const updated = await prisma.systemSetting.upsert({
      where: { key },
      update: {
        value,
        description: description || undefined,
        updatedBy: req.user.id
      },
      create: {
        key,
        value,
        description: description || 'Administrative configuration setting',
        updatedBy: req.user.id
      }
    });

    await AuditService.logAction({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'SETTING_UPDATE',
      entityType: 'SETTING',
      entityId: key,
      details: { key, value },
      outcome: 'SUCCESS',
      req
    });

    return successResponse(res, { setting: updated }, 'System setting updated');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/admin/change-password (Allows changing bootstrap credentials)
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

router.post('/change-password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400, 'UNAUTHORIZED');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    });

    await AuditService.logAction({
      actorId: user.id,
      actorEmail: user.email,
      action: 'PASSWORD_CHANGE',
      entityType: 'USER',
      entityId: user.id,
      details: { message: 'Administrator password changed' },
      outcome: 'SUCCESS',
      req
    });

    return successResponse(res, { success: true }, 'Administrator password successfully updated');
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 7. CURRICULUM & DAG GRAPH DIAGNOSTICS (PRESERVED)
// ==========================================

router.get('/skills', async (req, res, next) => {
  try {
    const skills = await prisma.skill.findMany({
      include: {
        concepts: { select: { id: true, name: true, difficulty: true, status: true } },
        prerequisites: { include: { prerequisiteSkill: true } }
      },
      orderBy: { name: 'asc' }
    });
    return successResponse(res, { skills }, 'Admin skills list');
  } catch (error) {
    next(error);
  }
});

router.get('/check-cycles', async (req, res, next) => {
  try {
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
