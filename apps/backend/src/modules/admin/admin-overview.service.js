import prisma from '../../config/prisma.js';

export class AdminOverviewService {
  /**
   * Generates complete decision-oriented learning intelligence overview
   */
  static async getOverview({
    timeRange = '30d',
    startDate = null,
    endDate = null,
    targetRoleId = null,
    status = null
  } = {}) {
    const now = new Date();
    let currentStart;
    let prevStart;
    let prevEnd;

    if (startDate && endDate) {
      currentStart = new Date(startDate);
      const spanMs = new Date(endDate).getTime() - currentStart.getTime();
      prevEnd = new Date(currentStart.getTime());
      prevStart = new Date(prevEnd.getTime() - spanMs);
    } else {
      let days = 30;
      if (timeRange === '7d') days = 7;
      if (timeRange === '90d') days = 90;
      if (timeRange === 'all') days = 365 * 5;

      currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      prevEnd = new Date(currentStart.getTime());
      prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // Base learner filter
    const learnerWhere = { role: 'LEARNER' };
    if (status) learnerWhere.status = status;
    if (targetRoleId) {
      learnerWhere.learningGoals = {
        some: { targetRoleId, status: 'ACTIVE' }
      };
    }

    // 1. Total Registered Students
    const totalStudents = await prisma.user.count({ where: learnerWhere });

    // 2. New Registrations in Current vs Previous Period
    const [newRegistrations, prevNewRegistrations] = await Promise.all([
      prisma.user.count({
        where: {
          ...learnerWhere,
          createdAt: { gte: currentStart, lte: now }
        }
      }),
      prisma.user.count({
        where: {
          ...learnerWhere,
          createdAt: { gte: prevStart, lte: prevEnd }
        }
      })
    ]);

    // 3. Active Students in Selected Window
    const activeStudentIds = await prisma.learningActivity.findMany({
      where: {
        createdAt: { gte: currentStart, lte: now },
        user: learnerWhere
      },
      distinct: ['userId'],
      select: { userId: true }
    });
    const activeStudentsCount = activeStudentIds.length;

    // Previous active students for trend comparison
    const prevActiveStudentIds = await prisma.learningActivity.findMany({
      where: {
        createdAt: { gte: prevStart, lte: prevEnd },
        user: learnerWhere
      },
      distinct: ['userId'],
      select: { userId: true }
    });
    const prevActiveStudentsCount = prevActiveStudentIds.length;

    // 4. Roadmap Metrics
    const [activePathsCount, totalRoadmapUsers] = await Promise.all([
      prisma.learningPath.count({
        where: {
          status: 'ACTIVE',
          user: learnerWhere
        }
      }),
      prisma.learningPath.groupBy({
        by: ['userId'],
        where: { user: learnerWhere }
      }).then(res => res.length)
    ]);

    const activePaths = await prisma.learningPath.findMany({
      where: { status: 'ACTIVE', user: learnerWhere },
      select: { completionPercentage: true }
    });

    const avgRoadmapCompletion = activePaths.length > 0
      ? Math.round(activePaths.reduce((acc, p) => acc + (p.completionPercentage || 0), 0) / activePaths.length)
      : 0;

    // 5. Learning Sessions & Activities Completion
    const [sessionsStarted, sessionsCompleted, prevSessionsCompleted] = await Promise.all([
      prisma.learningSession.count({
        where: {
          startedAt: { gte: currentStart, lte: now },
          user: learnerWhere
        }
      }),
      prisma.learningSession.count({
        where: {
          completedAt: { gte: currentStart, lte: now },
          status: 'COMPLETED',
          user: learnerWhere
        }
      }),
      prisma.learningSession.count({
        where: {
          completedAt: { gte: prevStart, lte: prevEnd },
          status: 'COMPLETED',
          user: learnerWhere
        }
      })
    ]);

    const sessionCompletionRate = sessionsStarted > 0
      ? Math.round((sessionsCompleted / sessionsStarted) * 100)
      : (sessionsCompleted > 0 ? 100 : 0);

    // 6. Assessments & Quizzes Metrics
    const [quizAttempts, quizCompleted, assessmentAttempts] = await Promise.all([
      prisma.quizAttempt.count({
        where: {
          startedAt: { gte: currentStart, lte: now },
          user: learnerWhere
        }
      }),
      prisma.quizAttempt.findMany({
        where: {
          completedAt: { gte: currentStart, lte: now },
          user: learnerWhere
        },
        select: { score: true }
      }),
      prisma.assessmentAttempt.findMany({
        where: {
          startedAt: { gte: currentStart, lte: now },
          user: learnerWhere
        },
        select: { score: true, completedAt: true }
      })
    ]);

    const avgQuizScore = quizCompleted.length > 0
      ? Math.round(quizCompleted.reduce((acc, q) => acc + (q.score || 0), 0) / quizCompleted.length)
      : 0;

    const completedAssessments = assessmentAttempts.filter(a => a.completedAt !== null);
    const avgAssessmentScore = completedAssessments.length > 0
      ? Math.round(completedAssessments.reduce((acc, a) => acc + (a.score || 0), 0) / completedAssessments.length)
      : 0;

    // 7. Students At Risk of Disengagement (> 7 days inactive with an active roadmap)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentActiveUserIds = new Set(
      (await prisma.learningActivity.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { userId: true },
        distinct: ['userId']
      })).map(a => a.userId)
    );

    const activePathUsers = await prisma.learningPath.findMany({
      where: { status: 'ACTIVE', user: learnerWhere },
      select: { userId: true },
      distinct: ['userId']
    });

    const atRiskCount = activePathUsers.filter(p => !recentActiveUserIds.has(p.userId)).length;

    // 8. Time-Series Trends (Aggregate by day/period)
    const timeSeriesTrends = await this._calculateEngagementTrends({
      currentStart,
      now,
      learnerWhere
    });

    // 9. Student Learning Funnel
    const funnel = await this._calculateLearningFunnel(learnerWhere);

    // 10. "Needs Attention" Actionable Insights
    const needsAttention = await this._calculateNeedsAttentionInsights({
      currentStart,
      now,
      learnerWhere,
      atRiskCount
    });

    return {
      timeRange,
      period: {
        currentStart: currentStart.toISOString(),
        currentEnd: now.toISOString(),
        previousStart: prevStart.toISOString(),
        previousEnd: prevEnd.toISOString()
      },
      kpis: {
        totalStudents: {
          value: totalStudents,
          label: 'Total Registered Students',
          changePct: prevNewRegistrations > 0
            ? Math.round(((newRegistrations - prevNewRegistrations) / prevNewRegistrations) * 100)
            : 0
        },
        activeStudents: {
          value: activeStudentsCount,
          label: 'Active Students (Period)',
          previousValue: prevActiveStudentsCount,
          changePct: prevActiveStudentsCount > 0
            ? Math.round(((activeStudentsCount - prevActiveStudentsCount) / prevActiveStudentsCount) * 100)
            : 0
        },
        newRegistrations: {
          value: newRegistrations,
          label: 'New Registrations',
          previousValue: prevNewRegistrations,
          changePct: prevNewRegistrations > 0
            ? Math.round(((newRegistrations - prevNewRegistrations) / prevNewRegistrations) * 100)
            : 0
        },
        roadmapStarted: {
          value: totalRoadmapUsers,
          percentage: totalStudents > 0 ? Math.round((totalRoadmapUsers / totalStudents) * 100) : 0,
          label: 'Students with Roadmap'
        },
        avgRoadmapCompletion: {
          value: avgRoadmapCompletion,
          label: 'Avg Roadmap Progress',
          unit: '%'
        },
        sessionCompletionRate: {
          value: sessionCompletionRate,
          label: 'Session Completion Rate',
          unit: '%',
          sessionsCompleted,
          sessionsStarted
        },
        avgQuizScore: {
          value: avgQuizScore,
          label: 'Avg Quiz Mastery',
          unit: '%',
          attemptsCount: quizAttempts
        },
        avgAssessmentScore: {
          value: avgAssessmentScore,
          label: 'Diagnostic Assessment Avg',
          unit: '%'
        },
        disengagedStudents: {
          value: atRiskCount,
          label: 'Students At Risk (Inactive >7d)',
          severity: atRiskCount > 10 ? 'HIGH' : (atRiskCount > 0 ? 'MEDIUM' : 'LOW')
        }
      },
      funnel,
      trends: timeSeriesTrends,
      needsAttention,
      lastRefreshed: new Date().toISOString()
    };
  }

  /**
   * Calculates actual conversion funnel across supported lifecycle milestones
   */
  static async _calculateLearningFunnel(learnerWhere) {
    const [
      totalRegistered,
      completedOnboarding,
      selectedGoal,
      generatedRoadmap,
      startedFirstActivity,
      completedFirstActivity,
      returnedLearners,
      completedMilestone
    ] = await Promise.all([
      prisma.user.count({ where: learnerWhere }),
      prisma.user.count({
        where: {
          ...learnerWhere,
          profile: { onboardingCompleted: true }
        }
      }),
      prisma.learningGoal.groupBy({
        by: ['userId'],
        where: { user: learnerWhere, status: 'ACTIVE' }
      }).then(r => r.length),
      prisma.learningPath.groupBy({
        by: ['userId'],
        where: { user: learnerWhere }
      }).then(r => r.length),
      prisma.learningSession.groupBy({
        by: ['userId'],
        where: { user: learnerWhere }
      }).then(r => r.length),
      prisma.learningSession.groupBy({
        by: ['userId'],
        where: { user: learnerWhere, status: 'COMPLETED' }
      }).then(r => r.length),
      // Returned: learners with at least 2 completed sessions
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT user_id)::int as count
        FROM learning_sessions
        WHERE status = 'COMPLETED'
        GROUP BY user_id
        HAVING COUNT(id) >= 2
      `.then(res => res.length),
      prisma.learningPathItem.groupBy({
        by: ['learningPathId'],
        where: { status: 'COMPLETED' }
      }).then(r => r.length)
    ]);

    const stages = [
      { id: 'registered', label: '1. Registered', count: totalRegistered },
      { id: 'onboarded', label: '2. Completed Onboarding', count: completedOnboarding },
      { id: 'goal_selected', label: '3. Selected Goal', count: selectedGoal },
      { id: 'roadmap_generated', label: '4. Generated Roadmap', count: generatedRoadmap },
      { id: 'started_activity', label: '5. Started 1st Activity', count: startedFirstActivity },
      { id: 'completed_activity', label: '6. Completed 1st Activity', count: completedFirstActivity },
      { id: 'returned', label: '7. Returned for More', count: returnedLearners },
      { id: 'milestone_reached', label: '8. Milestone Completed', count: completedMilestone }
    ];

    // Compute conversion from initial and conversion from previous
    return stages.map((stage, idx) => {
      const prevCount = idx === 0 ? stage.count : stages[idx - 1].count;
      const stepConversion = prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 0;
      const overallConversion = totalRegistered > 0 ? Math.round((stage.count / totalRegistered) * 100) : 0;
      const dropOff = Math.max(0, prevCount - stage.count);

      return {
        ...stage,
        stepConversion,
        overallConversion,
        dropOff
      };
    });
  }

  /**
   * Generates time-series trend buckets for charts
   */
  static async _calculateEngagementTrends({ currentStart, now, learnerWhere }) {
    // Generate buckets (last 14 data points or days)
    const daysDiff = Math.max(7, Math.min(60, Math.round((now.getTime() - currentStart.getTime()) / (24 * 60 * 60 * 1000))));
    const bucketCount = Math.min(14, daysDiff);
    const stepMs = (now.getTime() - currentStart.getTime()) / bucketCount;

    const buckets = [];
    for (let i = 0; i < bucketCount; i++) {
      const bStart = new Date(currentStart.getTime() + i * stepMs);
      const bEnd = new Date(currentStart.getTime() + (i + 1) * stepMs);
      const label = bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      buckets.push({
        label,
        start: bStart,
        end: bEnd
      });
    }

    const seriesData = await Promise.all(
      buckets.map(async (b) => {
        const [activeUsers, newUsers, completedSessions, quizCount] = await Promise.all([
          prisma.learningActivity.findMany({
            where: {
              createdAt: { gte: b.start, lt: b.end },
              user: learnerWhere
            },
            distinct: ['userId'],
            select: { userId: true }
          }).then(r => r.length),
          prisma.user.count({
            where: {
              createdAt: { gte: b.start, lt: b.end },
              ...learnerWhere
            }
          }),
          prisma.learningSession.count({
            where: {
              completedAt: { gte: b.start, lt: b.end },
              status: 'COMPLETED',
              user: learnerWhere
            }
          }),
          prisma.quizAttempt.count({
            where: {
              completedAt: { gte: b.start, lt: b.end },
              user: learnerWhere
            }
          })
        ]);

        return {
          date: b.label,
          activeUsers,
          newUsers,
          completedSessions,
          quizCount
        };
      })
    );

    return seriesData;
  }

  /**
   * Derives transparent, data-backed "Needs Attention" actionable insights
   */
  static async _calculateNeedsAttentionInsights({ currentStart, now, learnerWhere, atRiskCount }) {
    const insights = [];

    // 1. Topic Assessment Struggles: Aggregate by clean concept/lesson title, filtering out test artifacts
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        completedAt: { gte: currentStart, lte: now },
        user: learnerWhere
      },
      include: {
        quiz: {
          include: {
            lesson: {
              include: { concept: true }
            }
          }
        }
      }
    });

    // Group attempts by clean title / concept
    const topicMap = new Map();
    for (const att of attempts) {
      const rawTitle = att.quiz?.lesson?.title || '';
      // Exclude test lessons with ephemeral epoch timestamps (e.g. 1792...)
      if (/\d{8,}/.test(rawTitle) || /test/i.test(rawTitle)) {
        continue;
      }
      const cleanTitle = rawTitle.trim();
      if (!cleanTitle) continue;

      const key = att.quiz?.lesson?.concept?.slug || cleanTitle;
      if (!topicMap.has(key)) {
        topicMap.set(key, {
          title: cleanTitle,
          conceptSlug: att.quiz?.lesson?.concept?.slug || '',
          scores: [],
          userIds: new Set()
        });
      }
      const entry = topicMap.get(key);
      entry.scores.push(att.score || 0);
      entry.userIds.add(att.userId);
    }

    for (const [key, entry] of topicMap.entries()) {
      // Require at least 2 distinct learners and at least 3 attempts to establish genuine struggle
      if (entry.scores.length >= 3 && entry.userIds.size >= 2) {
        const avgScore = Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length);
        if (avgScore < 70) {
          insights.push({
            id: `topic_struggle_${key}`,
            category: 'TOPIC_PERFORMANCE',
            severity: avgScore < 50 ? 'HIGH' : 'MEDIUM',
            title: `High assessment difficulty: ${entry.title}`,
            description: `Students are averaging ${avgScore}% on this assessment across ${entry.scores.length} attempts from ${entry.userIds.size} learners. Concepts may need additional scaffolding.`,
            metric: `${avgScore}% avg score`,
            affectedCount: entry.userIds.size,
            suggestedAction: 'Review question clarity or insert reinforcement lesson',
            link: `/admin/content?topic=${entry.conceptSlug}`
          });
        }
      }
    }

    // 2. Disengaged Learners Insight
    if (atRiskCount > 0) {
      insights.push({
        id: 'disengaged_students',
        category: 'STUDENT_ENGAGEMENT',
        severity: atRiskCount > 15 ? 'HIGH' : 'MEDIUM',
        title: `${atRiskCount} active learners stalled (>7 days without learning)`,
        description: 'Learners have an active roadmap but have not logged a session in the past week.',
        metric: `${atRiskCount} students`,
        affectedCount: atRiskCount,
        suggestedAction: 'Send personalized recall re-engagement reminder',
        link: '/admin/students?filter=inactive'
      });
    }

    // 3. Failed or Pending Roadmaps Insight
    const pendingRoadmapCount = await prisma.user.count({
      where: {
        ...learnerWhere,
        profile: { onboardingCompleted: true },
        learningPaths: { none: { status: 'ACTIVE' } }
      }
    });

    if (pendingRoadmapCount > 0) {
      insights.push({
        id: 'pending_roadmaps',
        category: 'ROADMAP_GENERATION',
        severity: 'HIGH',
        title: `${pendingRoadmapCount} onboarded learners missing active roadmap`,
        description: 'Learners completed the onboarding questionnaire, but no active personalized learning path is registered.',
        metric: `${pendingRoadmapCount} pending`,
        affectedCount: pendingRoadmapCount,
        suggestedAction: 'Trigger roadmap synthesis or check LLM synthesis worker',
        link: '/admin/roadmaps'
      });
    }

    // 4. Failed Adaptive Evaluations / Roadmaps
    const failedVersionsCount = await prisma.learningPath.count({
      where: { status: 'FAILED' }
    });
    if (failedVersionsCount > 0) {
      insights.push({
        id: 'failed_evaluations',
        category: 'ADAPTIVE_EVALUATION',
        severity: 'HIGH',
        title: `${failedVersionsCount} roadmap generation/adaptation failures recorded`,
        description: 'System logged failed synthesis attempts. The previous valid roadmap version was preserved.',
        metric: `${failedVersionsCount} failed`,
        affectedCount: failedVersionsCount,
        suggestedAction: 'Inspect adaptation logs and model response schemas',
        link: '/admin/adaptation'
      });
    }

    // 5. Onboarding Drop-off Insight
    const registeredCount = await prisma.user.count({ where: learnerWhere });
    const unfinishedOnboarding = await prisma.user.count({
      where: {
        ...learnerWhere,
        profile: { onboardingCompleted: false }
      }
    });

    if (unfinishedOnboarding > 5 && registeredCount > 0) {
      const dropRate = Math.round((unfinishedOnboarding / registeredCount) * 100);
      if (dropRate > 25) {
        insights.push({
          id: 'onboarding_dropoff',
          category: 'ONBOARDING_FUNNEL',
          severity: dropRate > 40 ? 'HIGH' : 'LOW',
          title: `${unfinishedOnboarding} users did not finish diagnostic onboarding`,
          description: `${dropRate}% of registered learners exited before receiving their personalized roadmap.`,
          metric: `${dropRate}% drop-off`,
          affectedCount: unfinishedOnboarding,
          suggestedAction: 'Streamline initial onboarding questions and diagnostic length',
          link: '/admin/analytics'
        });
      }
    }

    return insights;
  }
}
