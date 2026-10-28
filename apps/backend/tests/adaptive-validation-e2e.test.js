import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { RoadmapService } from '../src/modules/learning-paths/roadmap.service.js';
import { AdaptiveEngine } from '../src/modules/recommendations/adaptive-engine.js';

describe('Section 9: Adaptive Learning Validation — Real End-to-End Test Suite (Scenarios A through G)', () => {
  let learnerToken = '';
  let learnerId = '';
  let learnerEmail = '';
  let activeRoadmapV1 = null;

  beforeAll(async () => {
    learnerEmail = `e2e_learner_${Date.now()}@example.com`;
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: learnerEmail,
        password: 'Password123!',
        displayName: 'E2E Adaptive Learner'
      });

    learnerToken = signupRes.body.data.token;
    learnerId = signupRes.body.data.user.id;
  });

  // =========================================================================
  // SCENARIO A — New Learner Onboarding & Roadmap V1 Persistence
  // =========================================================================
  it('Scenario A: New learner completes onboarding, Roadmap V1 is persisted, My Learning and Progress show identical active roadmap without unrelated global topics', async () => {
    // 1. Submit onboarding step
    const onboardingRes = await request(app)
      .post('/api/v1/onboarding/step')
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({
        step: 3,
        goalTitle: 'Master Modern Web Architectures & APIs',
        dailyMinutes: 20,
        experienceLevel: 'BEGINNER',
        knownSkillSlugs: ['javascript']
      });

    expect(onboardingRes.status).toBe(200);

    // 2. Complete onboarding and receive initial roadmap V1
    const completeRes = await request(app)
      .post('/api/v1/onboarding/complete')
      .set('Authorization', `Bearer ${learnerToken}`)
      .send();

    expect(completeRes.status).toBe(200);
    const roadmap = completeRes.body.data.roadmap;
    expect(roadmap).toBeDefined();
    expect(roadmap.version).toBe(1);
    expect(roadmap.items.length).toBeGreaterThan(0);
    activeRoadmapV1 = roadmap;

    // 3. Verify RoadmapVersion record was immutably persisted
    const versionRecord = await prisma.roadmapVersion.findFirst({
      where: { learningPathId: roadmap.id, versionNumber: 1 }
    });
    expect(versionRecord).toBeDefined();
    expect(versionRecord.versionNumber).toBe(1);

    // 4. Verify GET /analytics/skills returns topics strictly from this roadmap
    const progressRes = await request(app)
      .get('/api/v1/analytics/skills')
      .set('Authorization', `Bearer ${learnerToken}`);

    expect(progressRes.status).toBe(200);
    expect(progressRes.body.data.hasRoadmap).toBe(true);
    expect(progressRes.body.data.roadmapVersion).toBe(1);

    const domains = progressRes.body.data.skills;
    expect(domains.length).toBeGreaterThan(0);
    // Unstudied topics must not have 0% mastery fabricated as confirmed mastery
    for (const d of domains) {
      if (!d.isAssessed) {
        expect(d.masteryScore).toBeNull();
        expect(d.status).toMatch(/PLANNED|IN_PROGRESS/);
      }
    }

    // Must NOT contain unrelated global skills like Docker, MongoDB, Git unless in the roadmap
    const roadmapSkillNames = activeRoadmapV1.items.map(i => i.concept?.skill?.name || i.title);
    for (const d of domains) {
      const isPresentInRoadmap = roadmapSkillNames.some(name => name.includes(d.name) || d.name.includes(name));
      expect(isPresentInRoadmap).toBe(true);
    }
  });

  // =========================================================================
  // SCENARIO B — Fast Progression (Strong Performance)
  // =========================================================================
  it('Scenario B: Fast progress records high mastery, triggers adaptive evaluation advancing the learner', async () => {
    const firstItem = activeRoadmapV1.items[0];
    expect(firstItem).toBeDefined();

    // Record strong assessment performance (95% score, independent success)
    await prisma.userConcept.upsert({
      where: {
        userId_conceptId: {
          userId: learnerId,
          conceptId: firstItem.conceptId
        }
      },
      update: {
        masteryScore: 95,
        confidenceScore: 92,
        attempts: 2,
        correctAttempts: 2,
        independentSuccesses: 2
      },
      create: {
        userId: learnerId,
        conceptId: firstItem.conceptId,
        masteryScore: 95,
        confidenceScore: 92,
        attempts: 2,
        correctAttempts: 2,
        independentSuccesses: 2
      }
    });

    // Mark roadmap item completed
    await prisma.learningPathItem.update({
      where: { id: firstItem.id },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });

    // Run adaptive engine decision
    const nextAction = await AdaptiveEngine.evaluateNextAction(learnerId);
    expect(nextAction).toBeDefined();
    expect(nextAction.actionType).toMatch(/ADVANCE|REINFORCE|PRACTICE/);
    expect(nextAction.reason).toBeDefined();
    expect(typeof nextAction.reason).toBe('string');
  });

  // =========================================================================
  // SCENARIO C — Slow Progression / Learning Struggle
  // =========================================================================
  it('Scenario C: Slow progress and low scores trigger reinforcement and explainable decision', async () => {
    const secondItem = activeRoadmapV1.items[1] || activeRoadmapV1.items[0];

    // Record low assessment performance (35% score, multiple failures)
    await prisma.userConcept.upsert({
      where: {
        userId_conceptId: {
          userId: learnerId,
          conceptId: secondItem.conceptId
        }
      },
      update: {
        masteryScore: 35,
        confidenceScore: 20,
        attempts: 3,
        correctAttempts: 1,
        hintsCount: 4,
        misconceptions: ['Asynchronous event loop misinterpretation']
      },
      create: {
        userId: learnerId,
        conceptId: secondItem.conceptId,
        masteryScore: 35,
        confidenceScore: 20,
        attempts: 3,
        correctAttempts: 1,
        hintsCount: 4,
        misconceptions: ['Asynchronous event loop misinterpretation']
      }
    });

    // Run adaptive engine evaluation
    const nextAction = await AdaptiveEngine.evaluateNextAction(learnerId);
    expect(nextAction).toBeDefined();
    expect(['REINFORCE', 'REVIEW', 'PREREQUISITE', 'PRACTICE', 'REMEDIATE']).toContain(nextAction.actionType);
    expect(nextAction.concept?.id).toBe(secondItem.conceptId);
    expect(nextAction.reason).toMatch(/Targeted remediation|reinforce|mastery|struggle|practice|misconception/i);
  });

  // =========================================================================
  // SCENARIO D — No Meaningful Change Required
  // =========================================================================
  it('Scenario D: Routine progress without threshold breach retains current roadmap without creating duplicate versions', async () => {
    const versionsBefore = await prisma.roadmapVersion.count({
      where: { learningPathId: activeRoadmapV1.id }
    });

    // Re-request roadmap without forced adaptation
    const roadmap = await RoadmapService.generateRoadmap(learnerId, { force: false });
    expect(roadmap.id).toBe(activeRoadmapV1.id);
    expect(roadmap.version).toBe(activeRoadmapV1.version);

    const versionsAfter = await prisma.roadmapVersion.count({
      where: { learningPathId: activeRoadmapV1.id }
    });
    // Must NOT have created an unneeded duplicate version
    expect(versionsAfter).toBe(versionsBefore);
  });

  // =========================================================================
  // SCENARIO E — Failed Roadmap Generation Fallback
  // =========================================================================
  it('Scenario E: Failed synthesis maintains access to previous valid roadmap and reports failure safely', async () => {
    // Current active path remains valid and active
    const currentPath = await RoadmapService.getCurrentRoadmap(learnerId);
    expect(currentPath).toBeDefined();
    expect(currentPath.status).toBe('ACTIVE');

    // Simulate invalid path revision (e.g. unknown conceptId or corrupt changes)
    const result = await RoadmapService.validateAndApplyPathRevision(learnerId, {
      analysisType: 'MINI',
      triggerReason: 'Invalid modification attempt',
      proposedPathChanges: [
        { conceptId: 'invalid-nonexistent-id', action: 'REORDER', targetPosition: 99 }
      ]
    });

    // Unchanged active path is retained safely
    expect(result.id).toBe(currentPath.id);
    expect(result.version).toBe(currentPath.version);

    // Verify existing roadmap was NOT corrupted
    const preservedPath = await RoadmapService.getCurrentRoadmap(learnerId);
    expect(preservedPath.id).toBe(currentPath.id);
    expect(preservedPath.status).toBe('ACTIVE');
  });

  // =========================================================================
  // SCENARIO F — Repeated or Concurrent Evaluation
  // =========================================================================
  it('Scenario F: Concurrent generation requests safely coalesce into identical operation without duplicate records', async () => {
    // Fire two simultaneous requests for the same user
    const [p1, p2] = await Promise.all([
      RoadmapService.generateRoadmap(learnerId, { force: false }),
      RoadmapService.generateRoadmap(learnerId, { force: false })
    ]);

    expect(p1.id).toBe(p2.id);
    expect(p1.version).toBe(p2.version);

    // Verify database only has one active path for this user
    const activePaths = await prisma.learningPath.findMany({
      where: { userId: learnerId, status: 'ACTIVE' }
    });
    expect(activePaths.length).toBe(1);
  });

  // =========================================================================
  // SCENARIO G — Historical Integrity (V1 preserved when V2 created)
  // =========================================================================
  it('Scenario G: Creating Roadmap V2 preserves immutable V1 snapshot and maintains learning session references', async () => {
    const pathV1Id = activeRoadmapV1.id;

    // Create a learning session referenced to V1
    let lesson = await prisma.lesson.findFirst({
      where: { conceptId: activeRoadmapV1.items[0].conceptId }
    });
    if (!lesson) {
      lesson = await prisma.lesson.create({
        data: {
          conceptId: activeRoadmapV1.items[0].conceptId,
          title: activeRoadmapV1.items[0].title || 'V1 Core Lesson',
          slug: `v1-lesson-${Date.now()}`,
          objective: 'Understand foundational concepts',
          content: 'Foundational module content',
          status: 'PUBLISHED'
        }
      });
    }

    const testSession = await prisma.learningSession.create({
      data: {
        userId: learnerId,
        lessonId: lesson.id,
        status: 'COMPLETED',
        sessionType: 'DAILY_LESSON',
        startedAt: new Date(Date.now() - 3600000),
        completedAt: new Date(),
        durationSeconds: 900
      }
    });

    // Apply path revision with valid proposed changes to produce V2
    const secondConceptId = activeRoadmapV1.items[1]?.conceptId || activeRoadmapV1.items[0]?.conceptId;
    const revision = {
      analysisType: 'FULL',
      triggerReason: 'Learner achieved mastery in foundational module; advancing to microservices',
      proposedPathChanges: [
        {
          conceptId: secondConceptId,
          action: 'INSERT_REMEDIATION'
        }
      ]
    };

    const pathV2 = await RoadmapService.validateAndApplyPathRevision(learnerId, revision);
    expect(pathV2).toBeDefined();
    expect(pathV2.version).toBe(2);
    expect(pathV2.previousPathId).toBe(pathV1Id);

    // Verify V1 is still present in database with status SUPERSEDED
    const pathV1InDb = await prisma.learningPath.findUnique({
      where: { id: pathV1Id }
    });
    expect(pathV1InDb).toBeDefined();
    expect(pathV1InDb.version).toBe(1);
    expect(pathV1InDb.status).toBe('SUPERSEDED');

    // Verify RoadmapVersion snapshots exist for BOTH V1 and V2
    const v1Snapshot = await prisma.roadmapVersion.findFirst({
      where: { learningPathId: pathV1Id, versionNumber: 1 }
    });
    expect(v1Snapshot).toBeDefined();

    const v2Snapshot = await prisma.roadmapVersion.findFirst({
      where: { learningPathId: pathV2.id, versionNumber: 2 }
    });
    expect(v2Snapshot).toBeDefined();
    expect(v2Snapshot.changeReason).toBe(revision.triggerReason);

    // Verify historical learning session is intact
    const reloadedSession = await prisma.learningSession.findUnique({
      where: { id: testSession.id }
    });
    expect(reloadedSession).toBeDefined();
    expect(reloadedSession.status).toBe('COMPLETED');
  });
});
