import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { AdaptiveEngine } from '../src/modules/recommendations/adaptive-engine.js';

describe('Adaptive Learning Engine - 4 Decision Types & Safeguards', () => {
  let userToken = '';
  let testUserId = '';
  let jsClosuresConceptId = '';
  let jsAsyncConceptId = '';

  beforeAll(async () => {
    // 1. Create a fresh test learner
    const email = `adaptive_test_${Date.now()}@example.com`;
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email,
        password: 'Password123!',
        displayName: 'Adaptive Tester'
      });

    userToken = signupRes.body.data.token;
    testUserId = signupRes.body.data.user.id;

    // Set daily time to 10 minutes
    await prisma.userProfile.update({
      where: { userId: testUserId },
      data: { dailyMinutes: 10 }
    });

    // Fetch prerequisite concept pairs from DB
    const closures = await prisma.concept.findFirst({ where: { slug: 'js-closures' } });
    const asyncAwait = await prisma.concept.findFirst({ where: { slug: 'js-async-await' } });

    jsClosuresConceptId = closures?.id;
    jsAsyncConceptId = asyncAwait?.id;
  });

  it('1. PREREQUISITE: Should recommend foundational gap when next concept has unsatisfied prerequisites', async () => {
    // Neither js-closures nor js-async-await is mastered yet.
    // If the learner targets js-async-await (which requires js-closures), the engine must recommend PREREQUISITE (js-closures).
    const decision = await AdaptiveEngine.evaluateNextAction(testUserId, jsAsyncConceptId);

    expect(decision).toBeDefined();
    expect(decision.actionType).toBe('PREREQUISITE');
    expect(decision.concept.slug).toBe('js-closures');
    expect(decision.reason).toContain('Foundational prerequisite gap');
    expect(decision.dailyMinutes).toBe(10);
  });

  it('2. ADVANCE: Should recommend ADVANCE once foundational prerequisites have sufficient mastery evidence', async () => {
    // Grant strong mastery to the prerequisite js-closures
    await prisma.userConcept.upsert({
      where: { userId_conceptId: { userId: testUserId, conceptId: jsClosuresConceptId } },
      update: { masteryScore: 85, confidenceScore: 85, attempts: 2, correctAttempts: 2 },
      create: {
        userId: testUserId,
        conceptId: jsClosuresConceptId,
        masteryScore: 85,
        confidenceScore: 85,
        attempts: 2,
        correctAttempts: 2
      }
    });

    const decision = await AdaptiveEngine.evaluateNextAction(testUserId, jsAsyncConceptId);

    expect(decision).toBeDefined();
    expect(decision.actionType).toBe('ADVANCE');
    expect(decision.concept.slug).toBe('js-async-await');
    expect(decision.reason).toContain('Prerequisites satisfied. Ready to advance');
  });

  it('3. REINFORCE: Should recommend REINFORCE when recent practice shows misconceptions or low quiz score', async () => {
    // Simulate struggling on js-async-await (e.g. 50% score, misconceptions)
    await prisma.userConcept.upsert({
      where: { userId_conceptId: { userId: testUserId, conceptId: jsAsyncConceptId } },
      update: {
        masteryScore: 45,
        confidenceScore: 40,
        attempts: 1,
        correctAttempts: 0,
        misconceptions: ['Confused unhandled rejection crash behavior']
      },
      create: {
        userId: testUserId,
        conceptId: jsAsyncConceptId,
        masteryScore: 45,
        confidenceScore: 40,
        attempts: 1,
        correctAttempts: 0,
        misconceptions: ['Confused unhandled rejection crash behavior']
      }
    });

    const decision = await AdaptiveEngine.evaluateNextAction(testUserId);

    expect(decision).toBeDefined();
    expect(decision.actionType).toBe('REINFORCE');
    expect(decision.concept.slug).toBe('js-async-await');
    expect(decision.reason).toContain('Targeted reinforcement');
  });

  it('4. REVIEW: Should prioritize REVIEW when a previously mastered concept is due for recall practice', async () => {
    // Schedule an overdue recall on js-closures
    const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    await prisma.recallSchedule.upsert({
      where: { userId_conceptId: { userId: testUserId, conceptId: jsClosuresConceptId } },
      update: { scheduledAt: pastDate, status: 'SCHEDULED' },
      create: {
        userId: testUserId,
        conceptId: jsClosuresConceptId,
        scheduledAt: pastDate,
        intervalDays: 1,
        status: 'SCHEDULED'
      }
    });

    const decision = await AdaptiveEngine.evaluateNextAction(testUserId);

    expect(decision).toBeDefined();
    expect(decision.actionType).toBe('REVIEW');
    expect(decision.concept.slug).toBe('js-closures');
    expect(decision.reason).toContain('Spaced review is due');
  });

  it('5. Today API: Returns full adaptive payload with decision type and explainable reason', async () => {
    const res = await request(app)
      .get('/api/v1/today/recommendation')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.today.recommendedActivity.actionType).toBeDefined();
    expect(res.body.data.today.recommendedActivity.pacingLabel).toBe('10-Minute Standard Session');
    expect(res.body.data.today.recommendedActivity.reason).toBeDefined();
  });

  it('6. Time Budget Adaptation: Adapts stage configuration to daily minutes preference', async () => {
    const cfg5 = AdaptiveEngine.getTimeAdaptedConfig(5);
    expect(cfg5.dailyMinutes).toBe(5);
    expect(cfg5.includePractical).toBe(false);
    expect(cfg5.maxQuizQuestions).toBe(1);

    const cfg15 = AdaptiveEngine.getTimeAdaptedConfig(15);
    expect(cfg15.dailyMinutes).toBe(15);
    expect(cfg15.includePractical).toBe(true);
    expect(cfg15.includeExplainBack).toBe(false);

    const cfg20 = AdaptiveEngine.getTimeAdaptedConfig(20);
    expect(cfg20.dailyMinutes).toBe(20);
    expect(cfg20.includeExplainBack).toBe(true);
  });
});
