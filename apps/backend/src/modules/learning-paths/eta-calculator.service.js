/**
 * Deterministic ETA & Remaining Effort Estimator
 * Computes calibrated remaining learning time and session count
 * based on unmastered modules, active remediation branches, and historical velocity.
 */

export class EtaCalculatorService {
  /**
   * Calculates remaining effort and provisional session count.
   * @param {Object} params
   * @returns {Object} ETA estimation breakdown
   */
  static calculateRemainingEffort({
    milestones = [],
    dailyMinutes = 15,
    completedSessions = [],
    hasFinalAssessment = true
  }) {
    if (!Array.isArray(milestones)) {
      milestones = [];
    }

    const safeDailyMinutes = Math.max(5, Number(dailyMinutes) || 15);
    let remainingMinutes = 0;
    let completedMinutes = 0;
    let activeRemediationsCount = 0;

    for (const m of milestones) {
      const minutes = typeof m.estimatedMinutes === 'number' && m.estimatedMinutes > 0 
        ? m.estimatedMinutes 
        : 30; // Safe default for unestimated modules

      if (m.status === 'COMPLETED' || m.status === 'SKIPPED_BY_DIAGNOSTIC') {
        completedMinutes += minutes;
      } else {
        remainingMinutes += minutes;
        if (m.branchType === 'REMEDIATION' || m.branchType === 'PREREQUISITE') {
          activeRemediationsCount += 1;
        }
      }
    }

    // Add capstone final assessment effort (default 60 mins)
    if (hasFinalAssessment) {
      remainingMinutes += 60;
    }

    // Historical Pace Calibration
    let velocityMultiplier = 1.0;
    const validSessions = (completedSessions || []).filter(s => typeof s.durationMinutes === 'number' && s.durationMinutes > 0);
    
    if (validSessions.length >= 3) {
      const avgDuration = validSessions.reduce((acc, s) => acc + s.durationMinutes, 0) / validSessions.length;
      // If learner completes sessions 20% faster than baseline 20 mins, adjust multiplier smoothly [0.7 - 1.4]
      const expectedPace = 20;
      velocityMultiplier = Math.min(1.4, Math.max(0.7, avgDuration / expectedPace));
    }

    const calibratedRemainingMinutes = Math.round(remainingMinutes * velocityMultiplier);
    const estimatedSessionsRemaining = Math.max(1, Math.ceil(calibratedRemainingMinutes / safeDailyMinutes));

    const totalProjectedMinutes = completedMinutes + calibratedRemainingMinutes;
    const progressPercent = totalProjectedMinutes > 0 
      ? Math.min(100, Math.round((completedMinutes / totalProjectedMinutes) * 100))
      : 0;

    const isProvisional = validSessions.length < 3;

    return {
      remainingMinutes: calibratedRemainingMinutes,
      completedMinutes,
      totalProjectedMinutes,
      progressPercent,
      estimatedSessionsRemaining,
      dailyMinutesTarget: safeDailyMinutes,
      activeRemediationsCount,
      velocityMultiplier: Math.round(velocityMultiplier * 100) / 100,
      isProvisional,
      disclaimer: isProvisional 
        ? 'Provisional estimate based on curriculum baseline. Calibrates dynamically with your learning velocity.'
        : 'Calibrated with your verified session completion velocity.'
    };
  }
}
