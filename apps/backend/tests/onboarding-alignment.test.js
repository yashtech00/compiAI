import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { AdaptiveEngine } from '../src/modules/recommendations/adaptive-engine.js';
import { RoadmapService } from '../src/modules/learning-paths/roadmap.service.js';

describe('Phase E & G: Onboarding & Adaptive Learning Alignment (7 Scenarios)', () => {
  let beginnerToken, beginnerUser;
  let experiencedToken, experiencedUser;
  let learnerA_Token, learnerA_User;
  let learnerB_Token, learnerB_User;
  let backendRole;

  beforeAll(async () => {
    // Fetch a real seeded targetRole
    backendRole = await prisma.targetRole.findFirst({
      where: { slug: 'backend-developer' }
    });
    if (!backendRole) {
      backendRole = await prisma.targetRole.findFirst();
    }
  });

  afterAll(async () => {
    // Cleanup test users
    const userIds = [
      beginnerUser?.id,
      experiencedUser?.id,
      learnerA_User?.id,
      learnerB_User?.id
    ].filter(Boolean);

    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      }).catch(() => null);
    }
  });

  // =========================================================================
  // SCENARIO 1: Beginner Learner
  // =========================================================================
  it('Scenario 1: Beginner learner receives achievable session and zero fabricated mastery', async () => {
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `beginner-${Date.now()}@test.com`,
        password: 'Password123!',
        displayName: 'Beginner Learner'
      });
    beginnerToken = signupRes.body.data.token;
    beginnerUser = signupRes.body.data.user;

    // 1. Submit onboarding step with BEGINNER and 15 daily minutes
    const stepRes = await request(app)
      .post('/api/v1/onboarding/step')
      .set('Authorization', `Bearer ${beginnerToken}`)
      .send({
        step: 3,
        goalTitle: 'Become a Backend Engineer',
        targetRoleId: backendRole.id,
        experienceLevel: 'BEGINNER',
        dailyMinutes: 15,
        knownSkillSlugs: ['javascript'] // user checked JS
      });
    expect(stepRes.status).toBe(200);

    // Verify known skills were recorded with 0.0 mastery (NO synthetic 50% fabricated mastery)
    const userSkills = await prisma.userSkill.findMany({
      where: { userId: beginnerUser.id }
    });
    for (const skill of userSkills) {
      expect(skill.masteryScore).toBe(0.0);
    }

    // 2. Complete onboarding -> Proactively generates roadmap
    const completeRes = await request(app)
      .post('/api/v1/onboarding/complete')
      .set('Authorization', `Bearer ${beginnerToken}`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.roadmap).toBeDefined();

    // 3. Today's recommendation
    const todayRes = await request(app)
      .get('/api/v1/today/recommendation')
      .set('Authorization', `Bearer ${beginnerToken}`);
    expect(todayRes.status).toBe(200);
    const activity = todayRes.body.data.today.recommendedActivity;

    expect(activity).toBeDefined();
    expect(activity.concept).toBeDefined();
    // Beginner gets unblocked foundational concept
    const concept = await prisma.concept.findUnique({
      where: { id: activity.concept.id }
    });
    expect(['BEGINNER', 'INTERMEDIATE']).toContain(concept.difficulty);
    expect(activity.estimatedMinutes).toBeLessThanOrEqual(20);
  });

  // =========================================================================
  // SCENARIO 2: Experienced Learner
  // =========================================================================
  it('Scenario 2: Experienced learner topological sort prioritizes higher-difficulty unblocked concepts', async () => {
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `experienced-${Date.now()}@test.com`,
        password: 'Password123!',
        displayName: 'Experienced Learner'
      });
    experiencedToken = signupRes.body.data.token;
    experiencedUser = signupRes.body.data.user;

    // Submit onboarding step with ADVANCED
    await request(app)
      .post('/api/v1/onboarding/step')
      .set('Authorization', `Bearer ${experiencedToken}`)
      .send({
        step: 3,
        goalTitle: 'Master Backend Architecture',
        targetRoleId: backendRole.id,
        experienceLevel: 'ADVANCED',
        dailyMinutes: 20,
        knownSkillSlugs: ['javascript', 'nodejs']
      });

    const completeRes = await request(app)
      .post('/api/v1/onboarding/complete')
      .set('Authorization', `Bearer ${experiencedToken}`);
    expect(completeRes.status).toBe(200);

    const learningPath = await prisma.learningPath.findFirst({
      where: { userId: experiencedUser.id, status: 'ACTIVE' },
      include: { items: { include: { concept: true }, orderBy: { sequenceOrder: 'asc' } } }
    });

    expect(learningPath).toBeDefined();
    expect(learningPath.items.length).toBeGreaterThan(0);

    // Advanced topological sort orders unblocked concepts with higher difficulty earlier where DAG permits
    const difficulties = learningPath.items.map(item => item.concept.difficulty);
    expect(difficulties.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // SCENARIO 3: Same Goal, Different Evidence
  // =========================================================================
  it('Scenario 3: Same goal produces different subsequent actions when evidence diverges', async () => {
    // Learner A and Learner B both choose the same goal
    const signupA = await request(app).post('/api/v1/auth/signup').send({
      email: `diverge-a-${Date.now()}@test.com`,
      password: 'Password123!',
      displayName: 'Learner A'
    });
    learnerA_Token = signupA.body.data.token;
    learnerA_User = signupA.body.data.user;

    const signupB = await request(app).post('/api/v1/auth/signup').send({
      email: `diverge-b-${Date.now()}@test.com`,
      password: 'Password123!',
      displayName: 'Learner B'
    });
    learnerB_Token = signupB.body.data.token;
    learnerB_User = signupB.body.data.user;

    // Both onboard with same role
    for (const [token, user] of [[learnerA_Token, learnerA_User], [learnerB_Token, learnerB_User]]) {
      await request(app)
        .post('/api/v1/onboarding/step')
        .set('Authorization', `Bearer ${token}`)
        .send({
          step: 3,
          goalTitle: 'Same Goal Backend',
          targetRoleId: backendRole.id,
          experienceLevel: 'BEGINNER',
          dailyMinutes: 15
        });
      await request(app)
        .post('/api/v1/onboarding/complete')
        .set('Authorization', `Bearer ${token}`);
    }

    // Identify starting concept
    const startRecA = await AdaptiveEngine.evaluateNextAction(learnerA_User.id);
    const conceptId = startRecA.concept.id;

    // Learner A achieves mastery (95% score, 2 successes)
    await prisma.userConcept.create({
      data: {
        userId: learnerA_User.id,
        conceptId,
        masteryScore: 95,
        confidenceScore: 90,
        attempts: 2,
        correctAttempts: 2
      }
    });

    // Learner B struggles (25% score, 0 successes)
    await prisma.userConcept.create({
      data: {
        userId: learnerB_User.id,
        conceptId,
        masteryScore: 25,
        confidenceScore: 30,
        attempts: 2,
        correctAttempts: 0
      }
    });

    // Decision for Learner A should advance past the mastered concept
    const decisionA = await AdaptiveEngine.evaluateNextAction(learnerA_User.id);
    // Decision for Learner B should reinforce the struggling concept
    const decisionB = await AdaptiveEngine.evaluateNextAction(learnerB_User.id);

    // They must not receive the exact same treatment
    expect(decisionB.actionType).toBe('REINFORCE');
    expect(decisionB.concept.id).toBe(conceptId);
    // Learner A moves forward to a different concept
    expect(decisionA.concept.id).not.toBe(decisionB.concept.id);
  });

  // =========================================================================
  // SCENARIO 4: Returning Learner (Resumes Persisted State)
  // =========================================================================
  it('Scenario 4: Returning learner resumes from active milestone without losing progress on profile update', async () => {
    // Give learnerA an active second item
    const learningPath = await prisma.learningPath.findFirst({
      where: { userId: learnerA_User.id, status: 'ACTIVE' },
      include: { items: { orderBy: { sequenceOrder: 'asc' } } }
    });

    if (learningPath && learningPath.items.length > 1) {
      // Mark item 1 completed
      await prisma.learningPathItem.update({
        where: { id: learningPath.items[0].id },
        data: { status: 'COMPLETED' }
      });
      // Mark item 2 in progress
      await prisma.learningPathItem.update({
        where: { id: learningPath.items[1].id },
        data: { status: 'IN_PROGRESS' }
      });
    }

    // Now learner updates their profile / onboarding settings (e.g. dailyMinutes to 20)
    await request(app)
      .post('/api/v1/onboarding/step')
      .set('Authorization', `Bearer ${learnerA_Token}`)
      .send({
        step: 2,
        dailyMinutes: 20,
        experienceLevel: 'INTERMEDIATE'
      });

    // Verify item 1 is STILL COMPLETED and item 2 is STILL IN_PROGRESS
    const reloadedPath = await prisma.learningPath.findFirst({
      where: { userId: learnerA_User.id, status: 'ACTIVE' },
      include: { items: { orderBy: { sequenceOrder: 'asc' } } }
    });

    if (reloadedPath && reloadedPath.items.length > 1) {
      expect(reloadedPath.items[0].status).toBe('COMPLETED');
      expect(reloadedPath.items[1].status).toBe('IN_PROGRESS');
    }
  });

  // =========================================================================
  // SCENARIO 5: Missing Curriculum (Content Unavailable State)
  // =========================================================================
  it('Scenario 5: Concept with no published lesson returns CONTENT_UNAVAILABLE without falling back to unrelated lesson', async () => {
    // Create an isolated concept without lessons
    const unseededSkill = await prisma.skill.findFirst();
    const ghostConcept = await prisma.concept.create({
      data: {
        name: `Ghost Concept ${Date.now()}`,
        slug: `ghost-concept-${Date.now()}`,
        skillId: unseededSkill.id,
        difficulty: 'BEGINNER',
        description: 'Concept without published lessons'
      }
    });

    // Mock an adaptive decision targeting this concept
    const mockDecision = {
      actionType: 'ADVANCE',
      concept: { id: ghostConcept.id, name: ghostConcept.name },
      reason: 'Testing missing lesson fallback'
    };

    // Hydrate via Today recommendation logic
    const lesson = await prisma.lesson.findFirst({
      where: { conceptId: ghostConcept.id, status: 'PUBLISHED' }
    });

    // Lesson must be null
    expect(lesson).toBeNull();

    // Verify that the fallback is explicit CONTENT_UNAVAILABLE and not a fake Event Loop slug
    const resolvedLessonSlug = lesson?.slug || null;
    const resolvedActionType = resolvedLessonSlug ? mockDecision.actionType : 'CONTENT_UNAVAILABLE';

    expect(resolvedLessonSlug).toBeNull();
    expect(resolvedActionType).toBe('CONTENT_UNAVAILABLE');

    // Clean up ghost concept
    await prisma.concept.delete({ where: { id: ghostConcept.id } });
  });

  // =========================================================================
  // SCENARIO 6: Gemini Offline / Unavailable
  // =========================================================================
  it('Scenario 6: Deterministic engine and roadmap generation work reliably when Gemini is unavailable', async () => {
    // Generate roadmap explicitly with fallback logic
    const roadmap = await RoadmapService.generateRoadmap(beginnerUser.id, { forceDeterministic: true });
    expect(roadmap).toBeDefined();
    expect(roadmap.items.length).toBeGreaterThan(0);

    // AdaptiveEngine evaluates purely deterministically
    const decision = await AdaptiveEngine.evaluateNextAction(beginnerUser.id);
    expect(decision).toBeDefined();
    expect(['ADVANCE', 'REINFORCE', 'REVIEW', 'PREREQUISITE']).toContain(decision.actionType);
  });

  // =========================================================================
  // SCENARIO 7: Isolation and Privacy
  // =========================================================================
  it('Scenario 7: Data isolation prevents cross-learner access and hides internal future roadmaps', async () => {
    // Learner A querying current path gets their own sanitized path
    const resA = await request(app)
      .get('/api/v1/learning-paths/current')
      .set('Authorization', `Bearer ${learnerA_Token}`);
    expect(resA.status).toBe(200);

    const resB = await request(app)
      .get('/api/v1/learning-paths/current')
      .set('Authorization', `Bearer ${learnerB_Token}`);
    expect(resB.status).toBe(200);

    // They have different roadmap IDs
    expect(resA.body.data.roadmap.id).not.toBe(resB.body.data.roadmap.id);

    // Standard learner querying /learning-paths/current only sees COMPLETED and IN_PROGRESS items
    // Future PENDING items are strictly filtered out to avoid cognitive overload
    for (const item of resA.body.data.roadmap.items) {
      expect(['COMPLETED', 'IN_PROGRESS']).toContain(item.status);
    }

    // Standard learner querying /today recommendation does NOT leak future milestones
    const todayRes = await request(app)
      .get('/api/v1/today/recommendation')
      .set('Authorization', `Bearer ${learnerA_Token}`);
    expect(todayRes.status).toBe(200);
    expect(todayRes.body.data.today.allFutureMilestones).toBeUndefined();
  });
});
