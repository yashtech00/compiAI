import prisma from '../../config/prisma.js';
import { AiService } from '../ai/ai.service.js';
import { logger } from '../../utils/logger.js';
import { PathSynthesisService } from './path-synthesis.service.js';

// In-flight generation lock to prevent concurrent races creating duplicate active paths
const inFlightGenerations = new Map();

export class RoadmapService {
  /**
   * Generates or regenerates an individualized, explainable personalized roadmap for a user
   * Integrates Gemini AI personalized path synthesis with DAG cycle validation & goal-adaptive fallback
   */
  static async generateRoadmap(userId, options = {}) {
    // 0. Idempotency check: If user already has an active roadmap and force regeneration was not requested, return it
    if (!options.force) {
      const existingPath = await prisma.learningPath.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: {
          items: {
            include: {
              concept: {
                include: {
                  skill: true,
                  lessons: { where: { status: 'PUBLISHED' }, take: 1 }
                }
              }
            },
            orderBy: { sequenceOrder: 'asc' }
          }
        }
      });
      if (existingPath && existingPath.items?.length > 0) {
        return existingPath;
      }
    }

    // 1. Guard against concurrent generation requests for the same user
    const lockKey = `${userId}:${options.force ? 'force' : 'default'}`;
    if (inFlightGenerations.has(lockKey)) {
      return inFlightGenerations.get(lockKey);
    }

    const task = this._executeGenerateRoadmap(userId, options);
    inFlightGenerations.set(lockKey, task);
    try {
      return await task;
    } finally {
      inFlightGenerations.delete(lockKey);
    }
  }

  static async _executeGenerateRoadmap(userId, options = {}) {
    // 1. Fetch user's profile, active goal, userSkills, and userConcepts
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        userSkills: { include: { skill: true } },
        userConcepts: true,
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
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const activeGoal = user?.learningGoals?.[0] || null;
    const goalTitle = activeGoal?.title || 'Software Engineering Competency';
    const targetRole = activeGoal?.targetRole?.name || 'Software Engineer';
    const experienceLevel = user?.profile?.experienceLevel || 'BEGINNER';
    const dailyMinutes = user?.profile?.dailyMinutes || 15;
    const knownSkillSlugs = user?.userSkills?.map(us => us.skill.slug) || [];

    const masteryMap = new Map();
    for (const uc of (user?.userConcepts || [])) {
      masteryMap.set(uc.conceptId, uc.masteryScore);
    }

    // Capture previous active path to evaluate safe milestone completion inheritance and failure fallback
    const previousActivePath = await prisma.learningPath.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { items: true }
    });
    const previousItems = previousActivePath?.items || [];

    // 2. Synthesize personalized learning path using AI / goal-adaptive synthesizer with error protection
    let synthesized;
    try {
      synthesized = await PathSynthesisService.synthesizePersonalizedPath({
        goalTitle,
        targetRole,
        experienceLevel,
        dailyMinutes,
        knownSkills: knownSkillSlugs,
        existingMastery: Object.fromEntries(masteryMap)
      });
    } catch (err) {
      logger.error(`Personalized path synthesis error for user ${userId}: ${err.message}`);
      // Preserve existing active path intact
      if (previousActivePath) {
        logger.warn(`Preserving existing active path (version ${previousActivePath.version}) intact due to synthesis failure.`);
        throw new Error(`Path synthesis failed: ${err.message}. Your existing active path has been preserved.`);
      }
      throw err;
    }

    // 3. Resolve or create concepts for all milestones
    const milestoneConcepts = [];
    for (const milestone of synthesized.milestones) {
      const customSlug = `custom-${userId.slice(0, 8)}-${milestone.topicSlug}`;
      let concept = await prisma.concept.findFirst({
        where: {
          OR: [
            { slug: milestone.topicSlug },
            { slug: customSlug }
          ]
        },
        include: {
          skill: true,
          prerequisites: { include: { prerequisiteConcept: true } },
          lessons: { where: { status: 'PUBLISHED' }, take: 1 }
        }
      });

      if (!concept) {
        // Try finding matching skill
        const matchedSkill = await prisma.skill.findFirst({
          where: {
            OR: [
              { slug: milestone.domainSkillSlug },
              { slug: 'fundamentals' },
              { category: 'BACKEND' }
            ]
          }
        });

        concept = await prisma.concept.create({
          data: {
            userId,
            isCustom: true,
            skillId: matchedSkill?.id || null,
            name: milestone.title,
            slug: customSlug,
            description: milestone.measurableObjective,
            difficulty: milestone.difficulty,
            status: 'ACTIVE'
          },
          include: {
            skill: true,
            prerequisites: { include: { prerequisiteConcept: true } },
            lessons: { where: { status: 'PUBLISHED' }, take: 1 }
          }
        });
      }

      milestoneConcepts.push({ milestone, concept });
    }

    // 4. Link concept prerequisites if specified
    for (const { milestone, concept } of milestoneConcepts) {
      if (milestone.prerequisiteTopicSlugs?.length > 0) {
        for (const prereqSlug of milestone.prerequisiteTopicSlugs) {
          const prereqItem = milestoneConcepts.find(mc => mc.milestone.topicSlug === prereqSlug);
          if (prereqItem && prereqItem.concept.id !== concept.id) {
            await prisma.conceptPrerequisite.upsert({
              where: {
                conceptId_prerequisiteConceptId: {
                  conceptId: concept.id,
                  prerequisiteConceptId: prereqItem.concept.id
                }
              },
              update: {},
              create: {
                conceptId: concept.id,
                prerequisiteConceptId: prereqItem.concept.id,
                strength: 1
              }
            }).catch(() => null);
          }
        }
      }
    }

    // 5. Build explainable roadmap items with safe completion inheritance
    // Requirement 5: Existing completed work is reused ONLY when the objective and completion criteria are genuinely equivalent.
    // Changed prerequisites or objectives do NOT inherit completion.
    const roadmapItemsData = [];
    for (let index = 0; index < milestoneConcepts.length; index++) {
      const { milestone, concept } = milestoneConcepts[index];
      const mastery = masteryMap.get(concept.id) || 0;

      // Find previous item matching this concept or milestoneId
      const prevMatchingItem = previousItems.find(pi =>
        (pi.conceptId === concept.id || pi.milestoneId === milestone.topicSlug) &&
        pi.status === 'COMPLETED'
      );

      let isLegitimatelyCompleted = false;
      let completedDate = null;

      if (prevMatchingItem) {
        const prevObjective = prevMatchingItem.targetOutcome?.trim().toLowerCase();
        const newObjective = milestone.measurableObjective?.trim().toLowerCase();
        // Strict equivalence: only inherit if measurable objective matches
        if (prevObjective && newObjective && prevObjective === newObjective) {
          isLegitimatelyCompleted = true;
          completedDate = prevMatchingItem.completedAt || new Date();
        } else {
          logger.info(`Milestone "${milestone.title}" objective changed. Completion status not inherited.`);
        }
      }

      if (mastery >= 70) {
        isLegitimatelyCompleted = true;
        completedDate = completedDate || new Date();
      }

      let status = 'PENDING';
      let reason = milestone.whyThisMatters || `Required for ${milestone.title}`;

      if (isLegitimatelyCompleted) {
        status = 'COMPLETED';
        reason = prevMatchingItem && mastery < 70
          ? `Milestone objective verified as completed in prior path revision.`
          : `Mastered (${mastery}% score). Available for periodic recall.`;
      } else {
        // If all preceding items are completed, this is the current active milestone
        const allPriorCompleted = index === 0 || roadmapItemsData.every(prev => prev.status === 'COMPLETED');
        if (allPriorCompleted) {
          status = 'IN_PROGRESS';
          reason = `Next recommended milestone in your ${milestone.title} journey. ${milestone.measurableObjective}`;
        } else {
          status = 'PENDING';
          if (milestone.prerequisiteTopicSlugs?.length > 0) {
            reason = `Builds upon: ${milestone.prerequisiteTopicSlugs.join(', ')}.`;
          } else {
            reason = `Foundational milestone for ${goalTitle}.`;
          }
        }
      }

      roadmapItemsData.push({
        conceptId: concept.id,
        milestoneId: milestone.topicSlug,
        title: milestone.title,
        targetOutcome: milestone.measurableObjective,
        estimatedMinutes: (milestone.estimatedSessions || 1) * dailyMinutes,
        metadata: {
          domainSkillSlug: milestone.domainSkillSlug,
          difficulty: milestone.difficulty,
          estimatedSessions: milestone.estimatedSessions,
          prerequisiteTopicSlugs: milestone.prerequisiteTopicSlugs,
          whyThisMatters: milestone.whyThisMatters
        },
        sequenceOrder: index + 1,
        status,
        reason,
        completedAt: completedDate
      });
    }

    // 6. Persist LearningPath in PostgreSQL transaction with versioning
    const roadmap = await prisma.$transaction(async (tx) => {
      // Find latest path to determine next version
      const latestPath = await tx.learningPath.findFirst({
        where: { userId },
        orderBy: { version: 'desc' }
      });

      const nextVersion = (latestPath?.version || 0) + 1;

      // Deactivate existing paths
      await tx.learningPath.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'SUPERSEDED' }
      });

      const completedCount = roadmapItemsData.filter(i => i.status === 'COMPLETED').length;
      const completionPercentage = roadmapItemsData.length > 0
        ? Math.round((completedCount / roadmapItemsData.length) * 100)
        : 0;

      const newPath = await tx.learningPath.create({
        data: {
          userId,
          learningGoalId: activeGoal?.id || null,
          title: synthesized.pathTitle || `${goalTitle} Path`,
          targetGoal: goalTitle,
          pedagogicalApproach: synthesized.pedagogicalApproach,
          status: 'ACTIVE',
          version: nextVersion,
          previousPathId: latestPath?.id || null,
          analysisType: 'INITIAL_AI_SYNTHESIS',
          triggerReason: 'ONBOARDING_PERSONALIZED_PATH',
          evidenceSummary: {
            source: synthesized.source,
            model: synthesized.model,
            estimatedTotalWeeks: synthesized.estimatedTotalWeeks,
            pedagogicalApproach: synthesized.pedagogicalApproach
          },
          confidence: 0.95,
          completionPercentage,
          items: {
            create: roadmapItemsData
          }
        },
        include: {
          items: {
            include: {
              concept: {
                include: {
                  skill: true,
                  lessons: { where: { status: 'PUBLISHED' }, take: 1 }
                }
              }
            },
            orderBy: { sequenceOrder: 'asc' }
          }
        }
      });

      return newPath;
    });

    return roadmap;
  }

  /**
   * Retrieves the user's active roadmap, generating one if none exists
   */
  static async getCurrentRoadmap(userId) {
    let roadmap = await prisma.learningPath.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        items: {
          include: {
            concept: {
              include: {
                skill: true,
                lessons: {
                  select: { id: true, title: true, slug: true, estimatedMinutes: true },
                  take: 1
                }
              }
            }
          },
          orderBy: { sequenceOrder: 'asc' }
        }
      }
    });

    if (!roadmap || roadmap.items.length === 0) {
      roadmap = await this.generateRoadmap(userId);
    }

    return roadmap;
  }

  /**
   * Validates and applies an AI or adaptive proposed path revision idempotently
   */
  static async validateAndApplyPathRevision(userId, {
    analysisType, // 'MINI' | 'FULL' | 'LONG_TERM'
    proposedPathChanges,
    triggerReason,
    evidenceSummary,
    confidence = 0.8
  }) {
    const activePath = await prisma.learningPath.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        items: {
          include: {
            concept: {
              include: {
                prerequisites: true,
                lessons: { where: { status: 'PUBLISHED' }, take: 1 }
              }
            }
          },
          orderBy: { sequenceOrder: 'asc' }
        }
      }
    });

    if (!activePath || !proposedPathChanges || proposedPathChanges.length === 0) {
      return activePath; // No changes to apply
    }

    // Build current sequence
    let currentSequence = activePath.items.map(item => item.conceptId);
    const conceptMap = new Map();
    for (const item of activePath.items) {
      conceptMap.set(item.conceptId, item.concept);
    }

    // Attempt to apply proposed changes
    let modified = false;
    for (const change of proposedPathChanges) {
      const { conceptId, action, targetPosition } = change;
      if (!conceptId || !conceptMap.has(conceptId)) {
        logger.warn(`Skipping path change: unknown conceptId ${conceptId}`);
        continue;
      }

      if (action === 'REORDER' && typeof targetPosition === 'number') {
        const fromIdx = currentSequence.indexOf(conceptId);
        if (fromIdx !== -1) {
          currentSequence.splice(fromIdx, 1);
          const toIdx = Math.max(0, Math.min(currentSequence.length, targetPosition - 1));
          currentSequence.splice(toIdx, 0, conceptId);
          modified = true;
        }
      } else if (action === 'INSERT_REMEDIATION') {
        // Place remediation concept directly before the first in-progress/unmastered item
        const firstUncompletedIdx = activePath.items.findIndex(i => i.status !== 'COMPLETED');
        if (firstUncompletedIdx !== -1 && !currentSequence.slice(0, firstUncompletedIdx).includes(conceptId)) {
          const fromIdx = currentSequence.indexOf(conceptId);
          if (fromIdx !== -1) currentSequence.splice(fromIdx, 1);
          currentSequence.splice(firstUncompletedIdx, 0, conceptId);
          modified = true;
        }
      }
    }

    if (!modified) {
      return activePath;
    }

    // Validate that modified sequence does not violate DAG prerequisites
    const candidateList = Array.from(conceptMap.values());
    const userConcepts = await prisma.userConcept.findMany({ where: { userId } });
    const masteryMap = new Map(userConcepts.map(uc => [uc.conceptId, uc.masteryScore]));

    const isValid = this._validateConceptSequence(currentSequence, candidateList, masteryMap);
    if (!isValid) {
      logger.warn('Proposed path revision violated prerequisite DAG constraints. Retaining current active path.');
      return activePath;
    }

    // Apply validated path revision in transaction
    const newVersion = activePath.version + 1;
    const updatedPath = await prisma.$transaction(async (tx) => {
      await tx.learningPath.update({
        where: { id: activePath.id },
        data: { status: 'SUPERSEDED' }
      });

      const newItemsData = currentSequence.map((conceptId, idx) => {
        const existingItem = activePath.items.find(i => i.conceptId === conceptId);
        const mastery = masteryMap.get(conceptId) || 0;
        return {
          conceptId,
          sequenceOrder: idx + 1,
          status: existingItem?.status || (mastery >= 70 ? 'COMPLETED' : 'PENDING'),
          reason: existingItem?.reason || 'Adaptive revision milestone',
          completedAt: existingItem?.completedAt || (mastery >= 70 ? new Date() : null)
        };
      });

      const created = await tx.learningPath.create({
        data: {
          userId,
          learningGoalId: activePath.learningGoalId,
          title: activePath.title,
          status: 'ACTIVE',
          version: newVersion,
          previousPathId: activePath.id,
          analysisType,
          triggerReason,
          evidenceSummary,
          confidence,
          completionPercentage: activePath.completionPercentage,
          items: {
            create: newItemsData
          }
        },
        include: {
          items: {
            include: {
              concept: {
                include: {
                  skill: true,
                  lessons: { take: 1 }
                }
              }
            },
            orderBy: { sequenceOrder: 'asc' }
          }
        }
      });

      return created;
    });

    return updatedPath;
  }

  /**
   * Topological sort for candidate concepts based on prerequisite graph and current mastery.
   * Calibrates unblocked concept sequencing according to learner experience level.
   */
  static _topologicalSort(candidateConcepts, masteryMap, experienceLevel = 'BEGINNER', knownSkillSlugs = []) {
    const inDegree = new Map();
    const prereqMap = new Map();
    const conceptById = new Map();

    for (const c of candidateConcepts) {
      conceptById.set(c.id, c);
      prereqMap.set(c.id, new Set());
      let unfulfilledPrereqs = 0;

      for (const p of c.prerequisites) {
        const prereqMastery = masteryMap.get(p.prerequisiteConceptId) || 0;
        if (prereqMastery < 70) {
          prereqMap.get(c.id).add(p.prerequisiteConceptId);
          unfulfilledPrereqs++;
        }
      }
      inDegree.set(c.id, unfulfilledPrereqs);
    }

    // Sort ready concepts based on experience level
    const sortReady = (ids) => {
      return [...ids].sort((idA, idB) => {
        const cA = conceptById.get(idA);
        const cB = conceptById.get(idB);
        if (!cA || !cB) return 0;

        if (experienceLevel === 'ADVANCED' || experienceLevel === 'INTERMEDIATE') {
          // For experienced learners, prioritize unblocked concepts in target architecture & advanced skills
          const diffA = cA.skill?.difficulty || 1;
          const diffB = cB.skill?.difficulty || 1;
          if (diffB !== diffA) return diffB - diffA;
        }

        // For beginner learners: prioritize foundational difficulty 1 first, then orderIndex
        const diffA = cA.skill?.difficulty || 1;
        const diffB = cB.skill?.difficulty || 1;
        if (diffA !== diffB) return diffA - diffB;
        return (cA.orderIndex || 0) - (cB.orderIndex || 0);
      });
    };

    let queue = sortReady(
      Array.from(inDegree.entries()).filter(([_, deg]) => deg === 0).map(([id]) => id)
    );

    const orderedConceptIds = [];
    while (queue.length > 0) {
      const currentId = queue.shift();
      orderedConceptIds.push(currentId);

      const newlyReady = [];
      for (const [candidateId, prereqs] of prereqMap.entries()) {
        if (prereqs.has(currentId)) {
          prereqs.delete(currentId);
          const newDeg = inDegree.get(candidateId) - 1;
          inDegree.set(candidateId, newDeg);
          if (newDeg === 0 && !orderedConceptIds.includes(candidateId) && !queue.includes(candidateId)) {
            newlyReady.push(candidateId);
          }
        }
      }

      if (newlyReady.length > 0) {
        queue = sortReady([...queue, ...newlyReady]);
      }
    }

    // Append any unvisited concepts
    for (const c of candidateConcepts) {
      if (!orderedConceptIds.includes(c.id)) {
        orderedConceptIds.push(c.id);
      }
    }

    return orderedConceptIds;
  }

  /**
   * Validates that a sequence of concept IDs satisfies:
   * 1. All IDs exist in candidate concepts.
   * 2. No duplicate IDs.
   * 3. Prerequisite ordering: for any concept, its unmastered prerequisites must appear earlier in the list.
   */
  static _validateConceptSequence(sequence, candidateConcepts, masteryMap) {
    if (!Array.isArray(sequence) || sequence.length === 0) return false;

    const candidateMap = new Map(candidateConcepts.map(c => [c.id, c]));
    const seen = new Set();

    for (const id of sequence) {
      if (!candidateMap.has(id)) return false; // Unknown concept ID
      if (seen.has(id)) return false; // Duplicate concept ID
      seen.add(id);
    }

    // Verify prerequisite order
    const positionMap = new Map(sequence.map((id, idx) => [id, idx]));
    for (const id of sequence) {
      const concept = candidateMap.get(id);
      const currentPos = positionMap.get(id);

      for (const p of concept.prerequisites) {
        const prereqId = p.prerequisiteConceptId;
        const prereqMastery = masteryMap.get(prereqId) || 0;

        // If prerequisite is not mastered yet, it must be present before current concept in sequence
        if (prereqMastery < 70 && candidateMap.has(prereqId)) {
          const prereqPos = positionMap.get(prereqId);
          if (prereqPos === undefined || prereqPos > currentPos) {
            return false; // Prerequisite constraint violated!
          }
        }
      }
    }

    return true;
  }
}
