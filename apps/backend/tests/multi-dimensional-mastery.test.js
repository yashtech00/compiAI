import { describe, it, expect } from 'vitest';
import { MasteryEngine } from '../src/modules/learner-model/mastery-engine.js';

describe('Phase 3: Multi-Dimensional Mastery Evaluation (4D & Critical Failures)', () => {
  it('1. Computes weighted score across 4 dimensions according to target weights', () => {
    // Diagnosis 30%, Investigation 25%, Implementation 25%, Verification 20%
    // 0.3*90 + 0.25*80 + 0.25*80 + 0.20*100 = 27 + 20 + 20 + 20 = 87
    const result = MasteryEngine.evaluateMultiDimensionalOutcome({
      currentMastery: 50,
      dimensions: {
        diagnosis: 90,
        investigation: 80,
        implementation: 80,
        verification: 100
      },
      threshold: 80
    });

    expect(result.overallScore).toBe(87);
    expect(result.isMastered).toBe(true);
    expect(result.actionType).toBe('ADVANCE');
    expect(result.isCriticalFailure).toBe(false);
    expect(result.masteryDelta).toBe(37); // 87 - 50
  });

  it('2. Critical failure strictly overrides high aggregate score (e.g. 95% -> capped at 45%)', () => {
    const result = MasteryEngine.evaluateMultiDimensionalOutcome({
      currentMastery: 40,
      dimensions: {
        diagnosis: 100,
        investigation: 100,
        implementation: 90,
        verification: 90
      },
      criticalFailures: [
        { code: 'DATA_LOSS_VULNERABILITY', reason: 'Unbounded delete query executed without tenant filter' }
      ],
      threshold: 80
    });

    expect(result.rawAggregateScore).toBe(95.5);
    expect(result.overallScore).toBe(45); // Capped at 45
    expect(result.isMastered).toBe(false);
    expect(result.isCriticalFailure).toBe(true);
    expect(result.actionType).toBe('REMEDIATE');
    expect(result.criticalFailureReasons).toContain('Unbounded delete query executed without tenant filter');
  });

  it('3. Excessive hint usage (>2 hints) caps score at 60 and prevents mastery', () => {
    const result = MasteryEngine.evaluateMultiDimensionalOutcome({
      currentMastery: 50,
      dimensions: {
        diagnosis: 90,
        investigation: 90,
        implementation: 90,
        verification: 90
      },
      hintsUsed: 3,
      threshold: 80
    });

    expect(result.rawAggregateScore).toBe(90);
    expect(result.overallScore).toBe(60); // Capped at 60
    expect(result.isMastered).toBe(false);
    expect(result.actionType).toBe('REINFORCE');
  });

  it('4. Low verification score (< 50%) blocks mastery even if other scores are high', () => {
    const result = MasteryEngine.evaluateMultiDimensionalOutcome({
      currentMastery: 50,
      dimensions: {
        diagnosis: 100,
        investigation: 100,
        implementation: 100,
        verification: 40
      },
      threshold: 80
    });

    expect(result.isMastered).toBe(false);
    expect(result.actionType).toBe('REINFORCE');
    expect(result.rationale).toContain('Verification score (40%) below minimum required 50%');
  });

  it('5. Unmet prerequisites block progression into dependent skill', () => {
    const result = MasteryEngine.evaluateMultiDimensionalOutcome({
      currentMastery: 0,
      dimensions: {
        diagnosis: 90,
        investigation: 90,
        implementation: 90,
        verification: 90
      },
      prerequisitesSatisfied: false,
      threshold: 80
    });

    expect(result.isMastered).toBe(false);
    expect(result.actionType).toBe('PREREQUISITE');
  });

  it('6. Correctly normalizes weights when non-critical dimensions are missing', () => {
    // Only diagnosis (0.3) and investigation (0.25) evaluated: totalWeight = 0.55
    // diag: 80 * (0.3 / 0.55) = 43.636
    // inv:  90 * (0.25 / 0.55) = 40.909
    // sum: ~84.5
    const result = MasteryEngine.evaluateMultiDimensionalOutcome({
      currentMastery: 50,
      dimensions: {
        diagnosis: 80,
        investigation: 90
      },
      threshold: 80
    });

    expect(result.rawAggregateScore).toBe(84.5);
    expect(result.missingDimensions).toContain('implementation');
    expect(result.missingDimensions).toContain('verification');
  });

  it('7. Throws descriptive error if dimensions are completely missing or out of bounds', () => {
    expect(() => {
      MasteryEngine.evaluateMultiDimensionalOutcome({
        dimensions: {}
      });
    }).toThrow('Multi-dimensional evaluation requires at least one evaluated dimension');

    expect(() => {
      MasteryEngine.evaluateMultiDimensionalOutcome({
        dimensions: { diagnosis: 150 }
      });
    }).toThrow("Invalid dimension score for 'diagnosis'");
  });

  it('8. Backward compatibility: existing evaluateAssessmentOutcome continues to work as expected', () => {
    const legacyResult = MasteryEngine.evaluateAssessmentOutcome({
      currentMastery: 40,
      quizScore: 85,
      hintsUsed: 0,
      priorAttempts: 1,
      priorIndependentSuccesses: 1
    });

    expect(legacyResult.isPassed).toBe(true);
    expect(legacyResult.isIndependent).toBe(true);
    expect(legacyResult.newMastery).toBeGreaterThan(40);
  });
});
