import { describe, it, expect } from 'vitest';
import { CheckpointAdaptationService, ADAPTATION_ACTIONS } from '../src/modules/learning-paths/checkpoint-adaptation.service.js';
import { EtaCalculatorService } from '../src/modules/learning-paths/eta-calculator.service.js';

describe('Phase 6 & 8: Checkpoint Path Adaptation & Calibrated ETA', () => {
  const sampleRoadmap = {
    goalId: 'system-design',
    milestones: [
      { masterModuleId: 'sd-mod-1', title: 'Metrics', order: 1, estimatedMinutes: 60, status: 'COMPLETED', requiredSkills: ['sd-metrics'] },
      { masterModuleId: 'sd-mod-2', title: 'API Design', order: 2, estimatedMinutes: 60, status: 'ACTIVE', requiredSkills: ['sd-api'] },
      { masterModuleId: 'sd-mod-3', title: 'Databases', order: 3, estimatedMinutes: 90, status: 'LOCKED', requiredSkills: ['sd-db'] }
    ]
  };

  it('1. Event Checkpoint: Critical failure inserts remediation branch and flags blocked milestone', () => {
    const outcome = CheckpointAdaptationService.evaluateEventCheckpoint({
      eventType: 'CRITICAL_FAILURE',
      learnerRoadmap: sampleRoadmap,
      currentMilestoneId: 'sd-mod-2',
      evidence: { criticalFailureReason: 'Unbounded memory leak in buffer allocation' }
    });

    expect(outcome.action).toBe(ADAPTATION_ACTIONS.REMEDIATE);
    expect(outcome.updatedMilestones.length).toBe(4); // 3 original + 1 remediation
    expect(outcome.pathDelta.branchInserted).toBeDefined();

    const currentMod = outcome.updatedMilestones.find(m => m.masterModuleId === 'sd-mod-2');
    expect(currentMod.status).toBe('BLOCKED_BY_BRANCH');

    const remediationBranch = outcome.updatedMilestones.find(m => m.branchType === 'REMEDIATION');
    expect(remediationBranch).toBeDefined();
    expect(remediationBranch.title).toContain('Remediation Drill');
  });

  it('2. Event Checkpoint: Prerequisite failure inserts prerequisite drill before current milestone', () => {
    const outcome = CheckpointAdaptationService.evaluateEventCheckpoint({
      eventType: 'PREREQUISITE_FAILURE',
      learnerRoadmap: sampleRoadmap,
      currentMilestoneId: 'sd-mod-3',
      evidence: { failedPrerequisiteSkillId: 'sd-data-modeling', failedPrerequisiteSkillTitle: 'Data Modeling' }
    });

    expect(outcome.action).toBe(ADAPTATION_ACTIONS.PREREQUISITE);
    const prereqBranch = outcome.updatedMilestones.find(m => m.branchType === 'PREREQUISITE');
    expect(prereqBranch).toBeDefined();
    expect(prereqBranch.requiredSkills).toContain('sd-data-modeling');
  });

  it('3. Event Checkpoint: Exemplary independent completion triggers ACCELERATE', () => {
    const outcome = CheckpointAdaptationService.evaluateEventCheckpoint({
      eventType: 'MILESTONE_COMPLETION',
      learnerRoadmap: sampleRoadmap,
      currentMilestoneId: 'sd-mod-2',
      evidence: { independentMasteryScore: 95, hintsUsed: 0 }
    });

    expect(outcome.action).toBe(ADAPTATION_ACTIONS.ACCELERATE);
    expect(outcome.decisionReason).toContain('Exemplary independent performance');
  });

  it('4. Periodic Checkpoint: Accelerates path after 3 consecutive high scores', () => {
    const periodic = CheckpointAdaptationService.evaluatePeriodicCheckpoint({
      learnerRoadmap: sampleRoadmap,
      completedSessionsCount: 4,
      consecutiveHighScoresCount: 3
    });

    expect(periodic.action).toBe(ADAPTATION_ACTIONS.ACCELERATE);
    expect(periodic.isAccelerated).toBe(true);
  });

  it('5. ETA Calculator: Correctly computes remaining effort, progress percentage, and session count', () => {
    // Completed: mod-1 (60 mins)
    // Remaining: mod-2 (60 mins) + mod-3 (90 mins) + capstone (60 mins) = 210 mins
    // Total: 270 mins -> Progress: 60 / 270 = 22%
    // Daily minutes: 15 -> Estimated sessions: ceil(210 / 15) = 14 sessions
    const eta = EtaCalculatorService.calculateRemainingEffort({
      milestones: sampleRoadmap.milestones,
      dailyMinutes: 15,
      completedSessions: []
    });

    expect(eta.completedMinutes).toBe(60);
    expect(eta.remainingMinutes).toBe(210);
    expect(eta.totalProjectedMinutes).toBe(270);
    expect(eta.progressPercent).toBe(22);
    expect(eta.estimatedSessionsRemaining).toBe(14);
    expect(eta.isProvisional).toBe(true);
  });

  it('6. ETA Calculator: Accounts for remediation branches and velocity calibration', () => {
    const roadmapWithRemediation = {
      milestones: [
        ...sampleRoadmap.milestones,
        { masterModuleId: 'rem-1', estimatedMinutes: 30, status: 'ACTIVE', branchType: 'REMEDIATION' }
      ]
    };

    // Fast learner completing sessions in 14 mins (expected pace 20 mins)
    const sessions = [
      { durationMinutes: 14 },
      { durationMinutes: 14 },
      { durationMinutes: 14 }
    ];

    const eta = EtaCalculatorService.calculateRemainingEffort({
      milestones: roadmapWithRemediation.milestones,
      dailyMinutes: 15,
      completedSessions: sessions
    });

    expect(eta.activeRemediationsCount).toBe(1);
    expect(eta.isProvisional).toBe(false); // Calibrated with >=3 sessions
    expect(eta.velocityMultiplier).toBeLessThan(1.0); // Faster learner
    expect(eta.remainingMinutes).toBeLessThan(240); // 210 + 30 = 240 baseline, reduced by velocity
  });

  it('7. ETA Calculator: Safe defaults for empty or invalid values without zero-division', () => {
    const safeEta = EtaCalculatorService.calculateRemainingEffort({
      milestones: [],
      dailyMinutes: 0
    });

    expect(safeEta.remainingMinutes).toBe(60); // Final assessment minimum
    expect(safeEta.estimatedSessionsRemaining).toBeGreaterThanOrEqual(1);
    expect(safeEta.progressPercent).toBe(0);
  });
});
