/**
 * Evidence-Driven Mastery Engine
 * 
 * Computes deterministic, bounded, and explainable mastery updates
 * based on verified learner evidence (independent correctness, hint usage,
 * attempts history, delayed recall, and misconceptions).
 */

export const MASTERY_THRESHOLDS = {
  UNASSESSED: 0,
  DEVELOPING: 40,
  COMPETENT: 60,
  MASTERED: 75,
  EXEMPLARY: 90
};

export const PROGRESSION_RULES = {
  QUIZ_PASS_SCORE: 70,           // Score percentage needed to pass a quiz
  PREREQ_READINESS_SCORE: 60,    // Mastery needed in prerequisite to unlock dependent concept
  INDEPENDENT_PASS_DELTA: 20,    // Mastery gain on independent pass (no hints)
  ASSISTED_PASS_DELTA: 10,       // Mastery gain on hint-assisted pass (discounted)
  FAIL_DECREMENT_DELTA: 10,      // Graceful penalty on failure (does not zero out history)
  RECALL_HIGH_DELTA: 6,          // Spaced recall rating 4-5 reinforcement
  RECALL_LOW_DELTA: 6,           // Spaced recall rating 1-2 penalty
  CONFIDENCE_PER_ATTEMPT: 15,    // Base confidence increment per attempt
  CONFIDENCE_INDEPENDENT_BONUS: 20 // Additional confidence for unassisted attempts
};

export class MasteryEngine {
  /**
   * Computes the new mastery and confidence scores after an assessment or quiz attempt.
   */
  static evaluateAssessmentOutcome({
    currentMastery = 0,
    currentConfidence = 50,
    quizScore = 0,
    scorePercentage = undefined,
    hintsUsed = 0,
    priorAttempts = 0,
    priorIndependentSuccesses = 0,
    priorAssistedSuccesses = 0,
    independentSuccesses = 0,
    assistedSuccesses = 0
  }) {
    const effectiveScore = typeof scorePercentage === 'number' ? scorePercentage : (Number(quizScore) || 0);
    const effectiveIndependent = priorIndependentSuccesses || independentSuccesses || 0;
    const isPassed = effectiveScore >= PROGRESSION_RULES.QUIZ_PASS_SCORE;
    const isIndependent = hintsUsed === 0;
    const safeCurrent = Math.max(0, Math.min(100, Number(currentMastery) || 0));

    let delta = 0;
    let rationale = '';

    if (isPassed) {
      if (isIndependent) {
        // Full evidence gain for independent success
        delta = PROGRESSION_RULES.INDEPENDENT_PASS_DELTA;
        
        // Single attempt cannot jump straight to full mastery (>= 75) without multiple evidence sessions
        const totalSuccesses = effectiveIndependent + 1;
        const ceiling = totalSuccesses >= 3 ? 100 : totalSuccesses === 2 ? 70 : 45;
        
        const target = safeCurrent + delta;
        const newMastery = Math.min(ceiling, Math.max(safeCurrent, target));
        delta = newMastery - safeCurrent;
        
        rationale = `Passed independently (${effectiveScore}%). Strong unassisted demonstration adds +${delta.toFixed(1)}% mastery.`;
      } else {
        // Discounted evidence gain for hint-assisted success
        delta = PROGRESSION_RULES.ASSISTED_PASS_DELTA;
        
        // Assisted success is capped at 60 (Competent), cannot unlock Mastered (>= 75) alone
        const ceiling = 60;
        const target = safeCurrent + delta;
        const newMastery = Math.min(ceiling, Math.max(safeCurrent, target));
        delta = newMastery - safeCurrent;
        
        rationale = `Passed with hint assistance (${hintsUsed} hint${hintsUsed > 1 ? 's' : ''}). Partial evidence adds +${delta.toFixed(1)}% mastery.`;
      }
    } else {
      // Failed attempt: Decrement moderately to reflect need for practice, but preserve demonstrated foundation
      delta = -PROGRESSION_RULES.FAIL_DECREMENT_DELTA;
      rationale = `Score below threshold (${effectiveScore}%). Needs targeted reinforcement; adjusted by ${delta}%.`;
    }

    const calculatedMastery = Math.max(0, Math.min(100, Math.round((safeCurrent + delta) * 10) / 10));

    // Calculate evidence-backed confidence score [0-100]
    const newTotalAttempts = priorAttempts + 1;
    const newIndependentSuccesses = isPassed && isIndependent ? effectiveIndependent + 1 : effectiveIndependent;
    
    const confidenceEvidence = (newTotalAttempts * PROGRESSION_RULES.CONFIDENCE_PER_ATTEMPT) +
                               (newIndependentSuccesses * PROGRESSION_RULES.CONFIDENCE_INDEPENDENT_BONUS);
    
    // Penalize confidence if there is recent failure
    const confidencePenalty = !isPassed ? 15 : 0;
    const calculatedConfidence = Math.max(10, Math.min(100, Math.round(confidenceEvidence - confidencePenalty)));

    // Scheduling intervals
    const nextReviewDays = isPassed ? (isIndependent ? 3 : 2) : 1;
    const predictedRecall = isPassed ? (isIndependent ? 0.9 : 0.8) : 0.6;
    const actionType = isPassed ? 'ADVANCE' : 'REINFORCE';

    return {
      newMastery: calculatedMastery,
      newConfidence: calculatedConfidence,
      masteryDelta: Math.round(delta * 10) / 10,
      delta: Math.round(delta * 10) / 10,
      isPassed,
      isIndependent,
      isIndependentSuccess: isPassed && isIndependent,
      isAssistedSuccess: isPassed && !isIndependent,
      isIndependentFailure: !isPassed && isIndependent,
      isAssistedFailure: !isPassed && !isIndependent,
      actionType,
      nextReviewDays,
      predictedRecall,
      rationale,
      reason: rationale
    };
  }

  /**
   * Computes mastery update from a spaced retention recall attempt
   */
  static evaluateRecallOutcome({
    currentMastery = 0,
    currentConfidence = 50,
    rating = 3,
    recalled = true
  }) {
    const safeCurrent = Math.max(0, Math.min(100, Number(currentMastery) || 0));
    let delta = 0;
    let rationale = '';

    if (recalled && rating >= 4) {
      delta = PROGRESSION_RULES.RECALL_HIGH_DELTA;
      rationale = `Delayed active retrieval succeeded (rating ${rating}/5). Long-term retention reinforced (+${delta}%).`;
    } else if (recalled && rating === 3) {
      delta = 2;
      rationale = `Delayed active retrieval succeeded with moderate effort (+${delta}%).`;
    } else {
      delta = -PROGRESSION_RULES.RECALL_LOW_DELTA;
      rationale = `Retrieval struggle or forgotten memory (rating ${rating}/5). Rescheduled for early review (${delta}%).`;
    }

    const calculatedMastery = Math.max(0, Math.min(100, Math.round((safeCurrent + delta) * 10) / 10));
    const calculatedConfidence = recalled
      ? Math.min(100, (currentConfidence || 50) + 10)
      : Math.max(20, (currentConfidence || 50) - 15);

    return {
      newMastery: calculatedMastery,
      newConfidence: Math.round(calculatedConfidence),
      masteryDelta: delta,
      delta,
      rationale,
      reason: rationale
    };
  }

  /**
   * Evaluates explain-back synthesis evaluation score into learner mastery
   */
  static evaluateExplainBackOutcome({
    currentMastery = 50,
    currentConfidence = 50,
    overallScore = undefined,
    rubricScores = undefined,
    misconceptions = []
  }) {
    const rawScore = overallScore !== undefined
      ? overallScore
      : (rubricScores?.overall || 70);

    const safeCurrent = Math.max(0, Math.min(100, Number(currentMastery) || 0));
    const safeScore = Math.max(0, Math.min(100, Number(rawScore) || 0));
    
    // Smooth weighted blend: 70% current demonstrated mastery + 30% synthesis evidence
    const blended = Math.round((safeCurrent * 0.7) + (safeScore * 0.3));
    const confidenceBoost = safeScore >= 75 ? 10 : 0;
    const penalty = (misconceptions || []).length * 3;

    const finalMastery = Math.min(100, Math.max(0, blended - penalty));

    return {
      newMastery: finalMastery,
      newConfidence: Math.min(100, Math.max(10, (currentConfidence || 50) + confidenceBoost - penalty)),
      masteryDelta: finalMastery - safeCurrent,
      rationale: `Explain-back synthesis scored ${safeScore}%. Demonstrated conceptual understanding blended into mastery.`,
      reason: `Explain-back synthesis scored ${safeScore}%.`
    };
  }

  /**
   * Evaluates multi-dimensional simulation evidence across 4 dimensions:
   * Diagnosis (30%), Investigation (25%), Implementation (25%), Verification (20%).
   * 
   * Enforces critical-failure overrides, prerequisite satisfaction, and hint ceilings.
   */
  static evaluateMultiDimensionalOutcome({
    currentMastery = 0,
    dimensions = {},
    weights = {
      diagnosis: 0.30,
      investigation: 0.25,
      implementation: 0.25,
      verification: 0.20
    },
    criticalFailures = [],
    hintsUsed = 0,
    prerequisitesSatisfied = true,
    isTransferAssessment = false,
    threshold = 80
  }) {
    const safeCurrent = Math.max(0, Math.min(100, Number(currentMastery) || 0));

    // 1. Validate Dimension Scores
    const dimensionKeys = ['diagnosis', 'investigation', 'implementation', 'verification'];
    const validatedDimensions = {};
    const missingDimensions = [];

    for (const key of dimensionKeys) {
      const val = dimensions[key];
      if (val === undefined || val === null) {
        missingDimensions.push(key);
      } else {
        const num = Number(val);
        if (isNaN(num) || num < 0 || num > 100) {
          throw new Error(`Invalid dimension score for '${key}': must be a number between 0 and 100`);
        }
        validatedDimensions[key] = Math.round(num * 10) / 10;
      }
    }

    if (missingDimensions.length === dimensionKeys.length) {
      throw new Error('Multi-dimensional evaluation requires at least one evaluated dimension');
    }

    // 2. Normalize weights over available dimensions
    let totalWeight = 0;
    for (const key of dimensionKeys) {
      if (validatedDimensions[key] !== undefined) {
        totalWeight += (weights[key] || 0);
      }
    }

    if (totalWeight <= 0) totalWeight = 1;

    let aggregateScore = 0;
    for (const key of dimensionKeys) {
      if (validatedDimensions[key] !== undefined) {
        const normalizedWeight = (weights[key] || 0) / totalWeight;
        aggregateScore += validatedDimensions[key] * normalizedWeight;
      }
    }
    aggregateScore = Math.round(aggregateScore * 10) / 10;

    // 3. Evaluate Critical Failures
    const isCriticalFailure = Array.isArray(criticalFailures) && criticalFailures.length > 0;
    const criticalFailureReasons = isCriticalFailure 
      ? criticalFailures.map(cf => typeof cf === 'string' ? cf : (cf.reason || cf.code || 'Unspecified critical failure'))
      : [];

    let finalScore = aggregateScore;
    let isMastered = false;
    let actionType = 'CONTINUE';
    let rationale = '';

    if (isCriticalFailure) {
      // Critical failure strictly overrides high aggregate score
      finalScore = Math.min(45, aggregateScore);
      isMastered = false;
      actionType = 'REMEDIATE';
      rationale = `Critical failure detected: ${criticalFailureReasons.join('; ')}. Mastery blocked regardless of aggregate score (${aggregateScore}% -> capped at ${finalScore}%).`;
    } else if (!prerequisitesSatisfied) {
      isMastered = false;
      actionType = 'PREREQUISITE';
      rationale = `Prerequisite skills not satisfied. Dependent skill mastery is gated.`;
    } else if (hintsUsed > 2) {
      finalScore = Math.min(60, aggregateScore);
      isMastered = false;
      actionType = 'REINFORCE';
      rationale = `Excessive hint dependence (${hintsUsed} hints). Unassisted demonstration required for mastery.`;
    } else if (validatedDimensions.verification !== undefined && validatedDimensions.verification < 50) {
      isMastered = false;
      actionType = 'REINFORCE';
      rationale = `Verification score (${validatedDimensions.verification}%) below minimum required 50%. Solution has unverified edge cases.`;
    } else if (aggregateScore >= threshold) {
      isMastered = true;
      actionType = 'ADVANCE';
      rationale = `Demonstrated solid multi-dimensional competence (${aggregateScore}% >= ${threshold}%).`;
    } else {
      isMastered = false;
      actionType = aggregateScore < 60 ? 'REMEDIATE' : 'REINFORCE';
      rationale = `Score of ${aggregateScore}% is below mastery threshold of ${threshold}%. Targeted practice recommended.`;
    }

    const calculatedMastery = Math.max(0, Math.min(100, Math.round(finalScore * 10) / 10));
    const delta = Math.round((calculatedMastery - safeCurrent) * 10) / 10;

    return {
      overallScore: calculatedMastery,
      rawAggregateScore: aggregateScore,
      dimensionScores: validatedDimensions,
      missingDimensions,
      isMastered,
      isCriticalFailure,
      criticalFailureReasons,
      prerequisitesSatisfied,
      isTransferAssessment,
      masteryDelta: delta,
      actionType,
      rationale
    };
  }
}

