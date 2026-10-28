import prisma from '../../config/prisma.js';
import { AiService } from '../ai/ai.service.js';
import { logger } from '../../utils/logger.js';

export class RoadmapService {
  /**
   * Generates or regenerates an explainable personalized roadmap for a user
   * Integrates Gemini AI pedagogical sequencing with deterministic fallback & DAG validation
   */
  static async generateRoadmap(userId) {
    // 1. Fetch user's profile, active goal, and target role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
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
    let targetSkillIds = [];

    if (activeGoal?.targetRole?.roleSkills?.length > 0) {
      targetSkillIds = activeGoal.targetRole.roleSkills.map(rs => rs.skillId);
    } else {
      // Default to core foundational skills
      const defaultSkills = await prisma.skill.findMany({
        where: {
          slug: { in: ['javascript', 'nodejs', 'rest-apis', 'postgresql', 'redis', 'system-design'] }
        }
      });
      targetSkillIds = defaultSkills.map(s => s.id);
    }

    // 2. Load all concepts for these target skills with their prerequisites and published lessons
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
        { skill: { difficulty: 'asc' } },
        { orderIndex: 'asc' }
      ]
    });

    if (candidateConcepts.length === 0) {
      throw new Error('No candidate concepts found for target skills');
    }

    // 3. Load user's current mastery for these concepts
    const userConcepts = await prisma.userConcept.findMany({
      where: { userId }
    });
    const masteryMap = new Map();
    for (const uc of userConcepts) {
      masteryMap.set(uc.conceptId, uc.masteryScore);
    }

    // Fetch known skills from userSkills or onboarding choices
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true }
    });
    const knownSkillSlugs = userSkills.map(us => us.skill.slug);

    // 4. Compute valid deterministic topological sort as baseline candidate path
    const deterministicOrderedIds = this._topologicalSort(
      candidateConcepts,
      masteryMap,
      user?.profile?.experienceLevel || 'BEGINNER',
      knownSkillSlugs
    );

    // 5. Query Gemini for pedagogical ordering and learning approach
    let finalOrderedIds = deterministicOrderedIds;
    let aiProposal = null;
    let analysisType = 'INITIAL';
    let triggerReason = 'ONBOARDING_INITIAL_PATH';
    let evidenceSummary = { source: 'deterministic_topological_sort' };
    let confidence = 1.0;

    if (AiService.isRealProviderConfigured()) {
      try {
        const targetOutcome = activeGoal?.targetRole?.name
          ? `Become job-ready as a ${activeGoal.targetRole.name}`
          : 'Software Engineering Competency';

        aiProposal = await AiService.generateInitialPath({
          learnerProfile: {
            experienceLevel: user?.profile?.experienceLevel || 'BEGINNER',
            dailyMinutes: user?.profile?.dailyMinutes || 15,
            knownSkills: knownSkillSlugs
          },
          candidateConcepts,
          targetOutcome
        });

        if (aiProposal && Array.isArray(aiProposal.orderedConceptIds) && aiProposal.orderedConceptIds.length > 0) {
          const isValid = this._validateConceptSequence(aiProposal.orderedConceptIds, candidateConcepts, masteryMap);
          if (isValid) {
            finalOrderedIds = aiProposal.orderedConceptIds;
            evidenceSummary = {
              source: 'gemini_pedagogical_planner',
              learningApproach: aiProposal.learningApproach,
              recommendedPacing: aiProposal.recommendedPacing,
              pedagogicalNotes: aiProposal.pedagogicalNotes
            };
            confidence = Number(aiProposal.confidence) || 0.85;
          } else {
            logger.warn('Gemini initial path failed DAG/concept validation; falling back safely to deterministic sort.');
            evidenceSummary = {
              source: 'deterministic_fallback_after_invalid_ai_proposal',
              originalConfidence: aiProposal.confidence
            };
          }
        }
      } catch (err) {
        logger.warn(`Gemini path generation error: ${err.message}. Using deterministic sort.`);
      }
    }

    // Build map for quick concept lookup
    const conceptById = new Map();
    for (const c of candidateConcepts) {
      conceptById.set(c.id, c);
    }

    // 6. Build explainable items with reasons
    const roadmapItemsData = finalOrderedIds.map((conceptId, index) => {
      const concept = conceptById.get(conceptId);
      if (!concept) return null;

      const mastery = masteryMap.get(conceptId) || 0;
      let status = 'PENDING';
      let reason = `Required for ${concept.skill.name}`;

      if (mastery >= 70) {
        status = 'COMPLETED';
        reason = `Mastered (${mastery}% score). Available for periodic recall.`;
      } else if (index === 0 || (index > 0 && finalOrderedIds.slice(0, index).every(prevId => (masteryMap.get(prevId) || 0) >= 60))) {
        status = 'IN_PROGRESS';
        reason = `Next recommended milestone in your ${concept.skill.name} journey.`;
      } else {
        status = 'PENDING';
        if (concept.prerequisites.length > 0) {
          const prereqNames = concept.prerequisites.map(p => p.prerequisiteConcept.name).join(', ');
          reason = `Builds upon: ${prereqNames}.`;
        } else {
          reason = `Foundational concept for ${activeGoal?.targetRole?.name || 'Software Engineering'}.`;
        }
      }

      // Check if Gemini had a pedagogical note for this concept
      const note = aiProposal?.pedagogicalNotes?.find(n => n.conceptId === conceptId);
      if (note && status !== 'COMPLETED') {
        reason = `${reason} (Pedagogy: ${note.reason})`;
      }

      return {
        conceptId,
        sequenceOrder: index + 1,
        status,
        reason,
        completedAt: mastery >= 70 ? new Date() : null
      };
    }).filter(Boolean);

    // 7. Persist LearningPath in PostgreSQL transaction with versioning
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
          title: activeGoal ? `${activeGoal.title} Roadmap` : 'Software Engineering Roadmap',
          status: 'ACTIVE',
          version: nextVersion,
          previousPathId: latestPath?.id || null,
          analysisType,
          triggerReason,
          evidenceSummary,
          confidence,
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
                  lessons: { take: 1 }
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
