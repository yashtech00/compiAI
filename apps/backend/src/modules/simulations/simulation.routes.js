import express from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { SimulationRunner } from './simulation.service.js';
import { MasterPathRegistry } from '../../curriculum/master-paths/master-path.registry.js';

const router = express.Router();

/**
 * Helper to get userId or guestId for unauthenticated diagnostic explorations
 */
function getLearnerId(req) {
  return req.user?.id || req.headers['x-learner-id'] || 'learner_session_default';
}

/**
 * GET /api/v1/simulations/goals
 * Lists all available goals and their versioned Master Path summaries
 */
router.get('/goals', (req, res) => {
  try {
    const goals = MasterPathRegistry.listSupportedGoals();
    return res.status(200).json({ success: true, data: { goals } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/simulations/diagnostic/:goalId
 * Fetches sanitized diagnostic simulation for the chosen goal
 */
router.get('/diagnostic/:goalId', (req, res) => {
  try {
    const { goalId } = req.params;
    const scenario = SimulationRunner.getDiagnosticScenario(goalId);
    return res.status(200).json({ success: true, data: { scenario } });
  } catch (err) {
    return res.status(404).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/simulations/diagnostic/:goalId/submit
 * Submits diagnostic scenario answers and yields baseline skill profile
 */
router.post('/diagnostic/:goalId/submit', async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = getLearnerId(req);
    const { selectedActionIds, evidenceInspected, explanation, hintsUsed, idempotencyKey } = req.body;

    const result = await SimulationRunner.submitDiagnostic(userId, goalId, {
      selectedActionIds,
      evidenceInspected,
      explanation,
      hintsUsed,
      idempotencyKey
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/simulations/main-problem/:goalId
 * Starts or retrieves the evolving main problem for a goal
 */
router.get('/main-problem/:goalId', (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = getLearnerId(req);
    const problem = SimulationRunner.startOrGetMainProblem(userId, goalId);
    return res.status(200).json({ success: true, data: problem });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/simulations/main-problem/:scenarioId/action
 * Submits an action for the active main problem stage
 */
router.post('/main-problem/:scenarioId/action', (req, res) => {
  try {
    const { scenarioId } = req.params;
    const userId = getLearnerId(req);
    const { stageIndex, actionId, explanation, hintsUsed } = req.body;

    const result = SimulationRunner.submitMainProblemAction(userId, scenarioId, {
      stageIndex: Number(stageIndex),
      actionId,
      explanation,
      hintsUsed: Number(hintsUsed) || 0
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/simulations/mini/:scenarioId/action
 * Submits an action for a focused mini-simulation drill
 */
router.post('/mini/:scenarioId/action', (req, res) => {
  try {
    const { scenarioId } = req.params;
    const userId = getLearnerId(req);
    const { actionId } = req.body;

    const result = SimulationRunner.submitMiniSimulationAction(userId, scenarioId, { actionId });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/simulations/return-to-main
 * Resumes the main problem after completing a mini-simulation
 */
router.post('/return-to-main', (req, res) => {
  try {
    const userId = getLearnerId(req);
    const result = SimulationRunner.returnToMainProblem(userId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/simulations/final-assessment/:goalId
 * Gets the final capstone assessment for a goal
 */
router.get('/final-assessment/:goalId', (req, res) => {
  try {
    const { goalId } = req.params;
    const assessment = SimulationRunner.ScenarioRegistry?.getFinalAssessment(goalId) || null;
    return res.status(200).json({ success: true, data: { assessment } });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/simulations/final-assessment/:goalId/submit
 * Submits the capstone assessment
 */
router.post('/final-assessment/:goalId/submit', (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = getLearnerId(req);
    const { answers } = req.body;

    const result = SimulationRunner.submitFinalAssessment(userId, goalId, { answers });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
