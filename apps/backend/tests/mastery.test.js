import { describe, it, expect } from 'vitest';
import { MasteryEngine, PROGRESSION_RULES, MASTERY_THRESHOLDS } from '../src/modules/learner-model/mastery-engine.js';

describe('Evidence-Driven MasteryEngine', () => {
  it('1. Single independent pass should NOT jump directly to Mastered (>= 75%)', () => {
    const outcome = MasteryEngine.evaluateAssessmentOutcome({
      currentMastery: 0,
      currentConfidence: 20,
      quizScore: 100,
      hintsUsed: 0,
      priorAttempts: 0,
      priorIndependentSuccesses: 0
    });

    expect(outcome.isPassed).toBe(true);
    expect(outcome.isIndependent).toBe(true);
    // Ceiling for 1st unassisted success is 45%
    expect(outcome.newMastery).toBeLessThanOrEqual(45);
    expect(outcome.newMastery).toBeGreaterThan(0);
    expect(outcome.newConfidence).toBeGreaterThan(20);
    expect(outcome.actionType).toBe('ADVANCE');
  });

  it('2. Hint-assisted pass is discounted compared to unassisted pass and capped at Competent (<= 60%)', () => {
    const independentOutcome = MasteryEngine.evaluateAssessmentOutcome({
      currentMastery: 30,
      currentConfidence: 30,
      quizScore: 85,
      hintsUsed: 0,
      priorAttempts: 1,
      priorIndependentSuccesses: 1
    });

    const assistedOutcome = MasteryEngine.evaluateAssessmentOutcome({
      currentMastery: 30,
      currentConfidence: 30,
      quizScore: 85,
      hintsUsed: 3, // Hint assisted!
      priorAttempts: 1,
      priorIndependentSuccesses: 1
    });

    expect(independentOutcome.isPassed).toBe(true);
    expect(assistedOutcome.isPassed).toBe(true);
    // Independent delta should be strictly greater than assisted delta
    expect(independentOutcome.masteryDelta).toBeGreaterThan(assistedOutcome.masteryDelta);
    expect(assistedOutcome.newMastery).toBeLessThanOrEqual(60);
    expect(assistedOutcome.isAssistedSuccess).toBe(true);
  });

  it('3. Failure decrements moderately but DOES NOT erase demonstrated history', () => {
    const failureOutcome = MasteryEngine.evaluateAssessmentOutcome({
      currentMastery: 65,
      currentConfidence: 70,
      quizScore: 40, // Failed
      hintsUsed: 0,
      priorAttempts: 3,
      priorIndependentSuccesses: 2
    });

    expect(failureOutcome.isPassed).toBe(false);
    expect(failureOutcome.actionType).toBe('REINFORCE');
    expect(failureOutcome.newMastery).toBe(55); // 65 - 10 = 55, not 0!
    expect(failureOutcome.newMastery).toBeGreaterThan(0);
    expect(failureOutcome.nextReviewDays).toBe(1); // Scheduled for rapid review tomorrow
  });

  it('4. Delayed recall with high rating (4-5) reinforces retention', () => {
    const recallHigh = MasteryEngine.evaluateRecallOutcome({
      currentMastery: 60,
      currentConfidence: 50,
      rating: 5,
      recalled: true
    });

    expect(recallHigh.delta).toBe(PROGRESSION_RULES.RECALL_HIGH_DELTA);
    expect(recallHigh.newMastery).toBe(66);
    expect(recallHigh.newConfidence).toBeGreaterThan(50);
  });

  it('5. Delayed recall failure penalizes retention and confidence', () => {
    const recallLow = MasteryEngine.evaluateRecallOutcome({
      currentMastery: 60,
      currentConfidence: 70,
      rating: 1,
      recalled: false
    });

    expect(recallLow.delta).toBe(-PROGRESSION_RULES.RECALL_LOW_DELTA);
    expect(recallLow.newMastery).toBe(54);
    expect(recallLow.newConfidence).toBeLessThan(70);
  });

  it('6. Explain-back synthesis smoothly blends understanding with misconception penalty', () => {
    const cleanSynthesis = MasteryEngine.evaluateExplainBackOutcome({
      currentMastery: 50,
      currentConfidence: 50,
      overallScore: 90,
      misconceptions: []
    });

    const synthesisWithMisconceptions = MasteryEngine.evaluateExplainBackOutcome({
      currentMastery: 50,
      currentConfidence: 50,
      overallScore: 90,
      misconceptions: ['Confused microtask with macrotask', 'Assumed setTimeout runs immediately']
    });

    expect(cleanSynthesis.newMastery).toBeGreaterThan(50);
    expect(cleanSynthesis.newMastery).toBeGreaterThan(synthesisWithMisconceptions.newMastery);
  });

  it('7. Boundary conditions: scores remain strictly clamped to [0, 100]', () => {
    const maxBoundary = MasteryEngine.evaluateAssessmentOutcome({
      currentMastery: 98,
      currentConfidence: 95,
      quizScore: 100,
      hintsUsed: 0,
      priorAttempts: 5,
      priorIndependentSuccesses: 4
    });
    expect(maxBoundary.newMastery).toBeLessThanOrEqual(100);
    expect(maxBoundary.newConfidence).toBeLessThanOrEqual(100);

    const minBoundary = MasteryEngine.evaluateAssessmentOutcome({
      currentMastery: 5,
      currentConfidence: 10,
      quizScore: 20,
      hintsUsed: 0,
      priorAttempts: 1
    });
    expect(minBoundary.newMastery).toBeGreaterThanOrEqual(0);
    expect(minBoundary.newConfidence).toBeGreaterThanOrEqual(10);
  });
});
