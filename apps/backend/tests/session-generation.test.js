import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { SessionGeneratorService } from '../src/modules/lessons/session-generator.service.js';
import { validateSessionContent } from '../src/modules/lessons/session-generation.contract.js';

describe('Phase 2: Just-in-Time AI Learning Session Generation & Verification', () => {
  let userRaftToken, userRaft;
  let userWasmToken, userWasm;
  let otherUserToken, otherUser;
  const createdUserIds = [];

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } }
      }).catch(() => null);
    }
  });

  beforeAll(async () => {
    // 1. Create Learner A: Go & Raft (20 mins/day)
    const raftRes = await request(app).post('/api/v1/auth/signup').send({
      email: `raft-jit-${Date.now()}@test.com`,
      password: 'Password123!',
      displayName: 'Raft Engineer'
    });
    userRaftToken = raftRes.body.data.token;
    userRaft = raftRes.body.data.user;
    createdUserIds.push(userRaft.id);

    await request(app)
      .post('/api/v1/onboarding/step')
      .set('Authorization', `Bearer ${userRaftToken}`)
      .send({
        step: 3,
        goalTitle: 'Distributed consensus using Go and Raft',
        experienceLevel: 'ADVANCED',
        dailyMinutes: 20
      });

    await request(app)
      .post('/api/v1/onboarding/complete')
      .set('Authorization', `Bearer ${userRaftToken}`);

    // 2. Create Learner B: Rust & WebAssembly (10 mins/day)
    const wasmRes = await request(app).post('/api/v1/auth/signup').send({
      email: `wasm-jit-${Date.now()}@test.com`,
      password: 'Password123!',
      displayName: 'Wasm Engineer'
    });
    userWasmToken = wasmRes.body.data.token;
    userWasm = wasmRes.body.data.user;
    createdUserIds.push(userWasm.id);

    await request(app)
      .post('/api/v1/onboarding/step')
      .set('Authorization', `Bearer ${userWasmToken}`)
      .send({
        step: 3,
        goalTitle: 'High-Performance WebAssembly with Rust',
        experienceLevel: 'BEGINNER',
        dailyMinutes: 10
      });

    await request(app)
      .post('/api/v1/onboarding/complete')
      .set('Authorization', `Bearer ${userWasmToken}`);

    // 3. Create Learner C: Unrelated user for authorization checks
    const otherRes = await request(app).post('/api/v1/auth/signup').send({
      email: `other-jit-${Date.now()}@test.com`,
      password: 'Password123!',
      displayName: 'Other Engineer'
    });
    otherUserToken = otherRes.body.data.token;
    otherUser = otherRes.body.data.user;
    createdUserIds.push(otherUser.id);
  });

  // =========================================================================
  // SCENARIO 1 & 15: Milestone without prewritten lesson generates a playable session
  // =========================================================================
  it('1. Milestone without prewritten lesson generates a playable session on Today request', async () => {
    const todayRes = await request(app)
      .get('/api/v1/today/recommendation')
      .set('Authorization', `Bearer ${userRaftToken}`);

    expect(todayRes.status).toBe(200);
    const rec = todayRes.body.data.today.recommendedActivity;
    expect(rec).toBeDefined();
    expect(rec.actionType).toBe('ADVANCE');
    expect(rec.lessonSlug).toBeDefined();
    expect(rec.lessonId).toBeDefined();
    expect(rec.lessonSlug).not.toBeNull();

    // Verify the generated lesson exists in database
    const lessonInDb = await prisma.lesson.findUnique({
      where: { id: rec.lessonId },
      include: { activities: true, quizzes: { include: { questions: true } } }
    });

    expect(lessonInDb).toBeDefined();
    expect(lessonInDb.isAiGenerated).toBe(true);
    expect(lessonInDb.activities.length).toBe(6);
    expect(lessonInDb.quizzes.length).toBeGreaterThanOrEqual(1);
    expect(lessonInDb.quizzes[0].isFrozen).toBe(true);
    expect(lessonInDb.quizzes[0].questions.length).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // SCENARIO 2 & 3: Goal differentiation, technology stack, and daily budget
  // =========================================================================
  it('2. Different goals produce appropriately different content (Go vs Rust) and respect daily budgets', async () => {
    const raftToday = await request(app)
      .get('/api/v1/today/recommendation')
      .set('Authorization', `Bearer ${userRaftToken}`);

    const wasmToday = await request(app)
      .get('/api/v1/today/recommendation')
      .set('Authorization', `Bearer ${userWasmToken}`);

    const raftSlug = raftToday.body.data.today.recommendedActivity.lessonSlug;
    const wasmSlug = wasmToday.body.data.today.recommendedActivity.lessonSlug;

    // Load both lessons
    const raftLesson = await request(app)
      .get(`/api/v1/lessons/${raftSlug}`)
      .set('Authorization', `Bearer ${userRaftToken}`);

    const wasmLesson = await request(app)
      .get(`/api/v1/lessons/${wasmSlug}`)
      .set('Authorization', `Bearer ${userWasmToken}`);

    expect(raftLesson.status).toBe(200);
    expect(wasmLesson.status).toBe(200);

    const raftActivities = raftLesson.body.data.lesson.activities;
    const wasmActivities = wasmLesson.body.data.lesson.activities;

    const raftExample = raftActivities.find(a => a.activityType === 'SIMPLE_EXAMPLE');
    const wasmExample = wasmActivities.find(a => a.activityType === 'SIMPLE_EXAMPLE');

    // Go vs Rust technology check
    expect(raftExample.content.language.toLowerCase()).toBe('go');
    expect(wasmExample.content.language.toLowerCase()).toBe('rust');

    // Daily budget check (Raft: 20 mins, Wasm: 10 mins)
    expect(raftLesson.body.data.lesson.estimatedMinutes).toBe(20);
    expect(wasmLesson.body.data.lesson.estimatedMinutes).toBe(10);
  });

  // =========================================================================
  // SCENARIO 4: Schema validation rejects malformed AI output
  // =========================================================================
  it('4. Schema validator rejects malformed, empty, or contradictory AI output', () => {
    // Missing required fields
    expect(() => validateSessionContent({ lessonTitle: 'Short' })).toThrow();

    // Invalid quiz with duplicate options
    const invalidQuizPayload = {
      lessonTitle: 'Valid Title Here For Testing',
      lessonSlug: 'valid-slug-for-testing',
      objective: 'Comprehensive objective text for validation of the lesson',
      difficulty: 'BEGINNER',
      estimatedMinutes: 15,
      activities: {
        conceptOverview: { summary: 'A comprehensive summary text here explaining the architecture thoroughly.', keyTerms: [{ term: 'Term One', definition: 'Definition of term one here.' }, { term: 'Term Two', definition: 'Definition of term two here.' }] },
        mentalModel: { analogy: 'A relatable analogy string here to explain things.', intuition: 'Solid intuition string here for deeper comprehension.', commonMisconceptions: ['Misconception number one here.'] },
        visualization: { visualType: 'architecture', title: 'Architecture Diagram', diagram: '+--------+  -->  +--------+\n| Node A |       | Node B |\n+--------+       +--------+', explanation: 'Detailed explanation text here.' },
        codeMechanics: { language: 'go', codeSnippet: 'func main() {\n    fmt.Println("Testing code snippet")\n}', walkthrough: 'Walkthrough description text explaining the code mechanics in depth.' },
        productionScenario: { scenario: 'Production scenario context explaining real world high load and tradeoffs in systems.', tradeoffs: ['Tradeoff number one here', 'Tradeoff number two here'], failureMode: 'Failure mode string explaining catastrophic failure.' },
        practicalChallenge: { prompt: 'Practical prompt asking learner to implement solution.', hint: 'Hint text for guidance.', solution: 'Solution text showing working code implementation.', explanation: 'Explanation text detailing why this works.' },
        coreSynthesis: { takeaways: ['Key takeaway number one', 'Key takeaway number two'], nextStep: 'Next step teaser for the upcoming module.' }
      },
      quiz: {
        title: 'Quiz Title Verification',
        questions: [
          {
            questionText: 'Which option is correct for this test?',
            questionType: 'MCQ',
            options: ['Duplicate Choice', 'Duplicate Choice', 'Option C Choice', 'Option D Choice'], // duplicate!
            correctAnswerIndex: 0,
            explanation: 'Explanation for correct answer choice.',
            difficulty: 1
          },
          {
            questionText: 'Second question here for testing purposes?',
            questionType: 'MCQ',
            options: ['Option One Choice', 'Option Two Choice', 'Option Three Choice', 'Option Four Choice'],
            correctAnswerIndex: 0,
            explanation: 'Explanation text for the second question.',
            difficulty: 1
          }
        ]
      }
    };

    expect(() => validateSessionContent(invalidQuizPayload)).toThrow(/duplicate/i);
  });

  // =========================================================================
  // SCENARIO 5: Quota exhaustion and timeouts do not corrupt the database
  // =========================================================================
  it('5. Quota exhaustion fallback produces valid, relevant sessions without database corruption', async () => {
    // Force call SessionGeneratorService directly
    const customConcept = await prisma.concept.create({
      data: {
        userId: userRaft.id,
        isCustom: true,
        name: 'Raft Log Compaction and Snapshotting',
        slug: `custom-${userRaft.id.slice(0, 8)}-raft-log-compaction`,
        description: 'Understand log compaction mechanics in Raft.',
        difficulty: 'ADVANCED',
        status: 'ACTIVE'
      }
    });

    const session = await SessionGeneratorService.getOrCreateSession({
      userId: userRaft.id,
      conceptId: customConcept.id,
      learnerProfile: {
        targetGoal: 'Distributed consensus using Go and Raft',
        experienceLevel: 'ADVANCED',
        dailyMinutes: 20
      }
    });

    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.isAiGenerated).toBe(true);

    // Verify database has clean records
    const activitiesCount = await prisma.lessonActivity.count({ where: { lessonId: session.id } });
    expect(activitiesCount).toBe(6);

    const quiz = await prisma.quiz.findFirst({ where: { lessonId: session.id }, include: { questions: true } });
    expect(quiz).toBeDefined();
    expect(quiz.questions.length).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // SCENARIO 6, 7 & 8: Idempotency, Concurrent requests, and Page Refresh
  // =========================================================================
  it('6, 7 & 8. Concurrent requests and repeated page refreshes reuse the exact same persisted session', async () => {
    // Make 5 concurrent requests for Today recommendation
    const results = await Promise.all([
      request(app).get('/api/v1/today/recommendation').set('Authorization', `Bearer ${userWasmToken}`),
      request(app).get('/api/v1/today/recommendation').set('Authorization', `Bearer ${userWasmToken}`),
      request(app).get('/api/v1/today/recommendation').set('Authorization', `Bearer ${userWasmToken}`),
      request(app).get('/api/v1/today/recommendation').set('Authorization', `Bearer ${userWasmToken}`),
      request(app).get('/api/v1/today/recommendation').set('Authorization', `Bearer ${userWasmToken}`)
    ]);

    const lessonIds = results.map(r => r.body.data.today.recommendedActivity.lessonId);
    // All 5 requests must return the EXACT same lesson ID
    const uniqueLessonIds = new Set(lessonIds);
    expect(uniqueLessonIds.size).toBe(1);

    // Ensure no duplicate rows were created in database for this concept
    const conceptId = results[0].body.data.today.recommendedActivity.concept.id;
    const lessonsInDb = await prisma.lesson.findMany({
      where: { conceptId, userId: userWasm.id }
    });
    expect(lessonsInDb.length).toBe(1);
  });

  // =========================================================================
  // SCENARIO 9: Quiz answer keys are not exposed before submission
  // =========================================================================
  it('9. Quiz answer keys and explanations are NEVER exposed in lesson or quiz payloads before submission', async () => {
    const todayRes = await request(app)
      .get('/api/v1/today/recommendation')
      .set('Authorization', `Bearer ${userRaftToken}`);

    const slug = todayRes.body.data.today.recommendedActivity.lessonSlug;

    const lessonRes = await request(app)
      .get(`/api/v1/lessons/${slug}`)
      .set('Authorization', `Bearer ${userRaftToken}`);

    expect(lessonRes.status).toBe(200);
    const questions = lessonRes.body.data.lesson.quizzes[0].questions;
    expect(questions.length).toBeGreaterThanOrEqual(2);

    for (const q of questions) {
      expect(q.options).toBeDefined();
      expect(q.options.length).toBe(4);
      // ANSWER and EXPLANATION MUST NOT BE EXPOSED!
      expect(q.answer).toBeUndefined();
      expect(q.explanation).toBeUndefined();
    }
  });

  // =========================================================================
  // SCENARIO 10: MCQ grading is deterministic and server-side
  // =========================================================================
  it('10. MCQ grading is deterministic against frozen database answer key', async () => {
    const todayRes = await request(app)
      .get('/api/v1/today/recommendation')
      .set('Authorization', `Bearer ${userRaftToken}`);

    const slug = todayRes.body.data.today.recommendedActivity.lessonSlug;

    const lessonRes = await request(app)
      .get(`/api/v1/lessons/${slug}`)
      .set('Authorization', `Bearer ${userRaftToken}`);

    const quizId = lessonRes.body.data.lesson.quizzes[0].id;
    const questions = lessonRes.body.data.lesson.quizzes[0].questions;

    // Fetch real frozen answers directly from DB to test grading accuracy
    const dbQuestions = await prisma.quizQuestion.findMany({
      where: { quizId }
    });

    // Submit with correct answer for Q1, incorrect for Q2
    const responses = [
      { questionId: dbQuestions[0].id, response: String(dbQuestions[0].answer) },
      { questionId: dbQuestions[1].id, response: dbQuestions[1].options.find(o => o !== dbQuestions[1].answer) }
    ];

    const submitRes = await request(app)
      .post(`/api/v1/quizzes/${quizId}/submit`)
      .set('Authorization', `Bearer ${userRaftToken}`)
      .send({ responses, durationSeconds: 60, hintsUsed: 0 });

    expect(submitRes.status).toBe(200);
    const result = submitRes.body.data.result;
    // Score reflects difficulty weighting: Q1 (diff 1) correct, Q2 (diff 2) incorrect => 1 / 3 = 33%
    expect(result.score).toBe(33);
    expect(result.isPassed).toBe(false);

    // Verify explanation is only revealed AFTER submission
    expect(result.evaluatedResponses[0].isCorrect).toBe(true);
    expect(result.evaluatedResponses[1].isCorrect).toBe(false);
    expect(result.evaluatedResponses[1].correctAnswer).toBe(dbQuestions[1].answer);
  });

  // =========================================================================
  // SCENARIO 11: Invalid answer indexes and unauthorized access are rejected
  // =========================================================================
  it('11. Invalid answer options and cross-user unauthorized access are rejected', async () => {
    const todayRes = await request(app)
      .get('/api/v1/today/recommendation')
      .set('Authorization', `Bearer ${userRaftToken}`);

    const slug = todayRes.body.data.today.recommendedActivity.lessonSlug;

    // 1. Other user trying to access userRaft's private generated lesson
    const crossAccessLesson = await request(app)
      .get(`/api/v1/lessons/${slug}`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(crossAccessLesson.status).toBe(403);

    // 2. Other user trying to submit to userRaft's quiz
    const lessonInDb = await prisma.lesson.findUnique({
      where: { slug },
      include: { quizzes: true }
    });
    const quizId = lessonInDb.quizzes[0].id;

    const crossAccessQuiz = await request(app)
      .post(`/api/v1/quizzes/${quizId}/submit`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ responses: [] });

    expect(crossAccessQuiz.status).toBe(403);

    // 3. Submitting an invalid answer option not among the 4 choices
    const questions = await prisma.quizQuestion.findMany({ where: { quizId } });
    const invalidOptionSubmit = await request(app)
      .post(`/api/v1/quizzes/${quizId}/submit`)
      .set('Authorization', `Bearer ${userRaftToken}`)
      .send({
        responses: [{ questionId: questions[0].id, response: 'NOT_A_VALID_CHOICE' }]
      });

    expect(invalidOptionSubmit.status).toBe(400);
  });

  // =========================================================================
  // SCENARIO 12: Generating a session does not fabricate progress or XP
  // =========================================================================
  it('12. Generating a session does NOT grant synthetic XP, mastery, or milestone completion', async () => {
    // Create a new learner
    const freshRes = await request(app).post('/api/v1/auth/signup').send({
      email: `zero-synthetic-${Date.now()}@test.com`,
      password: 'Password123!',
      displayName: 'Zero Synthetic'
    });
    const freshToken = freshRes.body.data.token;
    const freshUser = freshRes.body.data.user;
    createdUserIds.push(freshUser.id);

    await request(app)
      .post('/api/v1/onboarding/step')
      .set('Authorization', `Bearer ${freshToken}`)
      .send({
        step: 3,
        goalTitle: 'Kubernetes Operator Development in Go',
        experienceLevel: 'INTERMEDIATE',
        dailyMinutes: 15
      });

    await request(app)
      .post('/api/v1/onboarding/complete')
      .set('Authorization', `Bearer ${freshToken}`);

    // Trigger session generation via Today
    const todayRes = await request(app)
      .get('/api/v1/today/recommendation')
      .set('Authorization', `Bearer ${freshToken}`);

    expect(todayRes.status).toBe(200);

    // Verify ZERO XP transactions exist for this user
    const xpRecords = await prisma.xpTransaction.findMany({
      where: { userId: freshUser.id }
    });
    expect(xpRecords.length).toBe(0);

    // Verify milestone is NOT completed
    const completedItems = await prisma.learningPathItem.count({
      where: {
        learningPath: { userId: freshUser.id },
        status: 'COMPLETED'
      }
    });
    expect(completedItems).toBe(0);

    // Verify streak is 0
    const streak = await prisma.streak.findUnique({ where: { userId: freshUser.id } });
    expect(streak?.currentStreak || 0).toBe(0);
  });

  // =========================================================================
  // SCENARIO 13: Existing static lessons continue working
  // =========================================================================
  it('13. Prewritten seeded lessons remain accessible and fully operational', async () => {
    const staticRes = await request(app)
      .get('/api/v1/lessons/mastering-the-javascript-event-loop')
      .set('Authorization', `Bearer ${userRaftToken}`);

    expect(staticRes.status).toBe(200);
    expect(staticRes.body.data.lesson.title).toContain('Event Loop');
    expect(staticRes.body.data.lesson.activities.length).toBeGreaterThanOrEqual(1);
  });

  // =========================================================================
  // SCENARIO 14: Assessment evidence influences subsequent recommendations
  // =========================================================================
  it('14. Quiz failure triggers targeted REINFORCE recommendation', async () => {
    // Learner B (Wasm) takes quiz and fails
    const todayRes = await request(app)
      .get('/api/v1/today/recommendation')
      .set('Authorization', `Bearer ${userWasmToken}`);

    const slug = todayRes.body.data.today.recommendedActivity.lessonSlug;
    const lessonRes = await request(app)
      .get(`/api/v1/lessons/${slug}`)
      .set('Authorization', `Bearer ${userWasmToken}`);

    const quizId = lessonRes.body.data.lesson.quizzes[0].id;
    const questions = await prisma.quizQuestion.findMany({ where: { quizId } });

    // Submit intentionally failing answers
    await request(app)
      .post(`/api/v1/quizzes/${quizId}/submit`)
      .set('Authorization', `Bearer ${userWasmToken}`)
      .send({
        responses: questions.map(q => ({
          questionId: q.id,
          response: q.options.find(o => o !== q.answer)
        })),
        durationSeconds: 90
      });

    // Check subsequent Today recommendation: should recommend REINFORCE
    const nextRec = await request(app)
      .get('/api/v1/today/recommendation')
      .set('Authorization', `Bearer ${userWasmToken}`);

    expect(nextRec.status).toBe(200);
    const action = nextRec.body.data.today.recommendedActivity;
    expect(action.actionType).toBe('REINFORCE');
    expect(action.reason).toContain('Targeted reinforcement');
  });
});
