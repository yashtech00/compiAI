import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiService } from '../src/modules/ai/ai.service.js';
import { RoadmapService } from '../src/modules/learning-paths/roadmap.service.js';
import { config } from '../src/config/index.js';

describe('Gemini AI Integration & Safe Fallbacks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Missing API Key: Falls back cleanly to Socratic tutor response without crashing', async () => {
    const response = await AiService.getTutorResponse({
      userQuestion: 'How does the event loop handle promises vs setTimeout?',
      lessonContext: {
        conceptName: 'Event Loop & Concurrency',
        skillName: 'JavaScript Core',
        objective: 'Understand task queues'
      },
      learnerState: { name: 'Alex' }
    });

    expect(response).toBeDefined();
    expect(response.reply).toBeDefined();
    expect(['mock', 'gemini']).toContain(response.provider);
    expect(response.reply).toContain('Event Loop');
    // Ensure secrets or internal auth headers are never leaked
    expect(response.reply).not.toContain(config.jwtSecret);
    if (config.geminiApiKey) {
      expect(JSON.stringify(response)).not.toContain(config.geminiApiKey);
    }
  });

  it('2. Missing API Key: Explain-back evaluates with structured heuristic rubric', async () => {
    const evaluation = await AiService.evaluateExplainBack({
      userExplanation: 'The call stack executes synchronous code while microtasks like promises run before macrotasks like setTimeout.',
      conceptName: 'Event Loop & Concurrency',
      learningObjective: 'Differentiate task queues'
    });

    expect(evaluation.accuracyScore).toBeGreaterThanOrEqual(60);
    expect(evaluation.completenessScore).toBeGreaterThanOrEqual(60);
    expect(evaluation.clarityScore).toBeGreaterThanOrEqual(60);
    expect(evaluation.overallScore).toBeGreaterThanOrEqual(60);
    expect(Array.isArray(evaluation.misconceptions)).toBe(true);
    expect(evaluation.feedback).toContain('Event Loop');
  });

  it('3. Missing API Key: analyzeLearningEvidence produces structured fallback analysis', async () => {
    const analysis = await AiService.analyzeLearningEvidence({
      analysisType: 'MINI',
      evidenceWindow: 'sessions-1-to-3',
      recentSessions: [
        {
          lesson: { title: 'Event Loop Mechanics', conceptId: 'c1' },
          hintsUsed: 4,
          initialMastery: 20,
          finalMastery: 40,
          status: 'COMPLETED'
        }
      ],
      accumulatedMisconceptions: ['Confused macrotasks and microtasks']
    });

    expect(analysis.analysisType).toBe('MINI');
    expect(analysis.evidenceWindow).toBe('sessions-1-to-3');
    expect(analysis.summary).toContain('hints used');
    expect(analysis.confidence).toBeGreaterThan(0);
    expect(analysis.recommendedActions[0].action).toBe('PRACTICE');
  });

  it('4. Initial Path Validation: Accepts valid DAG sequence', () => {
    const candidateConcepts = [
      { id: 'c1', name: 'JavaScript Basics', prerequisites: [] },
      { id: 'c2', name: 'Event Loop', prerequisites: [{ prerequisiteConceptId: 'c1' }] },
      { id: 'c3', name: 'Async / Await', prerequisites: [{ prerequisiteConceptId: 'c2' }] }
    ];
    const masteryMap = new Map();

    const isValid = RoadmapService._validateConceptSequence(
      ['c1', 'c2', 'c3'],
      candidateConcepts,
      masteryMap
    );

    expect(isValid).toBe(true);
  });

  it('5. Initial Path Validation: Rejects proposal with unknown concept IDs', () => {
    const candidateConcepts = [
      { id: 'c1', name: 'JavaScript Basics', prerequisites: [] },
      { id: 'c2', name: 'Event Loop', prerequisites: [] }
    ];
    const masteryMap = new Map();

    const isInvalid = RoadmapService._validateConceptSequence(
      ['c1', 'unknown-invented-concept-id'],
      candidateConcepts,
      masteryMap
    );

    expect(isInvalid).toBe(false);
  });

  it('6. Initial Path Validation: Rejects proposal with broken prerequisite order (dependent before prerequisite)', () => {
    const candidateConcepts = [
      { id: 'c1', name: 'Variables & Scope', prerequisites: [] },
      { id: 'c2', name: 'Closures & Lexical Scope', prerequisites: [{ prerequisiteConceptId: 'c1' }] }
    ];
    const masteryMap = new Map(); // c1 is not yet mastered (< 70)

    // c2 placed before its unmastered prerequisite c1!
    const isInvalidOrder = RoadmapService._validateConceptSequence(
      ['c2', 'c1'],
      candidateConcepts,
      masteryMap
    );

    expect(isInvalidOrder).toBe(false);
  });

  it('7. Timeout / Error Handling: Safely catches model errors and returns deterministic response', async () => {
    // Force isRealProviderConfigured to true and mock getClient to reject with timeout
    vi.spyOn(AiService, 'isRealProviderConfigured').mockReturnValue(true);
    vi.spyOn(AiService, 'getClient').mockReturnValue({
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error('GEMINI_TIMEOUT: Request timed out'))
      }
    });

    const tutorResult = await AiService.getTutorResponse({
      userQuestion: 'Explain Redis caching strategies',
      lessonContext: { conceptName: 'Redis Caching' }
    });

    expect(tutorResult).toBeDefined();
    expect(tutorResult.provider).toBe('mock');
    expect(tutorResult.reply).toContain('Redis Caching');
  });
});
