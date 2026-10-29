/**
 * Unified Scenario Registry
 * Indexes all simulation scenarios, validates contracts, and provides
 * sanitized client-safe payloads (stripping solution flags and critical-failure keys).
 */

import { diagnosticScenarios } from './scenarios/diagnostic-scenarios.js';
import { mainProblems } from './scenarios/main-problems.js';
import { miniSimulations } from './scenarios/mini-simulations.js';
import { finalAssessments } from './scenarios/final-assessments.js';

class ScenarioRegistryService {
  constructor() {
    this.diagnostics = new Map();
    this.mainProblems = new Map();
    this.miniSimulations = new Map();
    this.finalAssessments = new Map();
    this.init();
  }

  init() {
    for (const diag of diagnosticScenarios) {
      this.diagnostics.set(diag.scenarioId, diag);
      this.diagnostics.set(`goal:${diag.goalId}`, diag);
    }

    for (const prob of mainProblems) {
      this.mainProblems.set(prob.scenarioId, prob);
      this.mainProblems.set(`goal:${prob.goalId}`, prob);
    }

    for (const mini of miniSimulations) {
      this.miniSimulations.set(mini.scenarioId, mini);
      this.miniSimulations.set(`skill:${mini.targetedSkillId}`, mini);
    }

    for (const final of finalAssessments) {
      this.finalAssessments.set(final.assessmentId, final);
      this.finalAssessments.set(`goal:${final.goalId}`, final);
    }
  }

  normalizeGoalId(goalId) {
    if (!goalId || typeof goalId !== 'string') return goalId;
    const map = {
      'full-stack-developer': 'full-stack-development',
      'fullstack-developer': 'full-stack-development',
      'fullstack-development': 'full-stack-development',
      'backend-developer': 'backend-development',
      'frontend-developer': 'full-stack-development',
      'ai-developer': 'ai-engineer',
      'ai-engineering': 'ai-engineer'
    };
    return map[goalId] || goalId;
  }

  getDiagnosticByGoal(goalId) {
    const normalized = this.normalizeGoalId(goalId);
    return this.diagnostics.get(`goal:${normalized}`) || this.diagnostics.get(`goal:${goalId}`) || null;
  }

  getMainProblem(scenarioId) {
    const normalized = this.normalizeGoalId(scenarioId);
    return this.mainProblems.get(scenarioId) || this.mainProblems.get(`goal:${normalized}`) || this.mainProblems.get(`goal:${scenarioId}`) || null;
  }

  getMiniSimulation(scenarioIdOrSkill) {
    return this.miniSimulations.get(scenarioIdOrSkill) || this.miniSimulations.get(`skill:${scenarioIdOrSkill}`) || null;
  }

  getFinalAssessment(assessmentIdOrGoal) {
    const normalized = this.normalizeGoalId(assessmentIdOrGoal);
    return this.finalAssessments.get(assessmentIdOrGoal) || this.finalAssessments.get(`goal:${normalized}`) || this.finalAssessments.get(`goal:${assessmentIdOrGoal}`) || null;
  }

  /**
   * Returns a sanitized version of the scenario safe to send to the learner client.
   * Strips isCorrect and criticalFailure details from public actions.
   */
  sanitizeForLearner(scenario) {
    if (!scenario) return null;

    const copy = JSON.parse(JSON.stringify(scenario));

    if (Array.isArray(copy.allowedActions)) {
      copy.allowedActions = copy.allowedActions.map(action => {
        const { isCorrect, criticalFailure, ...safeProps } = action;
        return safeProps;
      });
    }

    if (Array.isArray(copy.stages)) {
      copy.stages = copy.stages.map(stage => {
        const stageCopy = { ...stage };
        if (Array.isArray(stageCopy.allowedActions)) {
          stageCopy.allowedActions = stageCopy.allowedActions.map(a => {
            const { isCorrect, criticalFailure, ...safeProps } = a;
            return safeProps;
          });
        }
        if (Array.isArray(stageCopy.options)) {
          stageCopy.options = stageCopy.options.map(o => {
            const { isCorrect, criticalFailure, ...safeProps } = o;
            return safeProps;
          });
        }
        // Do not expose raw verification checks in public payload
        delete stageCopy.verificationCheck;
        return stageCopy;
      });
    }

    return copy;
  }
}

export const ScenarioRegistry = new ScenarioRegistryService();
