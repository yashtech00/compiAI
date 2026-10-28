import { describe, it, expect, beforeAll } from 'vitest';
import prisma from '../src/config/prisma.js';
import { signToken } from '../src/utils/token.js';
import { AdminOverviewService } from '../src/modules/admin/admin-overview.service.js';
import { AdminStudentsService } from '../src/modules/admin/admin-students.service.js';
import { AdminRoadmapsService } from '../src/modules/admin/admin-roadmaps.service.js';
import { AdminAnalyticsService } from '../src/modules/admin/admin-analytics.service.js';
import { AdminAdaptationService } from '../src/modules/admin/admin-adaptation.service.js';
import { AuditService } from '../src/modules/admin/audit.service.js';

describe('Admin Portal & Learning Intelligence Test Suite', () => {
  let adminUser;
  let adminToken;
  let studentUser;
  let studentToken;

  beforeAll(async () => {
    // 1. Ensure admin user exists
    adminUser = await prisma.user.findUnique({
      where: { email: 'admin@gmail.com' }
    });
    if (!adminUser) {
      const { seedAdmin } = await import('../prisma/seed-admin.js');
      adminUser = await seedAdmin();
    }
    adminToken = signToken({ userId: adminUser.id, role: adminUser.role });

    // 2. Find a learner with an existing learning path
    studentUser = await prisma.user.findFirst({
      where: { role: 'LEARNER', learningPaths: { some: {} } },
      include: { learningPaths: true }
    });
    if (!studentUser) {
      studentUser = await prisma.user.findFirst({ where: { role: 'LEARNER' } });
    }
    studentToken = signToken({ userId: studentUser.id, role: studentUser.role });
  });

  it('1. Admin user is seeded with role ADMIN and active status', () => {
    expect(adminUser).toBeDefined();
    expect(adminUser.role).toBe('ADMIN');
    expect(adminUser.status).toBe('ACTIVE');
    expect(adminUser.email).toBe('admin@gmail.com');
  });

  it('2. Admin overview calculates valid KPIs, funnel, and insights', async () => {
    const overview = await AdminOverviewService.getOverview({ timeRange: '30d' });

    expect(overview.kpis).toBeDefined();
    expect(overview.kpis.totalStudents.value).toBeGreaterThan(0);
    expect(typeof overview.kpis.activeStudents.value).toBe('number');
    expect(typeof overview.kpis.avgRoadmapCompletion.value).toBe('number');

    // Funnel stages
    expect(Array.isArray(overview.funnel)).toBe(true);
    expect(overview.funnel.length).toBe(8);
    expect(overview.funnel[0].id).toBe('registered');

    // Trends
    expect(Array.isArray(overview.trends)).toBe(true);
    expect(overview.trends.length).toBeGreaterThan(0);

    // Needs attention
    expect(Array.isArray(overview.needsAttention)).toBe(true);
  });

  it('3. Student directory returns paginated, searchable real database records', async () => {
    const res = await AdminStudentsService.listStudents({ page: 1, limit: 5 });

    expect(res.total).toBeGreaterThan(0);
    expect(res.students.length).toBeLessThanOrEqual(5);
    expect(res.students[0]).toHaveProperty('id');
    expect(res.students[0]).toHaveProperty('email');
    expect(res.students[0]).toHaveProperty('careerGoal');
    expect(res.students[0]).toHaveProperty('roadmapProgress');
  });

  it('4. Deep student profile inspection returns profile, skills, roadmap, and timeline', async () => {
    const detail = await AdminStudentsService.getStudentDetail(studentUser.id);

    expect(detail.student.id).toBe(studentUser.id);
    expect(detail.student.email).toBe(studentUser.email);
    expect(Array.isArray(detail.skills)).toBe(true);
    expect(Array.isArray(detail.roadmapVersions)).toBe(true);
    expect(Array.isArray(detail.timeline)).toBe(true);
    expect(detail.timeline.length).toBeGreaterThan(0);
  });

  it('5. Student profile update records an immutable audit log entry', async () => {
    const updateResult = await AdminStudentsService.updateStudent(
      studentUser.id,
      { displayName: 'Updated Test Learner' },
      adminUser
    );

    expect(updateResult.profile.displayName).toBe('Updated Test Learner');

    // Verify audit log
    const auditLogs = await AuditService.getAuditLogs({
      action: 'STUDENT_UPDATE',
      limit: 5
    });
    expect(auditLogs.total).toBeGreaterThan(0);
    expect(auditLogs.logs[0].entityId).toBe(studentUser.id);
  });

  it('6. Roadmap version history and side-by-side comparison calculate real diffs', async () => {
    const history = await AdminRoadmapsService.getStudentRoadmapHistory(studentUser.id);
    expect(history.totalVersions).toBeGreaterThanOrEqual(1);

    if (history.totalVersions >= 2) {
      const diff = await AdminRoadmapsService.compareVersions(studentUser.id, 1, 2);
      expect(diff.versionA.versionNumber).toBe(1);
      expect(diff.versionB.versionNumber).toBe(2);
      expect(diff.diffSummary).toBeDefined();
      expect(typeof diff.diffSummary.addedCount).toBe('number');
      expect(typeof diff.diffSummary.removedCount).toBe('number');
    }
  });

  it('7. Topic performance analytics ranks topics by failure, abandonment, and completion rates', async () => {
    const result = await AdminAnalyticsService.getTopicPerformance();

    expect(result.totalTopics).toBeGreaterThan(0);
    expect(Array.isArray(result.topics)).toBe(true);
    const firstTopic = result.topics[0];
    expect(firstTopic).toHaveProperty('name');
    expect(firstTopic).toHaveProperty('completionRate');
    expect(firstTopic).toHaveProperty('failureRate');
    expect(firstTopic).toHaveProperty('severity');
  });

  it('8. Adaptive learning intelligence evaluates triggers, versions, and outcomes', async () => {
    const adaptation = await AdminAdaptationService.getAdaptationIntelligence();

    expect(adaptation.summary.totalGenerations).toBeGreaterThan(0);
    expect(adaptation.versionDistribution).toHaveProperty('v1');
    expect(adaptation.triggerBreakdown).toHaveProperty('ONBOARDING');
    expect(Array.isArray(adaptation.recentAdaptationEvents)).toBe(true);
  });

  it('9. AuditService protects against logging passwords or secrets', async () => {
    const log = await AuditService.logAction({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'SECURITY_TEST',
      entityType: 'TEST',
      details: {
        password: 'raw_secret_value',
        token: 'sensitive_jwt_token',
        validField: 'safe_value'
      }
    });

    expect(log).toBeDefined();
    expect(log.details).not.toHaveProperty('password');
    expect(log.details).not.toHaveProperty('token');
    expect(log.details.validField).toBe('safe_value');
  });
});
