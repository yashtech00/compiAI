import { describe, it, expect } from 'vitest';
import { SimulationRunner } from '../src/modules/simulations/simulation.service.js';
import { ScenarioRegistry } from '../src/modules/simulations/scenario-registry.js';

describe('Phase 2, 4, 5 & 7: Simulation Engine & Problem-First Learning Lifecycle', () => {
  const testUserId = 'test_learner_sim_123';

  it('1. Retrieves sanitized diagnostic scenario without exposing solution or critical failure keys', () => {
    const scenario = SimulationRunner.getDiagnosticScenario('system-design');

    expect(scenario.scenarioId).toBe('diagnostic-system-design');
    expect(scenario.allowedActions.length).toBeGreaterThan(0);

    // Assert that answers are NOT leaked to the client
    for (const action of scenario.allowedActions) {
      expect(action.isCorrect).toBeUndefined();
      expect(action.criticalFailure).toBeUndefined();
    }
  });

  it('2. Evaluates diagnostic submission and returns evidence-backed baseline with starting module', async () => {
    const result = await SimulationRunner.submitDiagnostic(testUserId, 'system-design', {
      selectedActionIds: ['act-diag-db-index', 'act-fix-compound-index', 'act-verify-loadtest'],
      evidenceInspected: ['ev-metrics', 'ev-logs', 'ev-query-plan', 'ev-git-diff'],
      hintsUsed: 0
    });

    expect(result.overallScore).toBeGreaterThanOrEqual(80);
    expect(result.isMastered).toBe(true);
    expect(result.isCriticalFailure).toBe(false);
    expect(result.dimensionScores.diagnosis).toBe(100);
    expect(result.dimensionScores.investigation).toBe(100);
    expect(result.dimensionScores.implementation).toBe(100);
    expect(result.dimensionScores.verification).toBe(100);
    expect(result.demonstratedSkills.length).toBeGreaterThan(0);
    expect(result.personalizedPath.goalId).toBe('system-design');
  });

  it('3. Critical failure during diagnostic strictly caps score at 45 and blocks initial mastery', async () => {
    const result = await SimulationRunner.submitDiagnostic('critical_user_456', 'system-design', {
      selectedActionIds: ['act-diag-db-index', 'act-fix-disable-push'], // triggers DATA_LOSS_VULNERABILITY
      evidenceInspected: ['ev-metrics'],
      hintsUsed: 0
    });

    expect(result.overallScore).toBeLessThanOrEqual(45);
    expect(result.isMastered).toBe(false);
    expect(result.isCriticalFailure).toBe(true);
    expect(result.criticalFailureReasons.length).toBeGreaterThan(0);
  });

  it('4. Diagnostic submission is idempotent when idempotencyKey is supplied', async () => {
    const key = 'idemp_diag_submission_999';
    const sub1 = await SimulationRunner.submitDiagnostic(testUserId, 'backend-development', {
      selectedActionIds: ['act-diag-check-then-act', 'act-fix-atomic-idempotency', 'act-verify-concurrency-test'],
      evidenceInspected: ['ev-request-logs', 'ev-code-snippet', 'ev-db-locks'],
      idempotencyKey: key
    });

    const sub2 = await SimulationRunner.submitDiagnostic(testUserId, 'backend-development', {
      selectedActionIds: ['act-diag-client-retry'], // different payload on duplicate request
      evidenceInspected: [],
      idempotencyKey: key
    });

    // Should return cached sub1 without re-evaluating
    expect(sub2).toEqual(sub1);
    expect(sub2.isMastered).toBe(true);
  });

  it('5. Initializes evolving main problem and progresses through stages', () => {
    const mainProblem = SimulationRunner.startOrGetMainProblem(testUserId, 'system-design');

    expect(mainProblem.session.currentStageIndex).toBe(1);
    expect(mainProblem.session.totalStages).toBe(3);
    expect(mainProblem.currentStage.stageIndex).toBe(1);

    // Submit correct action for stage 1
    const stage1Result = SimulationRunner.submitMainProblemAction(testUserId, 'main-system-design-01', {
      stageIndex: 1,
      actionId: 'act-s1-distributed-reserve'
    });

    expect(stage1Result.isSuccess).toBe(true);
    expect(stage1Result.nextStageIndex).toBe(2);

    // Verify session advanced
    const updated = SimulationRunner.startOrGetMainProblem(testUserId, 'system-design');
    expect(updated.session.currentStageIndex).toBe(2);
  });

  it('6. Failure in main problem triggers recommended mini-simulation drill without losing progress', () => {
    // Stage 2: submit wrong action
    const failureResult = SimulationRunner.submitMainProblemAction(testUserId, 'main-system-design-01', {
      stageIndex: 2,
      actionId: 'act-s2-no-lock-read'
    });

    expect(failureResult.isSuccess).toBe(false);
    expect(failureResult.recommendedBranch).toBeDefined();
    expect(failureResult.recommendedBranch.scenarioId).toBe('mini-sd-db-indexing');

    // Main problem stage should NOT be lost or reset to 1
    const state = SimulationRunner.startOrGetMainProblem(testUserId, 'system-design');
    expect(state.session.currentStageIndex).toBe(2);
    expect(state.miniSimulationBranch).toBeDefined();
  });

  it('7. Completes mini-simulation drill and returns to main problem with state intact', () => {
    // Submit action in mini-drill
    const drillResult = SimulationRunner.submitMiniSimulationAction(testUserId, 'mini-sd-db-indexing', {
      actionId: 'act-mini-idx-optimal-compound'
    });

    expect(drillResult.isSuccess).toBe(true);
    expect(drillResult.canReturnToMainProblem).toBe(true);

    // Return to main problem
    const returnResult = SimulationRunner.returnToMainProblem(testUserId);
    expect(returnResult.returnedToScenarioId).toBe('main-system-design-01');
    expect(returnResult.resumedStageIndex).toBe(2);

    // Main problem state is active at stage 2
    const resumedState = SimulationRunner.startOrGetMainProblem(testUserId, 'system-design');
    expect(resumedState.session.currentStageIndex).toBe(2);
    expect(resumedState.miniSimulationBranch).toBeNull();
  });

  it('8. Final capstone assessment marks goal complete only upon passing with no critical failures', () => {
    // Failing attempt: choose silent data loss option in stage 2
    const failAttempt = SimulationRunner.submitFinalAssessment(testUserId, 'system-design', {
      answers: [
        { stageIndex: 1, optionId: 'opt-websocket-cluster' },
        { stageIndex: 2, optionId: 'opt-last-write-wins' }, // Critical failure!
        { stageIndex: 3, optionId: 'opt-snapshot-compaction' }
      ]
    });

    expect(failAttempt.isGoalCompleted).toBe(false);
    expect(failAttempt.isCriticalFailure).toBe(true);
    expect(failAttempt.criticalFailureReasons).toContain('LWW clobbers concurrent edits silently due to client clock skew, corrupting document history.');

    // Passing attempt
    const passAttempt = SimulationRunner.submitFinalAssessment(testUserId, 'system-design', {
      answers: [
        { stageIndex: 1, optionId: 'opt-websocket-cluster' },
        { stageIndex: 2, optionId: 'opt-crdt-ot' },
        { stageIndex: 3, optionId: 'opt-snapshot-compaction' }
      ]
    });

    expect(passAttempt.isGoalCompleted).toBe(true);
    expect(passAttempt.scorePercentage).toBeGreaterThanOrEqual(85);
    expect(passAttempt.isCriticalFailure).toBe(false);
  });
});
