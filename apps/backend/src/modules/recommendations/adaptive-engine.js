import prisma from '../../config/prisma.js';
import { AiService } from '../ai/ai.service.js';
import { RoadmapService } from '../learning-paths/roadmap.service.js';
import { SessionGeneratorService } from '../lessons/session-generator.service.js';
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

    // 2. Load user concept mastery records
    const userConcepts = await prisma.userConcept.findMany({
      where: { userId }
    });
    const masteryMap = new Map();
    const userConceptMap = new Map();
    for (const uc of userConcepts) {
      masteryMap.set(uc.conceptId, uc.masteryScore);
      userConceptMap.set(uc.conceptId, uc);
    }

    const now = new Date();
    const experienceLevel = user?.profile?.experienceLevel || 'BEGINNER';
    const roleName = activeGoal?.targetRole?.name || 'Software Engineer';

    // 3. TARGET CONCEPT ID OVERRIDE (Explicit concept evaluation)
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
              const reason = `Foundational prerequisite gap detected: ${targetConcept.name} requires ${prereqConcept.name} (mastery < 60). Building mastery in ${prereqConcept.name} first ensures steady progress.`;
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

    // 4. ACTIVE LEARNING PATH PROGRESSION
    const activeRoadmap = await prisma.learningPath.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        items: {
          orderBy: { sequenceOrder: 'asc' },
          include: {
            concept: {
              include: {
                skill: true,
                prerequisites: {
                  include: {
                    prerequisiteConcept: {
                      include: {
                        skill: true,
                        lessons: { where: { status: 'PUBLISHED' }, take: 1 }
                      }
                    }
                  }
                },
                lessons: { where: { status: 'PUBLISHED' }, take: 1 }
              }
            }
          }
        }
      }
    });

    if (activeRoadmap && activeRoadmap.items?.length > 0) {
      const items = activeRoadmap.items;
      const isItemMastered = (item) => item.status === 'COMPLETED' || (masteryMap.get(item.conceptId) || 0) >= 70;
      const uncompletedItems = items.filter(it => !isItemMastered(it));

      // 4A. ALL MILESTONES COMPLETED (Terminal path completion state)
      if (uncompletedItems.length === 0) {
        // Check if any spaced repetition recall is due for long-term retention
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

        if (dueRecall?.concept?.lessons?.[0]) {
          const lesson = dueRecall.concept.lessons[0];
          const reason = `Spaced review is due for ${dueRecall.concept.name}. Active retrieval practice solidifies memory retention.`;
          await this._logRecommendation(userId, 'REVIEW', dueRecall.concept.id, lesson.id, reason, dailyMinutes);
          return {
            actionType: 'REVIEW',
            concept: dueRecall.concept,
            lesson,
            reason,
            dailyMinutes
          };
        }

        const reason = `Congratulations! You have successfully mastered every milestone in your personalized learning path for ${activeGoal?.title || 'Software Engineering'}.`;
        return {
          actionType: 'COMPLETED',
          isPathCompleted: true,
          concept: null,
          lesson: null,
          reason,
          dailyMinutes
        };
      }

      // 4B. EVALUATE CURRENT UNCOMPLETED MILESTONE
      const currentMilestone = uncompletedItems[0];
      const milestoneConcept = currentMilestone.concept;
      const userConceptRecord = userConceptMap.get(milestoneConcept.id);

      // Check if learner has recorded struggle / misconceptions on THIS uncompleted milestone
      const hasMisconceptions = Array.isArray(userConceptRecord?.misconceptions) && userConceptRecord.misconceptions.length > 0;
      const isFailedAttempt = userConceptRecord && userConceptRecord.attempts > 0 && (
        userConceptRecord.masteryScore < 60 ||
        userConceptRecord.correctAttempts === 0 ||
        userConceptRecord.lastActionType === 'REINFORCE'
      );

      const milestoneMeta = {
        title: currentMilestone.title || milestoneConcept.name,
        measurableObjective: currentMilestone.targetOutcome || milestoneConcept.description,
        difficulty: currentMilestone.metadata?.difficulty || milestoneConcept.difficulty,
        topicSlug: currentMilestone.metadata?.topicSlug || milestoneConcept.slug.replace(/^custom-[a-f0-9]+-/, ''),
        targetOutcome: currentMilestone.targetOutcome
      };

      // Repeated struggle with specific misconceptions triggers targeted REMEDIATE
      if (hasMisconceptions && userConceptRecord.attempts > 1) {
        // ACTION: REMEDIATE (Targeted remediation addressing identified misconceptions)
        const primaryMisconception = userConceptRecord.misconceptions[0];
        const reason = `Targeted remediation on ${milestoneConcept.name}: addressing identified misconception (${primaryMisconception}).`;

        let remediationLesson = null;
        try {
          remediationLesson = await SessionGeneratorService.getOrCreateSession({
            userId,
            conceptId: milestoneConcept.id,
            milestone: milestoneMeta,
            learnerProfile: {
              dailyMinutes,
              experienceLevel,
              targetGoal: activeGoal?.title || 'Software Engineering',
              targetRole: roleName
            },
            isRemediation: true,
            attempt: userConceptRecord.attempts || 1
          });
        } catch (err) {
          logger.warn(`Failed to generate remediation lesson: ${err.message}`);
        }

        if (remediationLesson) {
          await this._logRecommendation(userId, 'REMEDIATE', milestoneConcept.id, remediationLesson.id, reason, dailyMinutes);
          return {
            actionType: 'REMEDIATE',
            concept: milestoneConcept,
            lesson: remediationLesson,
            reason,
            dailyMinutes,
            misconceptions: userConceptRecord.misconceptions
          };
        }
      } else if (isFailedAttempt) {
        // ACTION: REINFORCE (General reinforcement on weak concept when no specific misconception or first failure)
        const reason = `Targeted reinforcement for ${milestoneConcept.name}. Recent practice indicated room for growth; solidifying this concept now prevents downstream confusion.`;

        let reinforceLesson = null;
        try {
          reinforceLesson = await SessionGeneratorService.getOrCreateSession({
            userId,
            conceptId: milestoneConcept.id,
            milestone: milestoneMeta,
            learnerProfile: {
              dailyMinutes,
              experienceLevel,
              targetGoal: activeGoal?.title || 'Software Engineering',
              targetRole: roleName
            },
            isRemediation: true,
            attempt: userConceptRecord.attempts || 1
          });
        } catch (err) {
          logger.warn(`Failed to generate reinforcement lesson: ${err.message}`);
        }

        if (!reinforceLesson) {
          reinforceLesson = milestoneConcept.lessons?.[0] || null;
        }

        if (reinforceLesson) {
          await this._logRecommendation(userId, 'REINFORCE', milestoneConcept.id, reinforceLesson.id, reason, dailyMinutes);
          return {
            actionType: 'REINFORCE',
            concept: milestoneConcept,
            lesson: reinforceLesson,
            reason,
            dailyMinutes
          };
        }
      }

      // Check if Spaced Repetition (REVIEW) is due before advancing
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

      if (dueRecall?.concept) {
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

      // 4C. EVALUATE PREREQUISITES FOR CURRENT MILESTONE
      // Requirement 5: A milestone cannot advance past unmet prerequisites. Prerequisite threshold = 60.
      for (const p of (milestoneConcept.prerequisites || [])) {
        const prereqScore = masteryMap.get(p.prerequisiteConceptId) || 0;
        const prereqItemInRoadmap = items.find(it => it.conceptId === p.prerequisiteConceptId);
        const isPrereqItemCompleted = prereqItemInRoadmap && prereqItemInRoadmap.status === 'COMPLETED';

        if (prereqScore < 60 && !isPrereqItemCompleted) {
          const prereqConcept = p.prerequisiteConcept;
          let prereqLesson = prereqConcept?.lessons?.[0] || null;
          if (!prereqLesson) {
            prereqLesson = await prisma.lesson.findFirst({
              where: {
                conceptId: prereqConcept.id,
                status: 'PUBLISHED',
                OR: [{ userId }, { userId: null }]
              },
              include: {
                concept: { include: { skill: true } },
                activities: { orderBy: { sequenceOrder: 'asc' } },
                quizzes: { where: { status: 'ACTIVE' }, include: { questions: true } }
              }
            });
          }
          if (!prereqLesson) {
            try {
              prereqLesson = await SessionGeneratorService.getOrCreateSession({
                userId,
                conceptId: prereqConcept.id,
                learnerProfile: {
                  dailyMinutes,
                  experienceLevel,
                  targetGoal: activeGoal?.title || 'Software Engineering',
                  targetRole: roleName
                }
              });
            } catch (err) {
              logger.warn(`Failed to generate prerequisite lesson: ${err.message}`);
            }
          }

          if (prereqLesson) {
            const reason = `Foundational prerequisite gap detected: ${milestoneConcept.name} requires ${prereqConcept.name} (mastery < 60). Building mastery in ${prereqConcept.name} first ensures steady progress.`;
            await this._logRecommendation(userId, 'PREREQUISITE', prereqConcept.id, prereqLesson.id, reason, dailyMinutes);
            return {
              actionType: 'PREREQUISITE',
              concept: prereqConcept,
              lesson: prereqLesson,
              reason,
              dailyMinutes
            };
          }
        }
      }

      // 4D. PREREQUISITES SATISFIED & NO ACTIVE STRUGGLE -> ADVANCE
      let advanceLesson = milestoneConcept.lessons?.[0] || null;
      if (!advanceLesson) {
        advanceLesson = await prisma.lesson.findFirst({
          where: {
            conceptId: milestoneConcept.id,
            status: 'PUBLISHED',
            OR: [{ userId }, { userId: null }]
          },
          include: {
            concept: { include: { skill: true } },
            activities: { orderBy: { sequenceOrder: 'asc' } },
            quizzes: { where: { status: 'ACTIVE' }, include: { questions: true } }
          }
        });
      }

      if (!advanceLesson) {
        logger.info(`Milestone ${milestoneConcept.name} has no published lesson. Synthesizing JIT session...`);
        try {
          advanceLesson = await SessionGeneratorService.getOrCreateSession({
            userId,
            conceptId: milestoneConcept.id,
            milestone: milestoneMeta,
            learnerProfile: {
              dailyMinutes,
              experienceLevel,
              targetGoal: activeGoal?.title || 'Software Engineering',
              targetRole: roleName
            }
          });
        } catch (genErr) {
          logger.error(`JIT session generation failed for ${milestoneConcept.name}: ${genErr.message}`);
        }
      }

      if (advanceLesson) {
        const reason = `Prerequisites satisfied. Next recommended milestone in your path toward ${roleName}: ${milestoneConcept.name}.`;
        await this._logRecommendation(userId, 'ADVANCE', milestoneConcept.id, advanceLesson.id, reason, dailyMinutes);
        return {
          actionType: 'ADVANCE',
          concept: milestoneConcept,
          lesson: advanceLesson,
          reason,
          dailyMinutes
        };
      } else {
        logger.warn(`Could not produce session for milestone ${milestoneConcept.name}`);
        return {
          actionType: 'CONTENT_UNAVAILABLE',
          concept: milestoneConcept,
          lesson: null,
          reason: `Curriculum content for ${milestoneConcept.name} is currently generating. Please refresh in a moment.`,
          dailyMinutes
        };
      }
    }

    // 5. When no active roadmap is constraining sequencing, evaluate Spaced Repetition (REVIEW)
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

    // 6. When no active roadmap exists, check for low mastery or misconceptions on recently attempted concepts (REINFORCE)
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
      let lesson = weakConceptRecord.concept.lessons?.[0] || null;
      if (!lesson) {
        lesson = await prisma.lesson.findFirst({
          where: {
            conceptId: weakConceptRecord.concept.id,
            status: 'PUBLISHED',
            OR: [{ userId }, { userId: null }]
          }
        });
      }

      if (!lesson) {
        try {
          lesson = await SessionGeneratorService.getOrCreateSession({
            userId,
            conceptId: weakConceptRecord.concept.id,
            learnerProfile: {
              dailyMinutes,
              experienceLevel,
              targetGoal: activeGoal?.title || 'Software Engineering',
              targetRole: roleName
            },
            isRemediation: true,
            attempt: weakConceptRecord.attempts || 1
          });
        } catch (err) {
          logger.warn(`Failed to generate weak concept lesson: ${err.message}`);
        }
      }

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

    // 7. Gather target skill IDs from the learner's active role or all active skills
    let targetSkillIds = [];
    if (activeGoal?.targetRole?.roleSkills?.length > 0) {
      targetSkillIds = activeGoal.targetRole.roleSkills.map(rs => rs.skillId);
    } else {
      const allSkills = await prisma.skill.findMany({
        select: { id: true }
      });
      targetSkillIds = allSkills.map(s => s.id);
    }

    // Load candidate concepts with prerequisites (scoped to learner's custom concepts or shared reference concepts)
    const candidateConcepts = await prisma.concept.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          // Custom concepts created for this learner (unrestricted by skillId)
          { isCustom: true, userId },
          // Reference concepts matching target skills (or all reference concepts if no skill restrictions)
          ...(targetSkillIds.length > 0
            ? [{ isCustom: false, skillId: { in: targetSkillIds } }]
            : [{ isCustom: false }])
        ]
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
      let lesson = missingPrereq.lessons?.[0] || null;
      if (!lesson) {
        lesson = await prisma.lesson.findFirst({
          where: {
            conceptId: missingPrereq.id,
            status: 'PUBLISHED',
            OR: [{ userId }, { userId: null }]
          },
          include: {
            concept: { include: { skill: true } },
            activities: { orderBy: { sequenceOrder: 'asc' } },
            quizzes: { where: { status: 'ACTIVE' }, include: { questions: true } }
          }
        });
      }

      if (!lesson) {
        try {
          lesson = await SessionGeneratorService.getOrCreateSession({
            userId,
            conceptId: missingPrereq.id,
            learnerProfile: {
              dailyMinutes,
              experienceLevel: user?.profile?.experienceLevel || 'BEGINNER',
              targetGoal: activeGoal?.title || 'Software Engineering',
              targetRole: activeGoal?.targetRole?.name || 'Software Engineer'
            }
          });
        } catch (err) {
          logger.warn(`Failed to generate candidate prerequisite lesson for ${missingPrereq.name}: ${err.message}`);
        }
      }

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
      let lesson = nextCandidate.lessons?.[0] || null;
      if (!lesson) {
        lesson = await prisma.lesson.findFirst({
          where: {
            conceptId: nextCandidate.id,
            status: 'PUBLISHED',
            OR: [{ userId }, { userId: null }]
          },
          include: {
            concept: { include: { skill: true } },
            activities: { orderBy: { sequenceOrder: 'asc' } },
            quizzes: { where: { status: 'ACTIVE' }, include: { questions: true } }
          }
        });
      }

      if (!lesson) {
        logger.info(`Candidate concept ${nextCandidate.name} has no published lesson. Synthesizing JIT session...`);
        try {
          lesson = await SessionGeneratorService.getOrCreateSession({
            userId,
            conceptId: nextCandidate.id,
            learnerProfile: {
              dailyMinutes,
              experienceLevel: user?.profile?.experienceLevel || 'BEGINNER',
              targetGoal: activeGoal?.title || 'Software Engineering',
              targetRole: activeGoal?.targetRole?.name || 'Software Engineer'
            }
          });
        } catch (err) {
          logger.warn(`Failed to generate candidate lesson for ${nextCandidate.name}: ${err.message}`);
        }
      }

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
