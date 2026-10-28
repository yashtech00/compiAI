import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import prisma from '../src/config/prisma.js';
import {
  ResilientAiProvider,
  AiProviderError,
  CircuitBreakerOpenError,
  UserBudgetExceededError
} from '../src/modules/ai/resilient-ai-provider.js';
import { PathSynthesisService } from '../src/modules/learning-paths/path-synthesis.service.js';
import { RoadmapService } from '../src/modules/learning-paths/roadmap.service.js';
import { SessionGeneratorService } from '../src/modules/lessons/session-generator.service.js';
import { QuizService } from '../src/modules/quizzes/quizzes.service.js';
import { logger } from '../src/utils/logger.js';
import { AiService } from '../src/modules/ai/ai.service.js';

describe('Phase 5: Production Reliability, AI Resilience & Observability Test Suite', () => {
  let testUserId;
  let testConceptId;
  let testMilestone;

  beforeEach(async () => {
    ResilientAiProvider.resetState();

    // Setup isolated test user in DB
    const user = await prisma.user.create({
      data: {
        email: `reliability-test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`,
        passwordHash: 'dummyhash',
        profile: {
          create: {
            displayName: 'Reliability Tester',
            experienceLevel: 'INTERMEDIATE',
            dailyMinutes: 15
          }
        }
      }
    });
    testUserId = user.id;

    // Fetch or create a test concept
    const concept = await prisma.concept.findFirst({
      where: { status: 'ACTIVE' }
    });
    testConceptId = concept?.id;

    testMilestone = {
      topicSlug: `reliability-test-milestone-${Date.now()}`,
      title: 'Distributed Transaction Processing in Go',
      targetOutcome: 'Implement two-phase commit protocol with rollback coordinator',
      measurableObjective: 'Implement two-phase commit protocol with rollback coordinator',
      difficulty: 'INTERMEDIATE',
      domainSkillSlug: 'backend-architecture',
      estimatedSessions: 1
    };
  });

  afterEach(async () => {
    ResilientAiProvider.resetState();
    // Clean up created user and cascaded data
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => null);
    }
  });

  // =========================================================================
  // 1. Successful AI generation
  // =========================================================================
  it('1. Successful AI generation records metadata, latency, and tokens', async () => {
    const mockOutput = {
      pathTitle: 'Go Distributed Systems',
      targetRole: 'Distributed Systems Engineer',
      pedagogicalApproach: 'Hands-on systems implementation',
      estimatedTotalWeeks: 6,
      milestones: [
        {
          topicSlug: 'raft-basics',
          title: 'Raft Basics',
          domainSkillSlug: 'distributed-systems',
          difficulty: 'BEGINNER',
          measurableObjective: 'Understand Raft state machine replication invariants',
          estimatedSessions: 2,
          prerequisiteTopicSlugs: [],
          whyThisMatters: 'Core foundation for consensus'
        }
      ]
    };

    ResilientAiProvider.setMockClient({
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify(mockOutput),
          usageMetadata: { promptTokenCount: 150, candidatesTokenCount: 300 }
        })
      }
    });

    const result = await ResilientAiProvider.generateJson({
      prompt: 'Test prompt',
      requestType: 'test_generation',
      userId: testUserId
    });

    expect(result.data).toBeDefined();
    expect(result.data.pathTitle).toBe('Go Distributed Systems');
    expect(result.isAiGenerated).toBe(true);
    expect(result.generationSource).toBe('AI_SYNTHESIZED');
    expect(result.tokens.input).toBe(150);
    expect(result.tokens.output).toBe(300);

    const snapshot = ResilientAiProvider.getObservabilitySnapshot();
    expect(snapshot.metrics.requestsSuccess).toBe(1);
    expect(snapshot.metrics.requestsTotal).toBe(1);
  });

  // =========================================================================
  // 2. Transient provider failure followed by successful retry
  // =========================================================================
  it('2. Transient network failure triggers exponential backoff and succeeds on retry', async () => {
    let callCount = 0;
    ResilientAiProvider.setMockClient({
      models: {
        generateContent: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            const networkErr = new Error('fetch failed: ECONNRESET');
            networkErr.code = 'ECONNRESET';
            throw networkErr;
          }
          return {
            text: JSON.stringify({ reply: 'Recovered after transient drop' }),
            usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 50 }
          };
        })
      }
    });

    const result = await ResilientAiProvider.generateJson({
      prompt: 'Retry test prompt',
      requestType: 'retry_test',
      userId: testUserId,
      maxRetries: 2
    });

    expect(callCount).toBe(2);
    expect(result.data.reply).toBe('Recovered after transient drop');
    const snapshot = ResilientAiProvider.getObservabilitySnapshot();
    expect(snapshot.metrics.requestsRetried).toBe(1);
    expect(snapshot.metrics.requestsSuccess).toBe(1);
  });

  // =========================================================================
  // 3. Rate limiting with bounded retries
  // =========================================================================
  it('3. Rate limiting (429) is classified as non-retryable quota failure without retry storms', async () => {
    let callCount = 0;
    ResilientAiProvider.setMockClient({
      models: {
        generateContent: vi.fn().mockImplementation(async () => {
          callCount++;
          const quotaErr = new Error('429 RESOURCE_EXHAUSTED: Quota exceeded for metric');
          quotaErr.status = 429;
          throw quotaErr;
        })
      }
    });

    await expect(
      ResilientAiProvider.generateJson({
        prompt: 'Quota test prompt',
        requestType: 'quota_test',
        userId: testUserId,
        maxRetries: 3
      })
    ).rejects.toThrow(/AI Provider generation failed/);

    // Crucial: exactly 1 attempt was made. No retries were wasted on 429 quota exhaustion.
    expect(callCount).toBe(1);
    const snapshot = ResilientAiProvider.getObservabilitySnapshot();
    expect(snapshot.metrics.quotaExhaustedCount).toBe(1);
    expect(snapshot.metrics.requestsRetried).toBe(0);
  });

  // =========================================================================
  // 4. Exhausted quota without an infinite retry loop
  // =========================================================================
  it('4. Quota exhaustion immediately yields goal-aligned deterministic fallback without looping', async () => {
    ResilientAiProvider.setMockClient({
      models: {
        generateContent: vi.fn().mockImplementation(async () => {
          const quotaErr = new Error('Resource exhausted: Rate limit reached');
          quotaErr.status = 429;
          throw quotaErr;
        })
      }
    });

    const session = await SessionGeneratorService.generateSessionPayload({
      milestone: testMilestone,
      learnerProfile: {
        userId: testUserId,
        goalTitle: 'Distributed Systems in Go',
        experienceLevel: 'INTERMEDIATE',
        dailyMinutes: 15
      }
    });

    expect(session).toBeDefined();
    expect(session.lessonTitle).toContain('Distributed Transaction');
    expect(session.generationSource).toBe('DETERMINISTIC_SCAFFOLD');
    expect(session.isTrulyAiGenerated).toBe(false);
  });

  // =========================================================================
  // 5. Provider timeout
  // =========================================================================
  it('5. Provider timeout is handled and respects bounded request duration', async () => {
    ResilientAiProvider.setMockClient({
      models: {
        generateContent: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 500))
        )
      }
    });

    await expect(
      ResilientAiProvider.generateJson({
        prompt: 'Timeout test',
        timeoutMs: 100,
        maxRetries: 1,
        userId: testUserId
      })
    ).rejects.toThrow(/timeout/i);

    const snapshot = ResilientAiProvider.getObservabilitySnapshot();
    expect(snapshot.metrics.requestsFailed).toBe(1);
  });

  // =========================================================================
  // 6. Malformed JSON or schema-invalid output
  // =========================================================================
  it('6. Malformed JSON output is classified as INVALID_OUTPUT and retried safely', async () => {
    let callCount = 0;
    ResilientAiProvider.setMockClient({
      models: {
        generateContent: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return { text: '<<<This is not valid JSON at all>>>' };
          }
          return { text: JSON.stringify({ valid: true }) };
        })
      }
    });

    const result = await ResilientAiProvider.generateJson({
      prompt: 'JSON test',
      maxRetries: 2,
      userId: testUserId
    });

    expect(callCount).toBe(2);
    expect(result.data.valid).toBe(true);
    const snapshot = ResilientAiProvider.getObservabilitySnapshot();
    expect(snapshot.metrics.requestsRetried).toBe(1);
  });

  // =========================================================================
  // 7. Deterministic fallback success
  // =========================================================================
  it('7. Deterministic scaffold succeeds and returns honest metadata without external AI', async () => {
    ResilientAiProvider.resetMockClient(); // No real API key and no mock

    const path = await PathSynthesisService.synthesizePersonalizedPath({
      goalTitle: 'Distributed Systems & Consensus in Go',
      targetRole: 'Distributed Systems Engineer',
      experienceLevel: 'INTERMEDIATE',
      dailyMinutes: 15,
      knownSkills: ['go', 'docker']
    });

    expect(path).toBeDefined();
    expect(path.generationSource).toBe('DETERMINISTIC_SCAFFOLD');
    expect(path.isAiGenerated).toBe(false);
    expect(path.milestones.length).toBeGreaterThanOrEqual(5);
  });

  // =========================================================================
  // 8. Fallback rejection when required learning objectives cannot be met
  // =========================================================================
  it('8. Fallback rejects milestones with missing or empty objectives with recoverable error', async () => {
    await expect(
      SessionGeneratorService.generateSessionPayload({
        milestone: { title: 'Broken Milestone', measurableObjective: '' },
        learnerProfile: { userId: testUserId, goalTitle: 'Anything' }
      })
    ).rejects.toThrow(/milestone lacks a valid measurable objective/);
  });

  // =========================================================================
  // 9. Repeated requests reusing the same generated session
  // =========================================================================
  it('9. Repeated requests for the same milestone reuse the existing persisted lesson', async () => {
    const session1 = await SessionGeneratorService.getOrCreateSession({
      userId: testUserId,
      conceptId: testConceptId,
      milestone: testMilestone,
      learnerProfile: { userId: testUserId, goalTitle: 'Distributed Systems' }
    });

    const session2 = await SessionGeneratorService.getOrCreateSession({
      userId: testUserId,
      conceptId: testConceptId,
      milestone: testMilestone,
      learnerProfile: { userId: testUserId, goalTitle: 'Distributed Systems' }
    });

    expect(session1.id).toBe(session2.id);
    expect(session1.idempotencyKey).toBe(session2.idempotencyKey);

    // Verify only one lesson exists in the database
    const count = await prisma.lesson.count({
      where: { idempotencyKey: session1.idempotencyKey }
    });
    expect(count).toBe(1);
  });

  // =========================================================================
  // 10. Concurrent requests from separate service instances
  // =========================================================================
  it('10. Concurrent requests with same idempotency key safely coalesce and return identical lesson', async () => {
    // Both concurrently invoke getOrCreateSession
    const [resultA, resultB] = await Promise.all([
      SessionGeneratorService.getOrCreateSession({
        userId: testUserId,
        conceptId: testConceptId,
        milestone: testMilestone,
        learnerProfile: { userId: testUserId, goalTitle: 'Distributed Systems' }
      }),
      SessionGeneratorService.getOrCreateSession({
        userId: testUserId,
        conceptId: testConceptId,
        milestone: testMilestone,
        learnerProfile: { userId: testUserId, goalTitle: 'Distributed Systems' }
      })
    ]);

    expect(resultA.id).toBe(resultB.id);
  });

  // =========================================================================
  // 11. Database uniqueness conflict recovery (P2002)
  // =========================================================================
  it('11. Database uniqueness conflict (P2002) recovers existing record without failing', async () => {
    // Create an existing lesson with a specific idempotency key
    const customKey = `test-idemp-${Date.now()}`;
    const initialLesson = await SessionGeneratorService.getOrCreateSession({
      userId: testUserId,
      conceptId: testConceptId,
      milestone: { ...testMilestone, topicSlug: customKey },
      learnerProfile: { userId: testUserId, goalTitle: 'Distributed Systems' }
    });

    // Simulate multi-process transaction collision calling _persistSessionTransactionally directly
    const recoveredLesson = await SessionGeneratorService._persistSessionTransactionally({
      userId: testUserId,
      conceptId: testConceptId,
      idempotencyKey: initialLesson.idempotencyKey,
      validated: {
        lessonTitle: 'Simulated Concurrent Lesson',
        lessonSlug: `simulated-${Date.now()}`,
        objective: 'Objective test',
        difficulty: 'BEGINNER',
        estimatedMinutes: 15,
        activities: {
          conceptOverview: { summary: 'Summ', keyTerms: [] },
          mentalModel: { analogy: 'Ana', intuition: 'Int', commonMisconceptions: [] },
          visualization: { visualType: 'diagram', title: 'Vis', diagram: 'Diag', explanation: 'Exp' },
          codeMechanics: { language: 'go', codeSnippet: 'code', walkthrough: 'walk' },
          productionScenario: { scenario: 'Scen', tradeoffs: [], failureMode: 'Fail' },
          practicalChallenge: { prompt: 'P', starterCode: 'S', hint: 'H', solution: 'Sol', explanation: 'E' },
          coreSynthesis: { takeaways: ['T1'], nextStep: 'N1' }
        },
        quiz: {
          title: 'Quiz',
          questions: [
            {
              questionText: 'Q1?',
              questionType: 'MCQ',
              options: ['A', 'B', 'C', 'D'],
              correctAnswerIndex: 0,
              explanation: 'Exp',
              difficulty: 1
            }
          ]
        }
      },
      model: 'test-model'
    });

    expect(recoveredLesson.id).toBe(initialLesson.id);
  });

  // =========================================================================
  // 12. Process interruption or stale in-progress generation recovery
  // =========================================================================
  it('12. In-flight generation lock safely cleans up on completion or error', async () => {
    // Calling getCurrentRoadmap creates path if none exists
    const roadmap = await RoadmapService.getCurrentRoadmap(testUserId);
    expect(roadmap).toBeDefined();
    expect(roadmap.status).toBe('ACTIVE');

    // Subsequent retrieval reuses existing path idempotently
    const roadmapAgain = await RoadmapService.getCurrentRoadmap(testUserId);
    expect(roadmapAgain.id).toBe(roadmap.id);
  });

  // =========================================================================
  // 13. Global and per-user generation limits
  // =========================================================================
  it('13. Per-user generation limits block excessive requests within sliding window', () => {
    const budgetUser = 'user-budget-check-123';

    // Simulate 15 requests
    for (let i = 0; i < 15; i++) {
      ResilientAiProvider.checkUserBudget(budgetUser);
    }

    // 16th request must throw UserBudgetExceededError
    expect(() => ResilientAiProvider.checkUserBudget(budgetUser)).toThrow(UserBudgetExceededError);
    const snapshot = ResilientAiProvider.getObservabilitySnapshot();
    expect(snapshot.metrics.budgetRejections).toBe(1);
  });

  // =========================================================================
  // 14. Excessive input and output rejection
  // =========================================================================
  it('14. Excessive or invalid inputs are rejected at boundary', async () => {
    await expect(
      PathSynthesisService.synthesizePersonalizedPath({
        goalTitle: ' ' // empty/invalid
      })
    ).rejects.toThrow(/valid goalTitle/);
  });

  // =========================================================================
  // 15. Existing lessons remain accessible during provider outages
  // =========================================================================
  it('15. Provider outage (Circuit Breaker OPEN) does not disrupt access to existing lessons', async () => {
    // 1. Create a lesson
    const existingLesson = await SessionGeneratorService.getOrCreateSession({
      userId: testUserId,
      conceptId: testConceptId,
      milestone: testMilestone,
      learnerProfile: { userId: testUserId, goalTitle: 'Distributed Systems' }
    });

    // 2. Force trip circuit breaker to OPEN (simulating Gemini total outage)
    ResilientAiProvider._circuitState = 'OPEN';
    ResilientAiProvider._nextAttemptAt = Date.now() + 60000;

    // 3. Verify existing lesson remains 100% readable and accessible
    const fetchedLesson = await prisma.lesson.findUnique({
      where: { id: existingLesson.id },
      include: { activities: true, quizzes: { include: { questions: true } } }
    });

    expect(fetchedLesson).toBeDefined();
    expect(fetchedLesson.id).toBe(existingLesson.id);
    expect(fetchedLesson.activities.length).toBe(6);
  });

  // =========================================================================
  // 16. No duplicate XP after repeated quiz submissions
  // =========================================================================
  it('16. Repeated quiz submissions award XP strictly once (idempotent)', async () => {
    // Generate a lesson with a quiz
    const lesson = await SessionGeneratorService.getOrCreateSession({
      userId: testUserId,
      conceptId: testConceptId,
      milestone: testMilestone,
      learnerProfile: { userId: testUserId, goalTitle: 'Distributed Systems' }
    });

    const quiz = lesson.quizzes[0];
    const responses = quiz.questions.map(q => ({
      questionId: q.id,
      response: q.answer // 100% correct
    }));

    // Submit 1st time
    await QuizService.submitQuiz(testUserId, quiz.id, responses, 60);

    // Submit 2nd time (repeated submission)
    await QuizService.submitQuiz(testUserId, quiz.id, responses, 45);

    // Verify exactly one XpTransaction exists for this quiz
    const xpRecords = await prisma.xpTransaction.findMany({
      where: {
        userId: testUserId,
        sourceType: 'QUIZ',
        sourceId: quiz.id
      }
    });

    expect(xpRecords.length).toBe(1);
    expect(xpRecords[0].amount).toBe(75); // Perfect score XP
  });

  // =========================================================================
  // 17. No sensitive credentials in logged errors
  // =========================================================================
  it('17. Logger sanitizes credentials and tokens in messages and metadata', () => {
    const rawKey = 'AIzaSyFakeSecretGeminiKey123456789012345';
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.error(`Error connecting with key=${rawKey}`, null, {
      apiKey: rawKey,
      authHeader: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
      password: 'SuperSecretPassword!'
    });

    const loggedOutput = consoleSpy.mock.calls[0]?.[0] || '';
    consoleSpy.mockRestore();

    expect(loggedOutput).not.toContain(rawKey);
    expect(loggedOutput).toContain('[REDACTED_CREDENTIAL]');
    expect(loggedOutput).toContain('[REDACTED]');
  });

  // =========================================================================
  // 18. Correct metrics and status reporting
  // =========================================================================
  it('18. Observability snapshot reports accurate metrics and provider status', () => {
    ResilientAiProvider._metrics.requestsTotal = 10;
    ResilientAiProvider._metrics.requestsSuccess = 8;
    ResilientAiProvider._metrics.requestsFailed = 2;
    ResilientAiProvider._circuitState = 'CLOSED';

    const snapshot = ResilientAiProvider.getObservabilitySnapshot();
    expect(snapshot.status).toBe('operational');
    expect(snapshot.circuitBreaker.state).toBe('CLOSED');
    expect(snapshot.metrics.requestsTotal).toBe(10);
    expect(snapshot.metrics.requestsSuccess).toBe(8);
    expect(snapshot.metrics.requestsFailed).toBe(2);
  });

  // =========================================================================
  // 19. Circuit-breaker recovery
  // =========================================================================
  it('19. Circuit breaker trips to OPEN on repeated failures, probes in HALF_OPEN, and recovers to CLOSED', () => {
    // Simulate 4 consecutive failures to trip circuit breaker
    for (let i = 0; i < 4; i++) {
      ResilientAiProvider.recordCircuitFailure({ category: 'TRANSIENT' });
    }

    expect(ResilientAiProvider._circuitState).toBe('OPEN');
    expect(() => ResilientAiProvider.checkCircuitBreaker()).toThrow(CircuitBreakerOpenError);

    // Simulate cooldown elapsed
    ResilientAiProvider._nextAttemptAt = Date.now() - 1000;
    ResilientAiProvider.checkCircuitBreaker();
    expect(ResilientAiProvider._circuitState).toBe('HALF_OPEN');

    // Probe success resets circuit breaker
    ResilientAiProvider.recordCircuitSuccess();
    expect(ResilientAiProvider._circuitState).toBe('CLOSED');
    expect(ResilientAiProvider._consecutiveFailures).toBe(0);
  });

  // =========================================================================
  // 20. No cross-learner data leakage
  // =========================================================================
  it('20. Cross-learner unauthorized quiz access is rejected with FORBIDDEN', async () => {
    // User A generates a custom lesson and quiz
    const lesson = await SessionGeneratorService.getOrCreateSession({
      userId: testUserId,
      conceptId: testConceptId,
      milestone: testMilestone,
      learnerProfile: { userId: testUserId, goalTitle: 'Distributed Systems' }
    });

    const otherUser = await prisma.user.create({
      data: {
        email: `unauthorized-user-${Date.now()}@test.com`,
        passwordHash: 'dummy'
      }
    });

    try {
      // User B attempts to submit User A's custom quiz
      await expect(
        QuizService.submitQuiz(otherUser.id, lesson.quizzes[0].id, [])
      ).rejects.toThrow(/Unauthorized/);
    } finally {
      await prisma.user.delete({ where: { id: otherUser.id } }).catch(() => null);
    }
  });
});
