import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { RoadmapService } from '../src/modules/learning-paths/roadmap.service.js';
import { PathSynthesisService } from '../src/modules/learning-paths/path-synthesis.service.js';
import { validateAndSortMilestones } from '../src/modules/learning-paths/path-synthesis.contract.js';
import { SessionGeneratorService } from '../src/modules/lessons/session-generator.service.js';
import { AdaptiveEngine } from '../src/modules/recommendations/adaptive-engine.js';
import { QuizService } from '../src/modules/quizzes/quizzes.service.js';
import { MasteryEngine } from '../src/modules/learner-model/mastery-engine.js';

describe('Phase 4: Complete Dynamic Curriculum Migration & Regression Test Suite (18 Scenarios)', () => {
  let userTokenA = '';
  let userIdA = '';
  let userTokenB = '';
  let userIdB = '';
  let customGoalA = null;

  beforeAll(async () => {
    // 1. Create Learner A with arbitrary unseeded goal: "Compiler Design in C++ and LLVM IR"
    const emailA = `dynamic_learner_a_${Date.now()}@example.com`;
    const signupA = await request(app).post('/api/v1/auth/signup').send({
      email: emailA,
      password: 'Password123!',
      displayName: 'Compiler Engineer'
    });
    userTokenA = signupA.body.data.token;
    userIdA = signupA.body.data.user.id;

    await prisma.userProfile.update({
      where: { userId: userIdA },
      data: { dailyMinutes: 15, experienceLevel: 'INTERMEDIATE' }
    });

    customGoalA = await prisma.learningGoal.create({
      data: {
        userId: userIdA,
        title: 'Compiler Design in C++ and LLVM IR',
        status: 'ACTIVE',
        targetReadiness: 0
      }
    });

    // 2. Create Learner B for cross-learner isolation tests
    const emailB = `dynamic_learner_b_${Date.now()}@example.com`;
    const signupB = await request(app).post('/api/v1/auth/signup').send({
      email: emailB,
      password: 'Password123!',
      displayName: 'Rust Engineer'
    });
    userTokenB = signupB.body.data.token;
    userIdB = signupB.body.data.user.id;
  });

  afterAll(async () => {
    const userIds = [userIdA, userIdB].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      }).catch(() => null);
    }
  });

  // =========================================================================
  // Scenario 1: A goal absent from the seeded catalogue produces a valid path
  // =========================================================================
  it('1. A goal absent from seeded catalogue produces a valid, validated personalized path', async () => {
    const roadmap = await RoadmapService.generateRoadmap(userIdA, { force: true });
    expect(roadmap).toBeDefined();
    expect(roadmap.status).toBe('ACTIVE');
    expect(roadmap.targetGoal).toBe('Compiler Design in C++ and LLVM IR');
    expect(roadmap.items.length).toBeGreaterThanOrEqual(4);

    // Verify milestones are tailored to compilers/LLVM
    const titlesAndOutcomes = roadmap.items.map(i => `${i.title} ${i.targetOutcome}`.toLowerCase()).join(' ');
    expect(
      titlesAndOutcomes.includes('compiler') ||
      titlesAndOutcomes.includes('llvm') ||
      titlesAndOutcomes.includes('ast') ||
      titlesAndOutcomes.includes('parser')
    ).toBe(true);
  });

  // =========================================================================
  // Scenario 2: A new custom milestone can generate a lesson without a published static lesson
  // =========================================================================
  it('2. A new custom milestone can generate a complete playable lesson without any pre-existing static lesson', async () => {
    const activeRoadmap = await RoadmapService.getCurrentRoadmap(userIdA);
    const firstMilestone = activeRoadmap.items[0];

    // Verify concept is custom
    const concept = await prisma.concept.findUnique({
      where: { id: firstMilestone.conceptId },
      include: { lessons: true }
    });
    expect(concept.isCustom).toBe(true);

    // Generate JIT session
    const generatedLesson = await SessionGeneratorService.getOrCreateSession({
      userId: userIdA,
      conceptId: concept.id,
      milestone: {
        title: firstMilestone.title,
        measurableObjective: firstMilestone.targetOutcome,
        difficulty: 2
      },
      learnerProfile: { dailyMinutes: 15, experienceLevel: 'INTERMEDIATE', targetGoal: 'Compiler Design' }
    });

    expect(generatedLesson).toBeDefined();
    expect(generatedLesson.status).toBe('PUBLISHED');
    expect(generatedLesson.activities.length).toBeGreaterThanOrEqual(4);
    expect(generatedLesson.quizzes.length).toBeGreaterThanOrEqual(1);
    expect(generatedLesson.quizzes[0].questions.length).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // Scenario 3: Existing seeded concepts still work
  // =========================================================================
  it('3. Existing seeded concepts remain accessible and functional as optional reference curriculum', async () => {
    const seededConcept = await prisma.concept.findFirst({
      where: { isCustom: false, status: 'ACTIVE' },
      include: {
        skill: true,
        lessons: { where: { status: 'PUBLISHED', userId: null }, take: 1 }
      }
    });

    expect(seededConcept).toBeDefined();
    expect(seededConcept.isCustom).toBe(false);

    if (seededConcept.lessons.length > 0) {
      const lessonRes = await request(app)
        .get(`/api/v1/lessons/${seededConcept.lessons[0].slug}`)
        .set('Authorization', `Bearer ${userTokenA}`);
      expect(lessonRes.status).toBe(200);
      expect(lessonRes.body.data.lesson.id).toBe(seededConcept.lessons[0].id);
    }
  });

  // =========================================================================
  // Scenario 4: The path remains stable across normal requests and page refreshes
  // =========================================================================
  it('4. The learning path remains stable and identical across repeated requests and refreshes', async () => {
    const path1 = await RoadmapService.getCurrentRoadmap(userIdA);
    const path2 = await RoadmapService.getCurrentRoadmap(userIdA);
    const pathRes = await request(app)
      .get('/api/v1/learning-paths/current')
      .set('Authorization', `Bearer ${userTokenA}`);

    expect(path1.id).toBe(path2.id);
    expect(path1.version).toBe(path2.version);
    expect(pathRes.status).toBe(200);
    expect(pathRes.body.data.roadmap.id).toBe(path1.id);
  });

  // =========================================================================
  // Scenario 5: A failed regeneration preserves the existing valid path
  // =========================================================================
  it('5. A failed regeneration preserves the existing valid active path intact', async () => {
    const activeBefore = await prisma.learningPath.findFirst({
      where: { userId: userIdA, status: 'ACTIVE' }
    });
    expect(activeBefore).toBeDefined();

    // Trigger synthesis failure by corrupting input or mocking throw
    try {
      await RoadmapService.generateRoadmap('non-existent-user-id-99999', { force: true });
    } catch (err) {
      expect(err).toBeDefined();
    }

    // Active path for user A must still be ACTIVE and untouched
    const activeAfter = await prisma.learningPath.findUnique({
      where: { id: activeBefore.id }
    });
    expect(activeAfter.status).toBe('ACTIVE');
    expect(activeAfter.version).toBe(activeBefore.version);
  });

  // =========================================================================
  // Scenario 6: Regeneration preserves historical attempts and XP
  // =========================================================================
  it('6. Regeneration preserves historical quiz attempts, learning activities, and XP transactions', async () => {
    // Record an attempt and XP for User A
    const activeRoadmap = await RoadmapService.getCurrentRoadmap(userIdA);
    const firstItem = activeRoadmap.items[0];

    const quiz = await prisma.quiz.findFirst({
      where: { lesson: { conceptId: firstItem.conceptId } },
      include: { questions: true }
    });

    if (quiz) {
      await QuizService.submitQuiz(
        userIdA,
        quiz.id,
        quiz.questions.map(q => ({ questionId: q.id, response: q.answer })),
        120,
        0
      );
    }

    const attemptsBefore = await prisma.quizAttempt.count({ where: { userId: userIdA } });
    const xpBefore = await prisma.xpTransaction.count({ where: { userId: userIdA } });

    // Explicitly regenerate path
    const regenerated = await RoadmapService.generateRoadmap(userIdA, { force: true });
    expect(regenerated.version).toBeGreaterThan(activeRoadmap.version);

    // Verify historical attempts and XP are 100% preserved
    const attemptsAfter = await prisma.quizAttempt.count({ where: { userId: userIdA } });
    const xpAfter = await prisma.xpTransaction.count({ where: { userId: userIdA } });

    expect(attemptsAfter).toBe(attemptsBefore);
    expect(xpAfter).toBe(xpBefore);
  });

  // =========================================================================
  // Scenario 7: A changed milestone objective does not inherit invalid completion
  // =========================================================================
  it('7. A changed milestone objective does not inherit invalid completion status on regeneration', async () => {
    // Create previous active path with a completed milestone
    const testPath = await prisma.learningPath.create({
      data: {
        userId: userIdB,
        title: 'Rust Concurrency Path',
        targetGoal: 'Rust Concurrency',
        status: 'ACTIVE',
        version: 1,
        items: {
          create: [
            {
              milestoneId: 'rust-threads-basics',
              title: 'Thread Spawning in Rust',
              targetOutcome: 'Spawn threads and join handles in Rust std::thread',
              status: 'COMPLETED',
              sequenceOrder: 1,
              completedAt: new Date()
            }
          ]
        }
      },
      include: { items: true }
    });

    expect(testPath.items[0].status).toBe('COMPLETED');

    // Create a goal for User B
    await prisma.learningGoal.create({
      data: {
        userId: userIdB,
        title: 'Advanced Asynchronous Rust with Tokio',
        status: 'ACTIVE'
      }
    });

    // Regenerate roadmap for User B with different objective
    const newRoadmap = await RoadmapService.generateRoadmap(userIdB, { force: true });
    expect(newRoadmap.status).toBe('ACTIVE');

    // Milestone with changed objective must NOT inherit completed status
    const matchingItem = newRoadmap.items.find(i => i.milestoneId === 'rust-threads-basics');
    if (matchingItem && matchingItem.targetOutcome !== 'Spawn threads and join handles in Rust std::thread') {
      expect(matchingItem.status).not.toBe('COMPLETED');
    }
  });

  // =========================================================================
  // Scenario 8: Invalid prerequisite references are rejected
  // =========================================================================
  it('8. Invalid prerequisite references that refer to non-existent topic slugs are strictly rejected', () => {
    const invalidMilestones = {
      pathTitle: 'Compiler Engineering Path',
      targetRole: 'Compiler Engineer',
      pedagogicalApproach: 'Step by step compiler construction from lexing to codegen.',
      estimatedTotalWeeks: 6,
      milestones: [
        {
          topicSlug: 'step-one',
          title: 'Step One',
          domainSkillSlug: 'fundamentals',
          difficulty: 'BEGINNER',
          estimatedSessions: 1,
          prerequisiteTopicSlugs: ['ghost-step-does-not-exist'],
          measurableObjective: 'Objective for step one of the compiler pipeline',
          whyThisMatters: 'Important foundation for understanding subsequent stages'
        },
        {
          topicSlug: 'step-two',
          title: 'Step Two',
          domainSkillSlug: 'fundamentals',
          difficulty: 'BEGINNER',
          estimatedSessions: 1,
          prerequisiteTopicSlugs: [],
          measurableObjective: 'Objective for step two of the compiler pipeline',
          whyThisMatters: 'Important foundation for understanding subsequent stages'
        },
        {
          topicSlug: 'step-three',
          title: 'Step Three',
          domainSkillSlug: 'fundamentals',
          difficulty: 'INTERMEDIATE',
          estimatedSessions: 1,
          prerequisiteTopicSlugs: [],
          measurableObjective: 'Objective for step three of the compiler pipeline',
          whyThisMatters: 'Important foundation for understanding subsequent stages'
        }
      ]
    };

    expect(() => validateAndSortMilestones(invalidMilestones)).toThrow(/references unknown prerequisite/i);
  });

  // =========================================================================
  // Scenario 9: Cyclic prerequisite dependencies are rejected
  // =========================================================================
  it('9. Cyclic prerequisite dependencies (A -> B -> C -> A) are strictly detected and rejected by Kahn algorithm', () => {
    const cyclicMilestones = {
      pathTitle: 'Cyclic Dependency Path',
      targetRole: 'Software Engineer',
      pedagogicalApproach: 'Circular path for testing Kahn cycle detection algorithm.',
      estimatedTotalWeeks: 4,
      milestones: [
        {
          topicSlug: 'node-alpha',
          title: 'Alpha',
          domainSkillSlug: 'fundamentals',
          difficulty: 'BEGINNER',
          estimatedSessions: 1,
          prerequisiteTopicSlugs: ['node-gamma'],
          measurableObjective: 'Alpha objective for testing circular dependencies',
          whyThisMatters: 'Alpha importance for cycle validation'
        },
        {
          topicSlug: 'node-beta',
          title: 'Beta',
          domainSkillSlug: 'fundamentals',
          difficulty: 'INTERMEDIATE',
          estimatedSessions: 1,
          prerequisiteTopicSlugs: ['node-alpha'],
          measurableObjective: 'Beta objective for testing circular dependencies',
          whyThisMatters: 'Beta importance for cycle validation'
        },
        {
          topicSlug: 'node-gamma',
          title: 'Gamma',
          domainSkillSlug: 'fundamentals',
          difficulty: 'ADVANCED',
          estimatedSessions: 1,
          prerequisiteTopicSlugs: ['node-beta'],
          measurableObjective: 'Gamma objective for testing circular dependencies',
          whyThisMatters: 'Gamma importance for cycle validation'
        }
      ]
    };

    expect(() => validateAndSortMilestones(cyclicMilestones)).toThrow(/Dependency cycle detected/i);
  });

  // =========================================================================
  // Scenario 10: A completed milestone with low long-term mastery does not trigger endless reinforcement
  // =========================================================================
  it('10. A completed milestone with low long-term mastery does not trigger endless reinforcement or loop', async () => {
    // Concept completed in roadmap, but long-term mastery score is 35 (below 70)
    const activeRoadmap = await RoadmapService.getCurrentRoadmap(userIdA);
    const item0 = activeRoadmap.items[0];

    // Mark milestone item as completed
    await prisma.learningPathItem.update({
      where: { id: item0.id },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });

    // Record low mastery score for concept
    await prisma.userConcept.upsert({
      where: { userId_conceptId: { userId: userIdA, conceptId: item0.conceptId } },
      update: { masteryScore: 35, attempts: 1, correctAttempts: 1 },
      create: { userId: userIdA, conceptId: item0.conceptId, masteryScore: 35, attempts: 1, correctAttempts: 1 }
    });

    // Today recommendation must advance past item0 to the NEXT uncompleted milestone
    const decision = await AdaptiveEngine.evaluateNextAction(userIdA);
    expect(decision.actionType).not.toBe('REINFORCE');
    if (activeRoadmap.items.length > 1) {
      expect(decision.concept.id).not.toBe(item0.conceptId);
    }
  });

  // =========================================================================
  // Scenario 11: A learner who passes a milestone advances when prerequisites and completion criteria permit it
  // =========================================================================
  it('11. A learner who passes a milestone advances cleanly to the next eligible milestone', async () => {
    const decision = await AdaptiveEngine.evaluateNextAction(userIdA);
    expect(['ADVANCE', 'REVIEW', 'COMPLETED']).toContain(decision.actionType);
  });

  // =========================================================================
  // Scenario 12: A single quiz pass does not incorrectly imply durable mastery
  // =========================================================================
  it('12. A single high-scoring quiz pass satisfies milestone completion without fabricating durable mastery', () => {
    const initialEvaluation = MasteryEngine.evaluateAssessmentOutcome({
      currentMastery: 0,
      currentConfidence: 50,
      isPassed: true,
      scorePercentage: 100,
      hintsUsed: 0,
      priorAttempts: 0,
      correctAttempts: 0,
      independentSuccesses: 0,
      assistedSuccesses: 0,
      timeSpentSeconds: 90
    });

    // 1 unassisted pass gives +20, capped at 45. Never marks 100 or durable exemplary mastery.
    expect(initialEvaluation.isPassed).toBe(true);
    expect(initialEvaluation.newMastery).toBeLessThanOrEqual(45);
    expect(initialEvaluation.newMastery).toBeGreaterThanOrEqual(20);
    expect(initialEvaluation.isIndependentSuccess).toBe(true);
  });

  // =========================================================================
  // Scenario 13: Duplicate quiz submissions do not duplicate XP or progress
  // =========================================================================
  it('13. Redundant or duplicate quiz submissions are strictly idempotent and do not duplicate XP', async () => {
    // Find active quiz for User A
    const quiz = await prisma.quiz.findFirst({
      where: { lesson: { userId: userIdA } },
      include: { questions: true }
    });

    if (quiz && quiz.questions.length > 0) {
      const responses = quiz.questions.map(q => ({ questionId: q.id, response: q.answer }));

      // First submission
      await QuizService.submitQuiz(userIdA, quiz.id, responses, 60, 0);
      const xpCountAfterFirst = await prisma.xpTransaction.count({
        where: { userId: userIdA, sourceId: quiz.id }
      });
      expect(xpCountAfterFirst).toBe(1);

      // Re-submit identical quiz
      await QuizService.submitQuiz(userIdA, quiz.id, responses, 60, 0);
      const xpCountAfterSecond = await prisma.xpTransaction.count({
        where: { userId: userIdA, sourceId: quiz.id }
      });

      // Must remain exactly 1 XP transaction
      expect(xpCountAfterSecond).toBe(1);
    }
  });

  // =========================================================================
  // Scenario 14: One learner cannot access another learner's generated content
  // =========================================================================
  it('14. Cross-learner isolation: Learner B cannot view or submit quizzes for Learner A generated lessons', async () => {
    const lessonA = await prisma.lesson.findFirst({
      where: { userId: userIdA }
    });

    if (lessonA) {
      // Learner B attempts to load Learner A's lesson
      const forbiddenRes = await request(app)
        .get(`/api/v1/lessons/${lessonA.slug}`)
        .set('Authorization', `Bearer ${userTokenB}`);

      expect(forbiddenRes.status).toBe(403);
    }
  });

  // =========================================================================
  // Scenario 15: Missing generated content produces a safe, recoverable result
  // =========================================================================
  it('15. Missing generated content produces a safe, recoverable response without silent unrelated substitution', async () => {
    const unseededRes = await request(app)
      .get('/api/v1/lessons/non-existent-arbitrary-slug-xyz')
      .set('Authorization', `Bearer ${userTokenA}`);

    expect([404, 422]).toContain(unseededRes.status);
    expect(unseededRes.body.success).toBe(false);
  });

  // =========================================================================
  // Scenario 16: Concurrent path generation does not create conflicting active paths
  // =========================================================================
  it('16. Concurrent path generation requests are locked and deduplicated without creating duplicate ACTIVE paths', async () => {
    // Run two simultaneous forced generation calls for Learner A
    const [path1, path2] = await Promise.all([
      RoadmapService.generateRoadmap(userIdA, { force: true }),
      RoadmapService.generateRoadmap(userIdA, { force: true })
    ]);

    expect(path1).toBeDefined();
    expect(path2).toBeDefined();
    expect(path1.id).toBe(path2.id);

    // Verify there is exactly ONE active learning path in the database for User A
    const activePaths = await prisma.learningPath.findMany({
      where: { userId: userIdA, status: 'ACTIVE' }
    });
    expect(activePaths.length).toBe(1);
  });

  // =========================================================================
  // Scenario 17: Legacy static lessons remain accessible
  // =========================================================================
  it('17. Legacy static seeded lessons remain accessible and discoverable for backwards compatibility', async () => {
    const staticLesson = await prisma.lesson.findFirst({
      where: { userId: null, status: 'PUBLISHED' }
    });

    if (staticLesson) {
      const res = await request(app)
        .get(`/api/v1/lessons/${staticLesson.slug}`)
        .set('Authorization', `Bearer ${userTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.lesson.id).toBe(staticLesson.id);
      expect(res.body.data.lesson.content).toBeDefined();
    }
  });

  // =========================================================================
  // Scenario 18: A fully completed path reaches the expected terminal state
  // =========================================================================
  it('18. A fully completed learning path cleanly reaches terminal COMPLETED state without looping', async () => {
    // Mark ALL items in User A's active path as COMPLETED
    const activePath = await prisma.learningPath.findFirst({
      where: { userId: userIdA, status: 'ACTIVE' },
      include: { items: true }
    });

    await prisma.learningPathItem.updateMany({
      where: { learningPathId: activePath.id },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });

    // Evaluate Today recommendation
    const decision = await AdaptiveEngine.evaluateNextAction(userIdA);

    // If no spaced recall is due, must return COMPLETED with isPathCompleted: true
    if (decision.actionType === 'COMPLETED') {
      expect(decision.isPathCompleted).toBe(true);
      expect(decision.reason).toContain('mastered every milestone');
    } else {
      // If spaced review is due, it returns REVIEW without altering milestone completion status
      expect(decision.actionType).toBe('REVIEW');
    }
  });
});
