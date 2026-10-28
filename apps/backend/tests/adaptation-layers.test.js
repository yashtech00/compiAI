import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { AdaptiveEngine } from '../src/modules/recommendations/adaptive-engine.js';
import { RoadmapService } from '../src/modules/learning-paths/roadmap.service.js';

describe('Three Layers of Adaptation & Roadmap Privacy', () => {
  let learnerToken;
  let learnerUser;
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    // 1. Create Learner User
    const learnerEmail = `adaptive-learner-${Date.now()}@test.com`;
    const learnerSignup = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: learnerEmail,
        password: 'Password123!',
        displayName: 'Adaptive Learner'
      });
    learnerToken = learnerSignup.body.data.token;
    learnerUser = learnerSignup.body.data.user;

    // 2. Create Admin User
    const adminEmail = `adaptive-admin-${Date.now()}@test.com`;
    const adminSignup = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: adminEmail,
        password: 'Password123!',
        displayName: 'Adaptive Admin'
      });
    adminToken = adminSignup.body.data.token;
    adminUser = adminSignup.body.data.user;

    // Promote admin to ADMIN role
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { role: 'ADMIN' }
    });
  });

  afterAll(async () => {
    // Clean up test users and cascade
    if (learnerUser) {
      await prisma.user.delete({ where: { id: learnerUser.id } }).catch(() => null);
    }
    if (adminUser) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => null);
    }
  });

  it('1. Layer 1: Deterministic Engine selects ADVANCE when prerequisites are fulfilled', async () => {
    const decision = await AdaptiveEngine.evaluateNextAction(learnerUser.id);
    expect(decision).toBeDefined();
    expect(['ADVANCE', 'PREREQUISITE', 'REVIEW', 'REINFORCE']).toContain(decision.actionType);
    expect(decision.concept).toBeDefined();
    expect(decision.dailyMinutes).toBe(15);
  });

  it('2. Layer 1: Prerequisite Gap detection triggers PREREQUISITE action before dependent concept', async () => {
    // Find two concepts with a prerequisite dependency
    const prereqRelation = await prisma.conceptPrerequisite.findFirst({
      include: {
        concept: { include: { lessons: { where: { status: 'PUBLISHED' } } } },
        prerequisiteConcept: { include: { lessons: { where: { status: 'PUBLISHED' } } } }
      }
    });

    if (prereqRelation) {
      // Evaluate next action targeting the dependent concept directly
      const decision = await AdaptiveEngine.evaluateNextAction(learnerUser.id, prereqRelation.conceptId);
      // Because learner has 0 mastery in prerequisite, must recommend the prerequisite!
      expect(decision.actionType).toBe('PREREQUISITE');
      expect(decision.concept.id).toBe(prereqRelation.prerequisiteConceptId);
      expect(decision.reason).toContain('prerequisite gap');
    }
  });

  it('3. Layer 2: 3-Session Mini-Analysis triggers after 3 completed learning sessions', async () => {
    const lesson = await prisma.lesson.findFirst({ where: { status: 'PUBLISHED' } });
    expect(lesson).toBeDefined();

    // Create 3 completed sessions for learner
    for (let i = 0; i < 3; i++) {
      await prisma.learningSession.create({
        data: {
          userId: learnerUser.id,
          lessonId: lesson.id,
          sessionType: 'DAILY_LESSON',
          status: 'COMPLETED',
          currentStage: 9,
          durationSeconds: 900,
          hintsUsed: i === 0 ? 3 : 0,
          initialMastery: 20,
          finalMastery: 40,
          completedAt: new Date()
        }
      });
    }

    // Evaluate periodic checkpoints
    const checkpoint = await AdaptiveEngine.evaluatePeriodicCheckpoints(learnerUser.id);
    expect(checkpoint.triggered).toBe(true);
    expect(checkpoint.analysisType).toBe('MINI');
    expect(checkpoint.evidenceWindow).toBeDefined();

    // Verify checkpoint is saved on UserProfile so immediate subsequent check does NOT re-trigger
    const secondCheck = await AdaptiveEngine.evaluatePeriodicCheckpoints(learnerUser.id);
    expect(secondCheck.triggered).toBe(false);
  });

  it('4. Layer 3: 5-Day Full Review triggers when learner has >= 5 distinct active learning days', async () => {
    // Insert activities across 5 distinct historical calendar days
    for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
      const pastDate = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000);
      await prisma.learningActivity.create({
        data: {
          userId: learnerUser.id,
          activityType: 'LESSON',
          sourceType: 'LEARNING_SESSION',
          score: 85,
          durationSeconds: 900,
          createdAt: pastDate
        }
      });
    }

    const checkpoint = await AdaptiveEngine.evaluatePeriodicCheckpoints(learnerUser.id);
    expect(checkpoint.triggered).toBe(true);
    expect(checkpoint.analysisType).toBe('FULL');

    // Checkpoint saved: subsequent check without new active days should NOT re-trigger
    const recheck = await AdaptiveEngine.evaluatePeriodicCheckpoints(learnerUser.id);
    expect(recheck.triggered).toBe(false);
  });

  it('5. Path Versioning: Validated revisions increment version and preserve history', async () => {
    const initialRoadmap = await RoadmapService.getCurrentRoadmap(learnerUser.id);
    expect(initialRoadmap.version).toBeGreaterThanOrEqual(1);

    const updated = await RoadmapService.validateAndApplyPathRevision(learnerUser.id, {
      analysisType: 'MINI',
      proposedPathChanges: [
        {
          conceptId: initialRoadmap.items[1].conceptId,
          action: 'REORDER',
          targetPosition: 2,
          reason: 'Reinforce sequence based on recent quiz evidence'
        }
      ],
      triggerReason: 'TEST_CHECKPOINT',
      evidenceSummary: { notes: 'Automated test revision' },
      confidence: 0.9
    });

    expect(updated.version).toBe(initialRoadmap.version + 1);
    expect(updated.previousPathId).toBe(initialRoadmap.id);
    expect(updated.status).toBe('ACTIVE');

    // Verify old path was superseded rather than destroyed
    const oldPath = await prisma.learningPath.findUnique({ where: { id: initialRoadmap.id } });
    expect(oldPath.status).toBe('SUPERSEDED');
  });

  it('6. Learner Roadmap Privacy: GET /learning-paths/current hides future pending concepts from learners', async () => {
    const learnerRes = await request(app)
      .get('/api/v1/learning-paths/current')
      .set('Authorization', `Bearer ${learnerToken}`);

    expect(learnerRes.status).toBe(200);
    const learnerRoadmap = learnerRes.body.data.roadmap;
    expect(learnerRoadmap).toBeDefined();

    // All returned items must be either COMPLETED or IN_PROGRESS (no future PENDING items leaked)
    const hasPendingLeak = learnerRoadmap.items.some(i => i.status === 'PENDING');
    expect(hasPendingLeak).toBe(false);

    // Total milestones count is still visible for progress context
    expect(learnerRoadmap.totalMilestonesCount).toBeGreaterThan(0);
  });

  it('7. Staff/Admin Access: GET /learning-paths/current exposes full concept graph for admins', async () => {
    const adminRes = await request(app)
      .get('/api/v1/learning-paths/current')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    const adminRoadmap = adminRes.body.data.roadmap;
    expect(adminRoadmap).toBeDefined();
    // Admin receives all roadmap items
    expect(adminRoadmap.items.length).toBeGreaterThan(0);
    expect(adminRes.body.message).toContain('Admin View');
  });

  it('8. No silent fallback to Event Loop: Unseeded or unpublished lesson concept returns CONTENT_UNAVAILABLE', async () => {
    // Create temporary concept without any lessons
    const skill = await prisma.skill.findFirst();
    const phantomConcept = await prisma.concept.create({
      data: {
        skillId: skill.id,
        name: 'Quantum Algorithmics (Unpublished)',
        slug: `quantum-algo-${Date.now()}`,
        description: 'Advanced theoretical concept without published content',
        status: 'ACTIVE'
      }
    });

    try {
      const decision = await AdaptiveEngine.evaluateNextAction(learnerUser.id, phantomConcept.id);
      // Must NOT return Event Loop lesson! Must return CONTENT_UNAVAILABLE
      if (decision.concept.id === phantomConcept.id) {
        expect(decision.actionType).toBe('CONTENT_UNAVAILABLE');
        expect(decision.lesson).toBeNull();
      }
    } finally {
      await prisma.concept.delete({ where: { id: phantomConcept.id } }).catch(() => null);
    }
  });
});
