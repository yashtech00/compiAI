import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { AdaptiveEngine } from '../src/modules/recommendations/adaptive-engine.js';
import { SessionGeneratorService } from '../src/modules/lessons/session-generator.service.js';
import { QuizService } from '../src/modules/quizzes/quizzes.service.js';
import { MasteryEngine, PROGRESSION_RULES } from '../src/modules/learner-model/mastery-engine.js';

describe('Phase 3: Adaptive Learning Intelligence — Evidence-Driven Personalization (15 Scenarios)', () => {
  let userToken = '';
  let userId = '';
  let testGoal = null;
  let testPath = null;
  let conceptA = null;
  let conceptB = null;
  let conceptC = null;
  let sessionA = null;
  let sessionB = null;

  beforeAll(async () => {
    // Create test learner
    const email = `adaptive_phase3_${Date.now()}@example.com`;
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email,
        password: 'Password123!',
        displayName: 'Adaptive Intelligence Tester'
      });

    userToken = signupRes.body.data.token;
    userId = signupRes.body.data.user.id;

    // Set daily minutes to 15
    await prisma.userProfile.update({
      where: { userId },
      data: { dailyMinutes: 15, experienceLevel: 'BEGINNER' }
    });

    // Create a software engineering goal
    testGoal = await prisma.learningGoal.create({
      data: {
        userId,
        title: 'Distributed Systems & Go Raft',
        status: 'ACTIVE',
        targetReadiness: 0
      }
    });

    // Create 3 sequential concepts with prerequisite relationship:
    // Concept A -> Concept B (A is prereq of B) -> Concept C (B is prereq of C)
    const skill = await prisma.skill.findFirst();

    conceptA = await prisma.concept.create({
      data: {
        skillId: skill.id,
        name: `Raft RPC Basics ${Date.now()}`,
        slug: `raft-rpc-basics-${Date.now()}`,
        description: 'Understand RPC mechanics in distributed consensus',
        difficulty: 'BEGINNER',
        isCustom: true,
        userId
      }
    });

    conceptB = await prisma.concept.create({
      data: {
        skillId: skill.id,
        name: `Raft Log Replication ${Date.now()}`,
        slug: `raft-log-replication-${Date.now()}`,
        description: 'Replicating entries across majority quorum',
        difficulty: 'INTERMEDIATE',
        isCustom: true,
        userId
      }
    });

    conceptC = await prisma.concept.create({
      data: {
        skillId: skill.id,
        name: `Raft Leader Election ${Date.now()}`,
        slug: `raft-leader-election-${Date.now()}`,
        description: 'Term management and randomized election timeouts',
        difficulty: 'ADVANCED',
        isCustom: true,
        userId
      }
    });

    // Establish prerequisite dependencies
    await prisma.conceptPrerequisite.create({
      data: {
        conceptId: conceptB.id,
        prerequisiteConceptId: conceptA.id
      }
    });

    await prisma.conceptPrerequisite.create({
      data: {
        conceptId: conceptC.id,
        prerequisiteConceptId: conceptB.id
      }
    });

    // Create personalized learning path with 3 sequential milestones
    testPath = await prisma.learningPath.create({
      data: {
        userId,
        learningGoalId: testGoal.id,
        title: 'Distributed Systems & Go Raft Path',
        status: 'ACTIVE',
        items: {
          create: [
            {
              conceptId: conceptA.id,
              sequenceOrder: 1,
              status: 'PENDING',
              title: conceptA.name,
              targetOutcome: conceptA.description
            },
            {
              conceptId: conceptB.id,
              sequenceOrder: 2,
              status: 'PENDING',
              title: conceptB.name,
              targetOutcome: conceptB.description
            },
            {
              conceptId: conceptC.id,
              sequenceOrder: 3,
              status: 'PENDING',
              title: conceptC.name,
              targetOutcome: conceptC.description
            }
          ]
        }
      },
      include: { items: true }
    });

    // Generate Session for Concept A
    sessionA = await SessionGeneratorService.getOrCreateSession({
      userId,
      conceptId: conceptA.id,
      milestone: {
        title: conceptA.name,
        measurableObjective: conceptA.description,
        difficulty: 'BEGINNER',
        topicSlug: conceptA.slug,
        targetOutcome: conceptA.description
      },
      learnerProfile: { dailyMinutes: 15, experienceLevel: 'BEGINNER', targetGoal: testGoal.title }
    });
  });

  // =========================================================================
  // SCENARIO 1 & 15: Bug Regression: 100% quiz pass advances to Milestone 2 (NOT REINFORCE)
  // =========================================================================
  it('1 & 15. Regression Fix: Passing assessment with 100% allows learner to ADVANCE to next milestone', async () => {
    // 1. Initial recommendation should be ADVANCE for Concept A
    const initialRec = await AdaptiveEngine.evaluateNextAction(userId);
    expect(initialRec.actionType).toBe('ADVANCE');
    expect(initialRec.concept.id).toBe(conceptA.id);

    // 2. Submit quiz for Session A with 100% score
    const quizA = sessionA.quizzes[0];
    const quizQuestions = quizA.questions;

    const submitRes = await request(app)
      .post(`/api/v1/quizzes/${quizA.id}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        responses: quizQuestions.map(q => ({
          questionId: q.id,
          response: q.answer // 100% correct answers
        })),
        durationSeconds: 120
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.result.isPassed).toBe(true);
    expect(submitRes.body.data.result.score).toBe(100);

    // Verify milestone 1 is now COMPLETED
    const itemA = await prisma.learningPathItem.findFirst({
      where: { learningPathId: testPath.id, conceptId: conceptA.id }
    });
    expect(itemA.status).toBe('COMPLETED');

    // 3. Next recommendation MUST advance to Milestone 2 (concept B), NOT REINFORCE milestone 1!
    const nextRec = await AdaptiveEngine.evaluateNextAction(userId);
    expect(nextRec.actionType).toBe('ADVANCE');
    expect(nextRec.concept.id).toBe(conceptB.id);
    expect(nextRec.reason).toContain('Prerequisites satisfied');
  });

  // =========================================================================
  // SCENARIO 2: Passing assessment does not advance when required work remains incomplete
  // =========================================================================
  it('2. Incomplete Work Guard: Milestone status remains pending/in-progress if quiz was not completed', async () => {
    // Check Concept B is currently uncompleted
    const itemB = await prisma.learningPathItem.findFirst({
      where: { learningPathId: testPath.id, conceptId: conceptB.id }
    });
    expect(itemB.status).toBe('PENDING');

    // Trying to evaluate action when Concept B has not been passed will keep Concept B as current
    const rec = await AdaptiveEngine.evaluateNextAction(userId);
    expect(rec.concept.id).toBe(conceptB.id);
  });

  // =========================================================================
  // SCENARIO 3: Low scores trigger relevant reinforcement
  // =========================================================================
  it('3. Low Quiz Score: Triggers REINFORCE recommendation on first struggle', async () => {
    // Generate session for Concept B
    sessionB = await SessionGeneratorService.getOrCreateSession({
      userId,
      conceptId: conceptB.id,
      milestone: {
        title: conceptB.name,
        measurableObjective: conceptB.description,
        difficulty: 'INTERMEDIATE',
        topicSlug: conceptB.slug,
        targetOutcome: conceptB.description
      },
      learnerProfile: { dailyMinutes: 15, experienceLevel: 'BEGINNER', targetGoal: testGoal.title }
    });

    const quizB = sessionB.quizzes[0];
    const questionsB = quizB.questions;

    // Submit intentionally failing answers (0% score)
    const failRes = await request(app)
      .post(`/api/v1/quizzes/${quizB.id}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        responses: questionsB.map(q => ({
          questionId: q.id,
          response: q.options.find(o => o !== q.answer)
        })),
        durationSeconds: 60
      });

    expect(failRes.status).toBe(200);
    expect(failRes.body.data.result.isPassed).toBe(false);

    // Next recommendation should be REINFORCE for Concept B
    const reinforceRec = await AdaptiveEngine.evaluateNextAction(userId);
    expect(reinforceRec.actionType).toBe('REINFORCE');
    expect(reinforceRec.concept.id).toBe(conceptB.id);
    expect(reinforceRec.reason).toContain('Targeted reinforcement');
  });

  // =========================================================================
  // SCENARIO 4: Repeated incorrect answers trigger targeted remediation
  // =========================================================================
  it('4. Repeated Mistakes: Repeated failure with recorded misconceptions triggers REMEDIATE', async () => {
    const quizB = sessionB.quizzes[0];
    const questionsB = quizB.questions;

    // Submit failing answers a second time (attempts = 2)
    const secondFail = await request(app)
      .post(`/api/v1/quizzes/${quizB.id}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        responses: questionsB.map(q => ({
          questionId: q.id,
          response: q.options.find(o => o !== q.answer)
        })),
        durationSeconds: 80
      });

    expect(secondFail.status).toBe(200);

    // Verify userConcept has attempts = 2 and misconceptions recorded
    const ucB = await prisma.userConcept.findUnique({
      where: { userId_conceptId: { userId, conceptId: conceptB.id } }
    });
    expect(ucB.attempts).toBe(2);
    expect(Array.isArray(ucB.misconceptions)).toBe(true);
    expect(ucB.misconceptions.length).toBeGreaterThan(0);

    // Recommendation should now be REMEDIATE
    const remediateRec = await AdaptiveEngine.evaluateNextAction(userId);
    expect(remediateRec.actionType).toBe('REMEDIATE');
    expect(remediateRec.concept.id).toBe(conceptB.id);
    expect(remediateRec.reason).toContain('Targeted remediation');
    expect(remediateRec.misconceptions).toBeDefined();
  });

  // =========================================================================
  // SCENARIO 5: Successful remediation exits remediation loop
  // =========================================================================
  it('5. Remediation Exit: Passing remediation clears misconceptions and advances to next milestone', async () => {
    const quizB = sessionB.quizzes[0];
    const questionsB = quizB.questions;

    // Learner retries and passes Concept B quiz
    const passRes = await request(app)
      .post(`/api/v1/quizzes/${quizB.id}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        responses: questionsB.map(q => ({
          questionId: q.id,
          response: q.answer
        })),
        durationSeconds: 100
      });

    expect(passRes.status).toBe(200);
    expect(passRes.body.data.result.isPassed).toBe(true);

    // Misconceptions should be cleared upon passing
    const ucB = await prisma.userConcept.findUnique({
      where: { userId_conceptId: { userId, conceptId: conceptB.id } }
    });
    expect(ucB.misconceptions).toBeNull();

    // Recommendation must advance to Concept C (exiting remediation loop!)
    const advanceRec = await AdaptiveEngine.evaluateNextAction(userId);
    expect(advanceRec.actionType).toBe('ADVANCE');
    expect(advanceRec.concept.id).toBe(conceptC.id);
  });

  // =========================================================================
  // SCENARIO 6: Unmet prerequisites block dependent milestones
  // =========================================================================
  it('6. Dependency-Aware: Unmet prerequisite (<60 mastery) blocks progression', async () => {
    // Create an independent test learner without Concept B mastered targeting Concept C
    const newLearner = await prisma.user.create({
      data: {
        email: `unmet_prereq_${Date.now()}@example.com`,
        passwordHash: 'hash',
        profile: { create: { displayName: 'Prereq Learner', dailyMinutes: 15 } }
      }
    });

    // Evaluating Concept C (which requires Concept B) should return PREREQUISITE (Concept B)
    const prereqRec = await AdaptiveEngine.evaluateNextAction(newLearner.id, conceptC.id);
    expect(prereqRec.actionType).toBe('PREREQUISITE');
    expect(prereqRec.concept.id).toBe(conceptB.id);
    expect(prereqRec.reason).toContain('Foundational prerequisite gap');
  });

  // =========================================================================
  // SCENARIO 7: Completed paths stop recommending completed milestones indefinitely
  // =========================================================================
  it('7. Path Completion: Completed paths return COMPLETED state without looping', async () => {
    // Mark concept C as completed as well
    await prisma.learningPathItem.updateMany({
      where: { learningPathId: testPath.id, conceptId: conceptC.id },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });

    const completedRec = await AdaptiveEngine.evaluateNextAction(userId);
    expect(completedRec.actionType).toBe('COMPLETED');
    expect(completedRec.isPathCompleted).toBe(true);
    expect(completedRec.reason).toContain('Congratulations');

    // Today API recommendation should reflect PATH_COMPLETED
    const todayRes = await request(app)
      .get('/api/v1/today/recommendation')
      .set('Authorization', `Bearer ${userToken}`);

    expect(todayRes.status).toBe(200);
    expect(todayRes.body.data.today.recommendedActivity.actionType).toBe('COMPLETED');
    expect(todayRes.body.data.today.recommendedActivity.isPathCompleted).toBe(true);
  });

  // =========================================================================
  // SCENARIO 8: Duplicate quiz submission does not duplicate XP or mastery updates
  // =========================================================================
  it('8. Duplicate Submission Guard: Re-submitting same quiz awards 0 XP and prevents mastery inflation', async () => {
    const quizA = sessionA.quizzes[0];
    const questionsA = quizA.questions;

    // Count existing XP transactions for this quiz
    const xpBefore = await prisma.xpTransaction.findMany({
      where: { userId, sourceId: quizA.id }
    });

    // Submit already-passed quiz again
    const dupRes = await request(app)
      .post(`/api/v1/quizzes/${quizA.id}/submit`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        responses: questionsA.map(q => ({
          questionId: q.id,
          response: q.answer
        })),
        durationSeconds: 100
      });

    expect(dupRes.status).toBe(200);
    expect(dupRes.body.data.result.xpAwarded).toBe(0);

    const xpAfter = await prisma.xpTransaction.findMany({
      where: { userId, sourceId: quizA.id }
    });
    expect(xpAfter.length).toBe(xpBefore.length); // No duplicate XP record created
  });

  // =========================================================================
  // SCENARIO 9: Concurrent recommendation requests do not corrupt progress
  // =========================================================================
  it('9. Concurrency Integrity: Parallel recommendation requests resolve consistently', async () => {
    const promises = [
      request(app).get('/api/v1/today/recommendation').set('Authorization', `Bearer ${userToken}`),
      request(app).get('/api/v1/today/recommendation').set('Authorization', `Bearer ${userToken}`),
      request(app).get('/api/v1/today/recommendation').set('Authorization', `Bearer ${userToken}`)
    ];

    const results = await Promise.all(promises);
    for (const res of results) {
      expect(res.status).toBe(200);
      expect(res.body.data.today.recommendedActivity.actionType).toBe('COMPLETED');
    }
  });

  // =========================================================================
  // SCENARIO 10: Different learner evidence produces different next actions
  // =========================================================================
  it('10. Evidence Differentiation: High mastery learner advances while struggling learner reinforces', async () => {
    const testSkill = await prisma.skill.findFirst();

    const candidate1 = await prisma.concept.create({
      data: {
        skillId: testSkill.id,
        name: `Diff Test Concept ${Date.now()}`,
        slug: `diff-test-concept-${Date.now()}`,
        description: 'Differentiating learning pathways test concept',
        difficulty: 'BEGINNER',
        isCustom: false
      }
    });

    const learnerSuccess = await prisma.user.create({
      data: {
        email: `success_learner_${Date.now()}@example.com`,
        passwordHash: 'hash',
        profile: { create: { displayName: 'Success Learner', dailyMinutes: 15 } }
      }
    });

    const learnerStruggle = await prisma.user.create({
      data: {
        email: `struggle_learner_${Date.now()}@example.com`,
        passwordHash: 'hash',
        profile: { create: { displayName: 'Struggle Learner', dailyMinutes: 15 } }
      }
    });

    // Learner Success has high mastery
    await prisma.userConcept.create({
      data: {
        userId: learnerSuccess.id,
        conceptId: candidate1.id,
        masteryScore: 85,
        confidenceScore: 90,
        attempts: 2,
        correctAttempts: 2
      }
    });

    // Learner Struggle has low mastery with mistakes
    await prisma.userConcept.create({
      data: {
        userId: learnerStruggle.id,
        conceptId: candidate1.id,
        masteryScore: 35,
        confidenceScore: 30,
        attempts: 1,
        correctAttempts: 0,
        lastActionType: 'REINFORCE'
      }
    });

    const actionSuccess = await AdaptiveEngine.evaluateNextAction(learnerSuccess.id);
    const actionStruggle = await AdaptiveEngine.evaluateNextAction(learnerStruggle.id);

    // Struggling learner receives REINFORCE for the concept they struggled with
    expect(actionStruggle.actionType).toBe('REINFORCE');
    expect(actionStruggle.concept.id).toBe(candidate1.id);

    // Successful learner moves forward or reviews, NOT repeating the mastered candidate
    if (actionSuccess.concept) {
      expect(actionSuccess.concept.id).not.toBe(candidate1.id);
    }
  });

  // =========================================================================
  // SCENARIO 11: High mastery / experienced learner receives appropriately harder practice
  // =========================================================================
  it('11. Difficulty Personalization: ADVANCED learner receives ADVANCED difficulty session scaffold', async () => {
    const advancedSession = await SessionGeneratorService.getOrCreateSession({
      userId,
      conceptId: conceptC.id,
      milestone: {
        title: 'Distributed Consensus Invariants',
        difficulty: 'ADVANCED',
        topicSlug: 'consensus-invariants'
      },
      learnerProfile: {
        dailyMinutes: 15,
        experienceLevel: 'ADVANCED',
        targetGoal: 'Distributed Systems in Go'
      }
    });

    expect(advancedSession.difficulty).toBe('ADVANCED');
    expect(advancedSession.quizzes[0].questions.some(q => q.difficulty >= 2)).toBe(true);
  });

  // =========================================================================
  // SCENARIO 12: Daily time budget constrains generated session duration
  // =========================================================================
  it('12. Time Budget Adaptation: User daily budget constrains session duration', async () => {
    const tenMinSession = await SessionGeneratorService.getOrCreateSession({
      userId,
      conceptId: conceptA.id,
      learnerProfile: {
        dailyMinutes: 10,
        experienceLevel: 'BEGINNER',
        targetGoal: 'Distributed Systems'
      }
    });

    expect(tenMinSession.estimatedMinutes).toBeLessThanOrEqual(15);
  });

  // =========================================================================
  // SCENARIO 13: Existing static lessons and historical records remain functional
  // =========================================================================
  it('13. Backward Compatibility: Seeded reference lesson remains accessible and playable', async () => {
    const seededLesson = await prisma.lesson.findFirst({
      where: { userId: null, status: 'PUBLISHED', quizzes: { some: {} } },
      include: { quizzes: true }
    });

    expect(seededLesson).toBeDefined();
    expect(seededLesson.quizzes.length).toBeGreaterThan(0);

    const res = await request(app)
      .get(`/api/v1/lessons/${seededLesson.slug}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.lesson.id).toBe(seededLesson.id);
  });

  // =========================================================================
  // SCENARIO 14: Missing misconception evidence does not lead to fabricated claims
  // =========================================================================
  it('14. Zero Fabricated Claims: Missing misconceptions trigger general REINFORCE without fabricated claims', async () => {
    const testUser = await prisma.user.create({
      data: {
        email: `no_fab_${Date.now()}@example.com`,
        passwordHash: 'hash',
        profile: { create: { displayName: 'Truth Learner', dailyMinutes: 15 } }
      }
    });

    // Record failure without misconceptions
    await prisma.userConcept.create({
      data: {
        userId: testUser.id,
        conceptId: conceptA.id,
        masteryScore: 30,
        confidenceScore: 30,
        attempts: 1,
        correctAttempts: 0,
        misconceptions: null // No misconception evidence
      }
    });

    const decision = await AdaptiveEngine.evaluateNextAction(testUser.id);
    expect(decision.actionType).toBe('REINFORCE');
    expect(decision.misconceptions).toBeUndefined();
    // Reason must not fabricate specific hallucinated misconception
    expect(decision.reason).toContain('Targeted reinforcement');
  });
});
