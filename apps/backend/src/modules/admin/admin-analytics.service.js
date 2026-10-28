import prisma from '../../config/prisma.js';

export class AdminAnalyticsService {
  /**
   * Topic Performance & Bottleneck Analysis
   */
  static async getTopicPerformance({ careerGoalId = null, sortBy = 'failureRate', sortOrder = 'desc' } = {}) {
    // Fetch all concepts with lessons and quizzes
    const concepts = await prisma.concept.findMany({
      include: {
        skill: true,
        lessons: {
          include: {
            quizzes: {
              include: {
                attempts: {
                  select: { id: true, score: true, startedAt: true, completedAt: true }
                }
              }
            },
            sessions: {
              select: { id: true, status: true, durationSeconds: true }
            }
          }
        },
        learningPathItems: {
          select: { id: true, status: true }
        }
      }
    });

    const topicStats = concepts.map((concept) => {
      let totalSessions = 0;
      let completedSessions = 0;
      let totalDurationSecs = 0;

      for (const lesson of concept.lessons) {
        for (const s of lesson.sessions) {
          totalSessions++;
          if (s.status === 'COMPLETED') completedSessions++;
          totalDurationSecs += s.durationSeconds || 0;
        }
      }

      // Quiz attempts
      let totalQuizAttempts = 0;
      let totalQuizScore = 0;
      let failedQuizAttempts = 0;

      for (const lesson of concept.lessons) {
        for (const q of lesson.quizzes) {
          for (const att of q.attempts) {
            totalQuizAttempts++;
            totalQuizScore += att.score || 0;
            if ((att.score || 0) < 70) failedQuizAttempts++;
          }
        }
      }

      const pathItemsCount = concept.learningPathItems.length;
      const pathItemsCompleted = concept.learningPathItems.filter(i => i.status === 'COMPLETED').length;

      const completionRate = totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : (pathItemsCount > 0 ? Math.round((pathItemsCompleted / pathItemsCount) * 100) : 0);

      const abandonmentRate = totalSessions > 0
        ? Math.max(0, Math.round(((totalSessions - completedSessions) / totalSessions) * 100))
        : 0;

      const avgScore = totalQuizAttempts > 0
        ? Math.round(totalQuizScore / totalQuizAttempts)
        : 0;

      const failureRate = totalQuizAttempts > 0
        ? Math.round((failedQuizAttempts / totalQuizAttempts) * 100)
        : 0;

      // Severity calculation
      let severity = 'HEALTHY';
      if (failureRate >= 40 || abandonmentRate >= 50) severity = 'CRITICAL';
      else if (failureRate >= 25 || abandonmentRate >= 30) severity = 'WARNING';

      return {
        conceptId: concept.id,
        name: concept.name,
        slug: concept.slug,
        skillName: concept.skill?.name || 'General',
        difficulty: concept.difficulty,
        studentsStarted: totalSessions || pathItemsCount,
        studentsCompleted: completedSessions || pathItemsCompleted,
        completionRate,
        abandonmentRate,
        quizAttempts: totalQuizAttempts,
        avgScore,
        failureRate,
        avgDurationMins: completedSessions > 0 ? Math.round(totalDurationSecs / completedSessions / 60) : 0,
        severity
      };
    });

    // Sort topics
    topicStats.sort((a, b) => {
      const valA = a[sortBy] ?? 0;
      const valB = b[sortBy] ?? 0;
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return {
      totalTopics: topicStats.length,
      criticalTopicsCount: topicStats.filter(t => t.severity === 'CRITICAL').length,
      warningTopicsCount: topicStats.filter(t => t.severity === 'WARNING').length,
      topics: topicStats
    };
  }

  /**
   * Day 1, Day 7, Day 30 Retention Analytics based on real registered users
   */
  static async getRetentionAnalytics() {
    const learners = await prisma.user.findMany({
      where: { role: 'LEARNER' },
      select: {
        id: true,
        createdAt: true,
        learningSessions: {
          where: { status: 'COMPLETED' },
          select: { completedAt: true }
        }
      }
    });

    const now = new Date();
    let eligibleDay1 = 0;
    let retainedDay1 = 0;
    let eligibleDay7 = 0;
    let retainedDay7 = 0;
    let eligibleDay30 = 0;
    let retainedDay30 = 0;

    for (const learner of learners) {
      const regTime = new Date(learner.createdAt).getTime();
      const ageDays = (now.getTime() - regTime) / (24 * 60 * 60 * 1000);

      const sessionTimes = learner.learningSessions.map(s => new Date(s.completedAt).getTime());

      // Day 1
      if (ageDays >= 1) {
        eligibleDay1++;
        const hasD1 = sessionTimes.some(t => {
          const diffDays = (t - regTime) / (24 * 60 * 60 * 1000);
          return diffDays >= 0.5 && diffDays <= 2;
        });
        if (hasD1) retainedDay1++;
      }

      // Day 7
      if (ageDays >= 7) {
        eligibleDay7++;
        const hasD7 = sessionTimes.some(t => {
          const diffDays = (t - regTime) / (24 * 60 * 60 * 1000);
          return diffDays >= 5 && diffDays <= 9;
        });
        if (hasD7) retainedDay7++;
      }

      // Day 30
      if (ageDays >= 30) {
        eligibleDay30++;
        const hasD30 = sessionTimes.some(t => {
          const diffDays = (t - regTime) / (24 * 60 * 60 * 1000);
          return diffDays >= 25 && diffDays <= 35;
        });
        if (hasD30) retainedDay30++;
      }
    }

    return {
      day1: {
        rate: eligibleDay1 > 0 ? Math.round((retainedDay1 / eligibleDay1) * 100) : 0,
        retained: retainedDay1,
        eligible: eligibleDay1
      },
      day7: {
        rate: eligibleDay7 > 0 ? Math.round((retainedDay7 / eligibleDay7) * 100) : 0,
        retained: retainedDay7,
        eligible: eligibleDay7
      },
      day30: {
        rate: eligibleDay30 > 0 ? Math.round((retainedDay30 / eligibleDay30) * 100) : 0,
        retained: retainedDay30,
        eligible: eligibleDay30
      }
    };
  }

  /**
   * Learner Segment Analysis by Target Career Role
   */
  static async getRoleAnalytics() {
    const roles = await prisma.targetRole.findMany({
      include: {
        learningGoals: {
          where: { user: { role: 'LEARNER' } },
          include: {
            user: {
              include: {
                learningPaths: {
                  where: { status: 'ACTIVE' },
                  select: { completionPercentage: true }
                },
                learningSessions: {
                  where: { status: 'COMPLETED' },
                  select: { id: true }
                }
              }
            }
          }
        }
      }
    });

    const segments = roles.map((role) => {
      const studentCount = role.learningGoals.length;
      let totalProgress = 0;
      let totalSessions = 0;

      for (const goal of role.learningGoals) {
        const path = goal.user.learningPaths[0];
        totalProgress += path?.completionPercentage || 0;
        totalSessions += goal.user.learningSessions.length;
      }

      return {
        roleId: role.id,
        name: role.name,
        slug: role.slug,
        studentCount,
        avgProgress: studentCount > 0 ? Math.round(totalProgress / studentCount) : 0,
        totalCompletedSessions: totalSessions
      };
    });

    segments.sort((a, b) => b.studentCount - a.studentCount);
    return segments;
  }
}
