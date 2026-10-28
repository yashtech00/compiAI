/**
 * Simulation Service
 * Core orchestrator for interactive problem-first learning, diagnostics,
 * mini-simulation branching, and capstone final assessments.
 */

import { ScenarioRegistry } from './scenario-registry.js';
import { MasteryEngine } from '../learner-model/mastery-engine.js';
import { MasterPathRegistry } from '../../curriculum/master-paths/master-path.registry.js';
import { logger } from '../../utils/logger.js';

class SimulationRunnerService {
  constructor() {
    // In-memory session store (backed by active DB session where applicable)
    // Map: userId -> { activeMainProblem, miniSimulationBranch, diagnosticAttempts: [] }
    this.sessions = new Map();
    this.submissionCache = new Map(); // Idempotency cache: key -> result
  }

  getUserSession(userId) {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, {
        userId,
        diagnosticResults: {},
        activeMainProblem: null,
        miniSimulationBranch: null,
        finalAssessmentResults: {}
      });
    }
    return this.sessions.get(userId);
  }

  /**
   * Diagnostic Scenario Retrieval
   */
  getDiagnosticScenario(goalId) {
    const scenario = ScenarioRegistry.getDiagnosticByGoal(goalId);
    if (!scenario) {
      throw new Error(`No diagnostic scenario available for goal: '${goalId}'`);
    }
    return ScenarioRegistry.sanitizeForLearner(scenario);
  }

  /**
   * Submits a diagnostic simulation attempt and computes initial skill baseline.
   */
  async submitDiagnostic(userId, goalId, { selectedActionIds = [], evidenceInspected = [], explanation = '', hintsUsed = 0, idempotencyKey }) {
    if (idempotencyKey && this.submissionCache.has(idempotencyKey)) {
      return this.submissionCache.get(idempotencyKey);
    }

    const scenario = ScenarioRegistry.getDiagnosticByGoal(goalId);
    if (!scenario) {
      throw new Error(`Diagnostic scenario not found for goal: '${goalId}'`);
    }

    const userActions = new Set(selectedActionIds);
    const criticalFailures = [];

    let diagCorrect = false;
    let fixCorrect = false;
    let verifyCorrect = false;

    for (const action of scenario.allowedActions) {
      if (userActions.has(action.id)) {
        if (action.criticalFailure) {
          criticalFailures.push(action.criticalFailure);
        }
        if (action.category === 'DIAGNOSIS' && action.isCorrect) {
          diagCorrect = true;
        }
        if (action.category === 'IMPLEMENTATION' && action.isCorrect) {
          fixCorrect = true;
        }
        if (action.category === 'VERIFICATION' && action.isCorrect) {
          verifyCorrect = true;
        }
      }
    }

    // Dimension scoring based on empirical evidence
    const diagnosisScore = diagCorrect ? 100 : 20;
    
    // Investigation: evidence inspected depth
    const evidenceCount = Array.isArray(evidenceInspected) ? evidenceInspected.length : 0;
    const totalAvailableEvidence = (scenario.availableEvidence || []).length || 4;
    const investigationScore = Math.min(100, Math.round((evidenceCount / totalAvailableEvidence) * 100));

    const implementationScore = fixCorrect ? 100 : 0;
    const verificationScore = verifyCorrect ? 100 : 0;

    const evaluation = MasteryEngine.evaluateMultiDimensionalOutcome({
      currentMastery: 0,
      dimensions: {
        diagnosis: diagnosisScore,
        investigation: investigationScore,
        implementation: implementationScore,
        verification: verificationScore
      },
      criticalFailures,
      hintsUsed,
      threshold: 80
    });

    // Identify demonstrated skills eligible for diagnostic skip/acceleration
    const demonstratedSkills = [];
    if (evaluation.isMastered && !evaluation.isCriticalFailure) {
      demonstratedSkills.push(...scenario.relevantSkills.slice(0, 2));
    }

    // Instantiate personalized Master Path referencing canonical curriculum
    const personalizedPath = MasterPathRegistry.instantiatePersonalizedPath(goalId, {
      diagnosticExemptSkills: demonstratedSkills
    });

    const result = {
      scenarioId: scenario.scenarioId,
      goalId,
      overallScore: evaluation.overallScore,
      dimensionScores: evaluation.dimensionScores,
      isMastered: evaluation.isMastered,
      isCriticalFailure: evaluation.isCriticalFailure,
      criticalFailureReasons: evaluation.criticalFailureReasons,
      rationale: evaluation.rationale,
      demonstratedSkills,
      recommendedStartingModuleId: personalizedPath.milestones.find(m => m.status === 'ACTIVE')?.masterModuleId || 'sd-mod-1',
      personalizedPath,
      completedAt: new Date().toISOString()
    };

    const session = this.getUserSession(userId);
    session.diagnosticResults[goalId] = result;

    if (idempotencyKey) {
      this.submissionCache.set(idempotencyKey, result);
    }

    return result;
  }

  /**
   * Main Problem: Initializes or retrieves the evolving problem for a goal.
   */
  startOrGetMainProblem(userId, goalId) {
    const session = this.getUserSession(userId);
    const scenario = ScenarioRegistry.getMainProblem(goalId);
    if (!scenario) {
      throw new Error(`No main problem registered for goal '${goalId}'`);
    }

    if (!session.activeMainProblem || session.activeMainProblem.scenarioId !== scenario.scenarioId) {
      session.activeMainProblem = {
        scenarioId: scenario.scenarioId,
        goalId: scenario.goalId,
        title: scenario.title,
        currentStageIndex: 1,
        totalStages: scenario.stages.length,
        history: [],
        status: 'IN_PROGRESS',
        updatedAt: new Date().toISOString()
      };
    }

    const currentStage = scenario.stages.find(s => s.stageIndex === session.activeMainProblem.currentStageIndex);
    const sanitizedScenario = ScenarioRegistry.sanitizeForLearner(scenario);
    const sanitizedCurrentStage = sanitizedScenario.stages.find(s => s.stageIndex === session.activeMainProblem.currentStageIndex);

    return {
      session: { ...session.activeMainProblem },
      scenario: {
        scenarioId: sanitizedScenario.scenarioId,
        title: sanitizedScenario.title,
        description: sanitizedScenario.description,
        totalStages: sanitizedScenario.stages.length
      },
      currentStage: sanitizedCurrentStage,
      miniSimulationBranch: session.miniSimulationBranch ? ScenarioRegistry.sanitizeForLearner(ScenarioRegistry.getMiniSimulation(session.miniSimulationBranch.scenarioId)) : null
    };
  }

  /**
   * Submits an action for the active main problem stage.
   */
  submitMainProblemAction(userId, scenarioId, { stageIndex, actionId, explanation = '', hintsUsed = 0 }) {
    const session = this.getUserSession(userId);
    if (!session.activeMainProblem || session.activeMainProblem.scenarioId !== scenarioId) {
      throw new Error('No active main problem matching this scenario for the learner');
    }

    const scenario = ScenarioRegistry.getMainProblem(scenarioId);
    const stage = scenario.stages.find(s => s.stageIndex === stageIndex);
    if (!stage) {
      throw new Error(`Invalid stage index: ${stageIndex}`);
    }

    const selectedAction = stage.allowedActions.find(a => a.id === actionId);
    if (!selectedAction) {
      throw new Error(`Action '${actionId}' is not permitted in stage ${stageIndex}`);
    }

    const criticalFailures = selectedAction.criticalFailure ? [selectedAction.criticalFailure] : [];
    const isSuccess = selectedAction.isCorrect && criticalFailures.length === 0;

    const evaluation = MasteryEngine.evaluateMultiDimensionalOutcome({
      currentMastery: 50,
      dimensions: {
        diagnosis: isSuccess ? 90 : 30,
        investigation: 85,
        implementation: isSuccess ? 95 : 20,
        verification: isSuccess ? 90 : 0
      },
      criticalFailures,
      hintsUsed,
      threshold: 80
    });

    session.activeMainProblem.history.push({
      stageIndex,
      actionId,
      isSuccess,
      isCriticalFailure: evaluation.isCriticalFailure,
      criticalFailureReasons: evaluation.criticalFailureReasons,
      timestamp: new Date().toISOString()
    });

    let recommendedBranch = null;

    if (!isSuccess) {
      // Check if a focused mini-simulation drill exists for targeted remediation
      const targetSkill = scenario.relevantSkills[Math.min(stageIndex - 1, scenario.relevantSkills.length - 1)];
      const miniScenario = ScenarioRegistry.getMiniSimulation(targetSkill);

      if (miniScenario) {
        session.miniSimulationBranch = {
          scenarioId: miniScenario.scenarioId,
          targetedSkillId: miniScenario.targetedSkillId,
          resumedStageIndex: stageIndex,
          activatedAt: new Date().toISOString()
        };
        recommendedBranch = ScenarioRegistry.sanitizeForLearner(miniScenario);
      }
    } else {
      // Advance to next stage or complete
      if (session.activeMainProblem.currentStageIndex < scenario.stages.length) {
        session.activeMainProblem.currentStageIndex += 1;
      } else {
        session.activeMainProblem.status = 'COMPLETED';
      }
    }

    session.activeMainProblem.updatedAt = new Date().toISOString();

    return {
      isSuccess,
      evaluation,
      stageIndex,
      nextStageIndex: session.activeMainProblem.currentStageIndex,
      isProblemCompleted: session.activeMainProblem.status === 'COMPLETED',
      recommendedBranch,
      feedback: isSuccess 
        ? `Stage ${stageIndex} passed! Verified: ${stage.verificationCheck}`
        : evaluation.rationale
    };
  }

  /**
   * Submits action for an active mini-simulation drill.
   */
  submitMiniSimulationAction(userId, scenarioId, { actionId }) {
    const session = this.getUserSession(userId);
    const mini = ScenarioRegistry.getMiniSimulation(scenarioId);
    if (!mini) {
      throw new Error(`Mini-simulation '${scenarioId}' not found`);
    }

    const action = mini.allowedActions.find(a => a.id === actionId);
    if (!action) {
      throw new Error(`Action '${actionId}' is invalid for mini-simulation`);
    }

    const isSuccess = action.isCorrect;
    const evaluation = MasteryEngine.evaluateMultiDimensionalOutcome({
      currentMastery: 50,
      dimensions: {
        diagnosis: 90,
        investigation: 80,
        implementation: isSuccess ? 100 : 30,
        verification: isSuccess ? 100 : 0
      },
      threshold: 80
    });

    return {
      isSuccess,
      evaluation,
      targetedSkillId: mini.targetedSkillId,
      feedback: isSuccess 
        ? `Drill completed successfully! ${mini.verificationCheck}`
        : 'Action did not achieve the required performance profile. Try alternative heuristic.',
      canReturnToMainProblem: true
    };
  }

  /**
   * Returns from a completed mini-simulation branch to the main problem,
   * cleanly restoring the learner's previous main-problem state.
   */
  returnToMainProblem(userId) {
    const session = this.getUserSession(userId);
    if (!session.activeMainProblem) {
      throw new Error('No active main problem to return to');
    }

    const branch = session.miniSimulationBranch;
    session.miniSimulationBranch = null; // Clear branch

    return {
      returnedToScenarioId: session.activeMainProblem.scenarioId,
      resumedStageIndex: session.activeMainProblem.currentStageIndex,
      clearedBranchScenarioId: branch ? branch.scenarioId : null,
      message: 'Successfully resumed main problem with state fully preserved.'
    };
  }

  /**
   * Submits a final capstone assessment for goal completion.
   */
  submitFinalAssessment(userId, goalId, { answers = [] }) {
    const assessment = ScenarioRegistry.getFinalAssessment(goalId);
    if (!assessment) {
      throw new Error(`No final assessment registered for goal '${goalId}'`);
    }

    const criticalFailures = [];
    let correctCount = 0;
    const answerMap = new Map(answers.map(a => [a.stageIndex, a.optionId]));

    assessment.stages.forEach(stage => {
      const selectedOptionId = answerMap.get(stage.stageIndex);
      const option = stage.options.find(o => o.id === selectedOptionId);
      if (option) {
        if (option.criticalFailure) {
          criticalFailures.push(option.criticalFailure);
        }
        if (option.isCorrect) {
          correctCount += 1;
        }
      }
    });

    const scorePercentage = Math.round((correctCount / assessment.stages.length) * 100);
    const evaluation = MasteryEngine.evaluateMultiDimensionalOutcome({
      currentMastery: 70,
      dimensions: {
        diagnosis: scorePercentage,
        investigation: 85,
        implementation: scorePercentage,
        verification: criticalFailures.length === 0 ? 90 : 0
      },
      criticalFailures,
      threshold: assessment.passingThreshold
    });

    const isGoalCompleted = evaluation.isMastered && !evaluation.isCriticalFailure;

    const result = {
      assessmentId: assessment.assessmentId,
      goalId,
      scorePercentage: evaluation.overallScore,
      isGoalCompleted,
      isCriticalFailure: evaluation.isCriticalFailure,
      criticalFailureReasons: evaluation.criticalFailureReasons,
      passingThreshold: assessment.passingThreshold,
      rationale: isGoalCompleted 
        ? `Congratulations! Capstone assessment passed with ${evaluation.overallScore}%. Goal '${goalId}' achieved.`
        : evaluation.rationale,
      completedAt: new Date().toISOString()
    };

    const session = this.getUserSession(userId);
    session.finalAssessmentResults[goalId] = result;

    return result;
  }
}

export const SimulationRunner = new SimulationRunnerService();
