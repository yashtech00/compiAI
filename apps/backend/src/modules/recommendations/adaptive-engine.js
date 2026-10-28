import prisma from '../../config/prisma.js';
import { AiService } from '../ai/ai.service.js';
import { RoadmapService } from '../learning-paths/roadmap.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Adaptive Learning Engine for Companion.ai
 *
 * Implements deterministic, explainable next-action selection backed by persisted learner evidence.
 * Primary next-action types:
 * 1. ADVANCE: Required prerequisites mastered, quiz results strong, move to next concept.
 * 2. REINFORCE: Quiz or application showed struggle/misconceptions, repeat with targeted focus.
 * 3. REVIEW: Spaced repetition recall due for retention practice.
 * 4. PREREQUISITE: Foundational knowledge gap detected before attempting dependent concept.
 * 5. CONTENT_UNAVAILABLE: Recoverable state when a lesson is pending publication (never falls back to random lesson).
 */
export class AdaptiveEngine {
  /**
   * Evaluates learner model signals and determines the next optimal learning action
   * @param {string} userId
   * @param {string|null} targetConceptId Optional explicit target concept to evaluate prerequisites for
   */
  static async evaluateNextAction(userId, targetConceptId = null) {
    // 1. Fetch user profile, daily time budget, active goal, and streak
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        streak: true,
        learningGoals: {
          where: { status: 'ACTIVE' },
          include: {
            targetRole: {
              include: {
                roleSkills: {
                  include: { skill: true }
                }
              }
            }
          },
          take: 1
        }
      }
    });

    const activeGoal = user?.learningGoals?.[0] || null;
    const dailyMinutes = user?.profile?.dailyMinutes || 15;

    // 2. CHECK RULE 1: Spaced Repetition Recall (REVIEW)
    const now = new Date();
    const dueRecall = await prisma.recallSchedule.findFirst({
      where: {
        userId,
        scheduledAt: { lte: now },
        status: 'SCHEDULED'
      },
      include: {
        concept: {
          include: {
            skill: true,
            lessons: { where: { status: 'PUBLISHED' }, take: 1 }
          }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    if (dueRecall && dueRecall.concept) {
      const lesson = dueRecall.concept.lessons?.[0] || null;
      if (lesson) {
        const reason = `Spaced review is due for ${dueRecall.concept.name}. Active retrieval practice solidifies memory retention before tackling new concepts.`;
        await this._logRecommendation(userId, 'REVIEW', dueRecall.concept.id, lesson.id, reason, dailyMinutes);

        return {
          actionType: 'REVIEW',
          concept: dueRecall.concept,
          lesson,
          reason,
          dailyMinutes
        };
      }
    }

    // 3. CHECK RULE 2: Targeted Misconception or Low Mastery (REINFORCE)
    // Find any recently attempted concept where mastery is low (< 65) or quiz attempt was failed
    const weakConceptRecord = await prisma.userConcept.findFirst({
      where: {
        userId,
        attempts: { gt: 0 },
        masteryScore: { lt: 65 }
      },
      include: {
        concept: {
          include: {
            skill: true,
            lessons: { where: { status: 'PUBLISHED' }, take: 1 }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (weakConceptRecord && weakConceptRecord.concept) {
      const lesson = weakConceptRecord.concept.lessons?.[0] || null;
      if (lesson) {
        const reason = `Targeted reinforcement for ${weakConceptRecord.concept.name}. Recent practice indicated room for growth; solidifying this concept now prevents downstream confusion.`;
        await this._logRecommendation(userId, 'REINFORCE', weakConceptRecord.concept.id, lesson.id, reason, dailyMinutes);

        return {
          actionType: 'REINFORCE',
          concept: weakConceptRecord.concept,
          lesson,
          reason,
          dailyMinutes
        };
      }
    }

    // Load user concept mastery records
    const userConcepts = await prisma.userConcept.findMany({
      where: { userId }
    });
    const masteryMap = new Map();
    for (const uc of userConcepts) {
      masteryMap.set(uc.conceptId, uc.masteryScore);
    }

    // 4. CHECK RULE 3: Targeted concept or active in-progress concept prerequisite evaluation
    if (targetConceptId) {
      const targetConcept = await prisma.concept.findUnique({
        where: { id: targetConceptId },
        include: {
          skill: true,
          prerequisites: {
            include: { prerequisiteConcept: { include: { skill: true, lessons: { where: { status: 'PUBLISHED' }, take: 1 } } } }
          },
          lessons: { where: { status: 'PUBLISHED' }, take: 1 }
        }
      });

      if (targetConcept) {
        for (const p of targetConcept.prerequisites) {
          const prereqScore = masteryMap.get(p.prerequisiteConceptId) || 0;
          if (prereqScore < 60) {
            const prereqConcept = p.prerequisiteConcept;
            const lesson = prereqConcept?.lessons?.[0] || null;
            if (lesson) {
              const reason = `Foundational prerequisite gap detected: ${targetConcept.name} requires ${prereqConcept.name}. Building mastery in ${prereqConcept.name} first ensures steady progress.`;
              await this._logRecommendation(userId, 'PREREQUISITE', prereqConcept.id, lesson.id, reason, dailyMinutes);

              return {
                actionType: 'PREREQUISITE',
                concept: prereqConcept,
                lesson,
                reason,
                dailyMinutes
              };
            }
          }
        }

        const lesson = targetConcept.lessons?.[0] || null;
        if (lesson) {
          const roleName = activeGoal?.targetRole?.name || 'Software Engineer';
          const reason = `Prerequisites satisfied. Ready to advance to ${targetConcept.name} to continue your path toward ${roleName}.`;
          await this._logRecommendation(userId, 'ADVANCE', targetConcept.id, lesson.id, reason, dailyMinutes);

          return {
            actionType: 'ADVANCE',
            concept: targetConcept,
            lesson,
            reason,
            dailyMinutes
          };
        }
      }
    }

    // Check if user has an active roadmap. Find the first unmastered milestone in sequence order.
    const activeRoadmap = await prisma.learningPath.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        items: {
          where: { status: { in: ['IN_PROGRESS', 'PENDING'] } },
          orderBy: { sequenceOrder: 'asc' },
          include: {
            concept: {
              include: {
                skill: true,
                prerequisites: {
                  include: { prerequisiteConcept: { include: { skill: true, lessons: { where: { status: 'PUBLISHED' }, take: 1 } } } }
                },
                lessons: { where: { status: 'PUBLISHED' }, take: 1 }
              }
            }
          }
        }
      }
    });

    let inProgressConcept = null;
    if (activeRoadmap?.items?.length > 0) {
      for (const item of activeRoadmap.items) {
        const itemMastery = masteryMap.get(item.conceptId) || 0;
        if (itemMastery < 70) {
          inProgressConcept = item.concept;
          break;
        }
      }
    }
    if (inProgressConcept) {
      for (const p of inProgressConcept.prerequisites) {
        const prereqScore = masteryMap.get(p.prerequisiteConceptId) || 0;
        if (prereqScore < 60) {
          const prereqConcept = p.prerequisiteConcept;
          const lesson = prereqConcept?.lessons?.[0] || null;
          if (lesson) {
            const reason = `Foundational prerequisite gap detected: ${inProgressConcept.name} requires ${prereqConcept.name}. Building mastery in ${prereqConcept.name} first ensures steady progress.`;
            await this._logRecommendation(userId, 'PREREQUISITE', prereqConcept.id, lesson.id, reason, dailyMinutes);

            return {
              actionType: 'PREREQUISITE',
              concept: prereqConcept,
              lesson,
              reason,
              dailyMinutes
            };
          }
        }
      }

      const lesson = inProgressConcept.lessons?.[0] || null;
      if (lesson) {
        const roleName = activeGoal?.targetRole?.name || 'Software Engineer';
        const reason = `Next recommended milestone in your path toward ${roleName}: ${inProgressConcept.name}.`;
        await this._logRecommendation(userId, 'ADVANCE', inProgressConcept.id, lesson.id, reason, dailyMinutes);

        return {
          actionType: 'ADVANCE',
          concept: inProgressConcept,
          lesson,
          reason,
          dailyMinutes
        };
      }
    }

    // 5. Gather target skill IDs from the learner's active role or defaults
    let targetSkillIds = [];
    if (activeGoal?.targetRole?.roleSkills?.length > 0) {
      targetSkillIds = activeGoal.targetRole.roleSkills.map(rs => rs.skillId);
    } else {
      const defaultSkills = await prisma.skill.findMany({
        where: { slug: { in: ['javascript', 'backend-dev', 'databases', 'system-design', 'ai-engineering', 'rest-apis', 'postgresql'] } }
      });
      targetSkillIds = defaultSkills.map(s => s.id);
    }

    // Load candidate concepts with prerequisites
    const candidateConcepts = await prisma.concept.findMany({
      where: {
        skillId: { in: targetSkillIds },
        status: 'ACTIVE'
      },
      include: {
        skill: true,
        prerequisites: {
          include: { prerequisiteConcept: true }
        },
        lessons: {
          where: { status: 'PUBLISHED' },
          take: 1
        }
      },
      orderBy: [
        { orderIndex: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Find the first unmastered candidate concept
    let nextCandidate = null;
    let missingPrereq = null;

    for (const concept of candidateConcepts) {
      const score = masteryMap.get(concept.id) || 0;
      if (score >= 70) {
        continue; // Already mastered
      }

      // Check if this candidate concept has unfulfilled prerequisites
      for (const p of concept.prerequisites) {
        const prereqScore = masteryMap.get(p.prerequisiteConceptId) || 0;
        if (prereqScore < 60) {
          nextCandidate = concept;
          missingPrereq = await prisma.concept.findUnique({
            where: { id: p.prerequisiteConceptId },
            include: {
              skill: true,
              lessons: { where: { status: 'PUBLISHED' }, take: 1 }
            }
          });
          break;
        }
      }

      if (missingPrereq) {
        break; // Found an unresolved prerequisite gap
      }

      // If all prerequisites are fulfilled and concept is unmastered, this is our ADVANCE candidate!
      nextCandidate = concept;
      break;
    }

    // CASE 4A: PREREQUISITE GAP DETECTED
    if (missingPrereq) {
      const lesson = missingPrereq.lessons?.[0] || null;
      if (lesson) {
        const reason = `Foundational prerequisite gap detected: ${nextCandidate.name} requires ${missingPrereq.name}. Building mastery in ${missingPrereq.name} first ensures steady progress.`;
        await this._logRecommendation(userId, 'PREREQUISITE', missingPrereq.id, lesson.id, reason, dailyMinutes);

        return {
          actionType: 'PREREQUISITE',
          concept: missingPrereq,
          lesson,
          reason,
          dailyMinutes
        };
      }
    }

    // CASE 4B: ADVANCE
    if (nextCandidate) {
      const lesson = nextCandidate.lessons?.[0] || null;
      if (lesson) {
        const roleName = activeGoal?.targetRole?.name || 'Software Engineer';
        const reason = `Prerequisites satisfied. Ready to advance to ${nextCandidate.name} to continue your path toward ${roleName}.`;
        await this._logRecommendation(userId, 'ADVANCE', nextCandidate.id, lesson.id, reason, dailyMinutes);

        return {
          actionType: 'ADVANCE',
          concept: nextCandidate,
          lesson,
          reason,
          dailyMinutes
        };
      } else {
        // Recoverable state when lesson content is pending publication (Never silently fall back to random lesson!)
        logger.warn(`Lesson content unavailable for candidate concept: ${nextCandidate.name} (${nextCandidate.id})`);
        return {
          actionType: 'CONTENT_UNAVAILABLE',
          concept: nextCandidate,
          lesson: null,
          reason: `Curriculum content for ${nextCandidate.name} is currently in editorial review. Please check back shortly.`,
          dailyMinutes
        };
      }
    }

    // Fallback: If all candidate concepts are mastered, pick the first concept for maintenance review
    const fallbackConcept = candidateConcepts.find(c => c.lessons?.length > 0) || candidateConcepts[0];
    const fallbackLesson = fallbackConcept?.lessons?.[0] || null;
    const reason = 'All current milestone concepts are mastered. Deepen and review your knowledge base.';

    await this._logRecommendation(userId, 'ADVANCE', fallbackConcept?.id, fallbackLesson?.id, reason, dailyMinutes);

    return {
      actionType: 'ADVANCE',
      concept: fallbackConcept,
      lesson: fallbackLesson,
      reason,
      dailyMinutes
    };
  }

  /**
   * Evaluates periodic checkpoints for Layer 2 (3-Session Mini-Analysis) and Layer 3 (5-Day / 10-Day Review)
   * Idempotent: Only triggers when evidence threshold is reached since the last recorded checkpoint.
   */
  static async evaluatePeriodicCheckpoints(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user || !user.profile) {
      return { triggered: false, reason: 'USER_NOT_FOUND' };
    }

    const completedSessionsCount = await prisma.learningSession.count({
      where: { userId, status: 'COMPLETED' }
    });

    // Compute distinct active calendar learning days
    const activities = await prisma.learningActivity.findMany({
      where: { userId },
      select: { createdAt: true }
    });

    const activeDaysSet = new Set(
      activities.map(a => a.createdAt.toISOString().slice(0, 10))
    );
    const activeDaysCount = activeDaysSet.size;

    const lastMini = user.profile.lastMiniAnalysisSessionCount || 0;
    const lastFull = user.profile.lastFullReviewActiveDays || 0;
    const lastLongTerm = user.profile.lastLongTermActiveDays || 0;

    let analysisType = null;
    let evidenceWindow = null;

    if (activeDaysCount - lastLongTerm >= 10) {
      analysisType = 'LONG_TERM';
      evidenceWindow = `active-days-${lastLongTerm + 1}-to-${activeDaysCount}`;
    } else if (activeDaysCount - lastFull >= 5) {
      analysisType = 'FULL';
      evidenceWindow = `active-days-${lastFull + 1}-to-${activeDaysCount}`;
    } else if (completedSessionsCount - lastMini >= 3) {
      analysisType = 'MINI';
      evidenceWindow = `sessions-${lastMini + 1}-to-${completedSessionsCount}`;
    }

    if (!analysisType) {
      return {
        triggered: false,
        completedSessionsCount,
        activeDaysCount,
        sessionsSinceLastMini: completedSessionsCount - lastMini,
        activeDaysSinceLastFull: activeDaysCount - lastFull
      };
    }

    logger.info(`Triggering Adaptive Review (${analysisType}) for user ${userId}. Window: ${evidenceWindow}`);

    // Fetch recent session evidence
    const sessionLimit = analysisType === 'MINI' ? 3 : 10;
    const recentSessions = await prisma.learningSession.findMany({
      where: { userId, status: 'COMPLETED' },
      include: {
        lesson: {
          include: {
            concept: true
          }
        }
      },
      orderBy: { completedAt: 'desc' },
      take: sessionLimit
    });

    // Fetch accumulated misconceptions
    const weakUserConcepts = await prisma.userConcept.findMany({
      where: {
        userId,
        attempts: { gt: 0 }
      },
      include: {
        concept: true
      }
    });

    const accumulatedMisconceptions = [];
    for (const uc of weakUserConcepts) {
      if (Array.isArray(uc.misconceptions) && uc.misconceptions.length > 0) {
        for (const m of uc.misconceptions) {
          accumulatedMisconceptions.push({
            conceptId: uc.conceptId,
            conceptName: uc.concept.name,
            misconception: m
          });
        }
      }
    }

    // Fetch recall schedule history
    const recallHistory = await prisma.recallSchedule.findMany({
      where: { userId },
      include: { concept: true },
      take: 5
    });

    // Fetch active learning path
    const activePath = await prisma.learningPath.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        items: {
          include: { concept: true },
          orderBy: { sequenceOrder: 'asc' }
        }
      }
    });

    // Request analysis proposal from AiService (Gemini with structured schema, or deterministic fallback)
    const analysisProposal = await AiService.analyzeLearningEvidence({
      analysisType,
      evidenceWindow,
      recentSessions,
      learnerProfile: {
        dailyMinutes: user.profile.dailyMinutes,
        experienceLevel: user.profile.experienceLevel
      },
      currentPath: activePath,
      accumulatedMisconceptions,
      recallHistory: recallHistory.map(r => ({
        conceptName: r.concept.name,
        predictedRecall: r.predictedRecall,
        intervalDays: r.intervalDays
      }))
    });

    // If proposed path revisions exist, validate and apply them
    let updatedPath = activePath;
    if (analysisProposal.proposedPathChanges?.length > 0) {
      updatedPath = await RoadmapService.validateAndApplyPathRevision(userId, {
        analysisType,
        proposedPathChanges: analysisProposal.proposedPathChanges,
        triggerReason: `PERIODIC_CHECKPOINT_${analysisType}`,
        evidenceSummary: analysisProposal,
        confidence: analysisProposal.confidence || 0.85
      });
    }

    // Update UserProfile checkpoint counters in database transaction
    await prisma.userProfile.update({
      where: { userId },
      data: {
        lastMiniAnalysisSessionCount: analysisType === 'MINI' ? completedSessionsCount : undefined,
        lastFullReviewActiveDays: (analysisType === 'FULL' || analysisType === 'LONG_TERM') ? activeDaysCount : undefined,
        lastLongTermActiveDays: analysisType === 'LONG_TERM' ? activeDaysCount : undefined
      }
    });

    return {
      triggered: true,
      analysisType,
      evidenceWindow,
      newPathVersion: updatedPath?.version || activePath?.version || 1,
      analysis: analysisProposal
    };
  }

  /**
   * Helper to persist explainable recommendation decisions to the database
   */
  static async _logRecommendation(userId, actionType, conceptId, lessonId, reason, dailyMinutes) {
    try {
      await prisma.recommendationLog.create({
        data: {
          userId,
          actionType,
          conceptId: conceptId || null,
          lessonId: lessonId || null,
          reason,
          dailyMinutes
        }
      });
    } catch (err) {
      logger.error(`Failed to log recommendation: ${err.message}`);
    }
  }

  /**
   * Computes the time-adapted stage configuration for a lesson
   * @param {number} dailyMinutes (5, 10, 15, or 20)
   */
  static getTimeAdaptedConfig(dailyMinutes = 15) {
    if (dailyMinutes <= 5) {
      return {
        dailyMinutes: 5,
        includedStages: [
          'CONCEPT_OVERVIEW',
          'EXPLAIN_SIMPLY',
          'VISUALIZATION',
          'QUIZ',
          'SUMMARY'
        ],
        maxQuizQuestions: 1,
        includePractical: false,
        includeExplainBack: false,
        pacingLabel: '5-Minute Express Session'
      };
    } else if (dailyMinutes <= 10) {
      return {
        dailyMinutes: 10,
        includedStages: [
          'CONCEPT_OVERVIEW',
          'EXPLAIN_SIMPLY',
          'VISUALIZATION',
          'SIMPLE_EXAMPLE',
          'REAL_PROJECT',
          'QUIZ',
          'SUMMARY'
        ],
        maxQuizQuestions: 2,
        includePractical: false,
        includeExplainBack: false,
        pacingLabel: '10-Minute Standard Session'
      };
    } else if (dailyMinutes <= 15) {
      return {
        dailyMinutes: 15,
        includedStages: [
          'CONCEPT_OVERVIEW',
          'EXPLAIN_SIMPLY',
          'VISUALIZATION',
          'SIMPLE_EXAMPLE',
          'REAL_PROJECT',
          'PRACTICAL_APPLICATION',
          'QUIZ',
          'SUMMARY'
        ],
        maxQuizQuestions: 2,
        includePractical: true,
        includeExplainBack: false,
        pacingLabel: '15-Minute Deep Session'
      };
    } else {
      return {
        dailyMinutes: 20,
        includedStages: [
          'CONCEPT_OVERVIEW',
          'EXPLAIN_SIMPLY',
          'VISUALIZATION',
          'SIMPLE_EXAMPLE',
          'REAL_PROJECT',
          'PRACTICAL_APPLICATION',
          'QUIZ',
          'EXPLAIN_BACK',
          'SUMMARY'
        ],
        maxQuizQuestions: 3,
        includePractical: true,
        includeExplainBack: true,
        pacingLabel: '20-Minute Mastery Session'
      };
    }
  }
}
