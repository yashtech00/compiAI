/**
 * Checkpoint & Path Adaptation Service
 * Evaluates event-driven and periodic checkpoints to adapt learner roadmap
 * branches without mutating the canonical Master Path.
 */

export const ADAPTATION_ACTIONS = {
  ACCELERATE: 'ACCELERATE',
  CONTINUE: 'CONTINUE',
  REMEDIATE: 'REMEDIATE',
  PREREQUISITE: 'PREREQUISITE',
  REVIEW: 'REVIEW'
};

export class CheckpointAdaptationService {
  /**
   * Evaluates an immediate event-driven checkpoint.
   * @param {Object} checkpointEvent
   * @returns {Object} Adaptation decision and updated path delta
   */
  static evaluateEventCheckpoint({
    eventType, // 'CRITICAL_FAILURE' | 'PREREQUISITE_FAILURE' | 'REPEATED_FAILURE' | 'MILESTONE_COMPLETION'
    learnerRoadmap,
    currentMilestoneId,
    evidence = {},
    policyVersion = '1.0.0'
  }) {
    if (!learnerRoadmap || !Array.isArray(learnerRoadmap.milestones)) {
      throw new Error('Invalid learner roadmap provided');
    }

    const currentMilestone = learnerRoadmap.milestones.find(m => m.masterModuleId === currentMilestoneId);
    let action = ADAPTATION_ACTIONS.CONTINUE;
    let decisionReason = '';
    let branchInserted = null;

    if (eventType === 'CRITICAL_FAILURE') {
      action = ADAPTATION_ACTIONS.REMEDIATE;
      decisionReason = `Critical architectural failure detected (${evidence.criticalFailureReason || 'Safety constraint violation'}). Inserting targeted remediation drill to eliminate severe hazard before proceeding.`;

      branchInserted = {
        masterModuleId: `remediation-${currentMilestoneId}-${Date.now()}`,
        title: `Remediation Drill: Safety & Reliability in ${currentMilestone?.title || 'System'}`,
        description: `Targeted practice resolving ${evidence.criticalFailureReason || 'critical failure'}`,
        order: (currentMilestone?.order || 1) + 0.1,
        requiredSkills: [...(currentMilestone?.requiredSkills || [])],
        estimatedMinutes: 30,
        scenarioIds: [`mini-remediation-${currentMilestoneId}`],
        status: 'ACTIVE',
        masteryScore: 0,
        branchType: 'REMEDIATION'
      };
    } else if (eventType === 'PREREQUISITE_FAILURE') {
      action = ADAPTATION_ACTIONS.PREREQUISITE;
      decisionReason = `Prerequisite skill '${evidence.failedPrerequisiteSkillId || 'required foundational skill'}' has insufficient mastery (< 60%). Route directed to foundational mastery before dependent milestones unlock.`;

      branchInserted = {
        masterModuleId: `prereq-${evidence.failedPrerequisiteSkillId}-${Date.now()}`,
        title: `Prerequisite Reinforcement: ${evidence.failedPrerequisiteSkillTitle || 'Core Concepts'}`,
        description: `Build required baseline competence before attempting ${currentMilestone?.title}`,
        order: (currentMilestone?.order || 1) - 0.1,
        requiredSkills: [evidence.failedPrerequisiteSkillId],
        estimatedMinutes: 25,
        scenarioIds: [`mini-prereq-${evidence.failedPrerequisiteSkillId}`],
        status: 'ACTIVE',
        masteryScore: 0,
        branchType: 'PREREQUISITE'
      };
    } else if (eventType === 'REPEATED_FAILURE') {
      action = ADAPTATION_ACTIONS.REMEDIATE;
      decisionReason = `Repeated difficulty observed on ${currentMilestone?.title} (consecutive failures: ${evidence.failureCount || 2}). Remediation branch added to solidify core concepts.`;

      branchInserted = {
        masterModuleId: `remediation-repeated-${currentMilestoneId}-${Date.now()}`,
        title: `Reinforcement Practice: ${currentMilestone?.title}`,
        description: 'Guided problem solving addressing persistent misconceptions',
        order: (currentMilestone?.order || 1) + 0.1,
        requiredSkills: [...(currentMilestone?.requiredSkills || [])],
        estimatedMinutes: 30,
        scenarioIds: [`mini-repeat-${currentMilestoneId}`],
        status: 'ACTIVE',
        masteryScore: 0,
        branchType: 'REMEDIATION'
      };
    } else if (eventType === 'MILESTONE_COMPLETION') {
      // Evaluate if strong unassisted performance unlocks acceleration
      if (evidence.independentMasteryScore >= 90 && evidence.hintsUsed === 0) {
        action = ADAPTATION_ACTIONS.ACCELERATE;
        decisionReason = `Exemplary independent performance (${evidence.independentMasteryScore}%, zero hints). Accelerated past introductory exercises for next module.`;
      } else {
        action = ADAPTATION_ACTIONS.CONTINUE;
        decisionReason = `Milestone completed successfully with score ${evidence.independentMasteryScore || 80}%. Continuing to next planned curriculum milestone.`;
      }
    }

    // Apply branch if generated
    const updatedMilestones = [...learnerRoadmap.milestones];
    if (branchInserted) {
      // Deactivate current milestone while branch is active
      if (currentMilestone) {
        currentMilestone.status = 'BLOCKED_BY_BRANCH';
      }
      updatedMilestones.push(branchInserted);
      updatedMilestones.sort((a, b) => a.order - b.order);
    }

    const pathDelta = {
      action,
      decisionReason,
      triggeringEventType: eventType,
      branchInserted: branchInserted ? branchInserted.masterModuleId : null,
      policyVersion,
      timestamp: new Date().toISOString()
    };

    return {
      action,
      decisionReason,
      updatedMilestones,
      pathDelta
    };
  }

  /**
   * Evaluates periodic checkpoints (e.g. after every 3 completed sessions).
   */
  static evaluatePeriodicCheckpoint({
    learnerRoadmap,
    completedSessionsCount = 3,
    consecutiveHighScoresCount = 0
  }) {
    if (!learnerRoadmap || !Array.isArray(learnerRoadmap.milestones)) {
      throw new Error('Invalid learner roadmap provided');
    }

    // Checkpoint rule: 3+ consecutive high unassisted scores across related skills
    if (consecutiveHighScoresCount >= 3) {
      return {
        action: ADAPTATION_ACTIONS.ACCELERATE,
        decisionReason: `Periodic checkpoint review: Strong multi-skill mastery demonstrated across ${consecutiveHighScoresCount} consecutive assessments. Next milestone scope accelerated.`,
        isAccelerated: true,
        checkpointType: 'PERIODIC_ACCELERATION'
      };
    }

    return {
      action: ADAPTATION_ACTIONS.CONTINUE,
      decisionReason: `Periodic checkpoint review: Steady progress maintained across ${completedSessionsCount} sessions. Continuing standard curriculum pacing.`,
      isAccelerated: false,
      checkpointType: 'PERIODIC_STANDARD'
    };
  }
}
