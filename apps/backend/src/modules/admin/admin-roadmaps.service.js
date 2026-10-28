import prisma from '../../config/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';

export class AdminRoadmapsService {
  /**
   * Retrieves all immutable roadmap versions for a student
   */
  static async getStudentRoadmapHistory(studentId) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, email: true, profile: { select: { displayName: true } } }
    });

    if (!student) {
      throw new AppError('Student not found', 404, 'NOT_FOUND');
    }

    // 1. Fetch versions from RoadmapVersion table
    const storedVersions = await prisma.roadmapVersion.findMany({
      where: { userId: studentId },
      orderBy: { versionNumber: 'desc' }
    });

    // 2. Fetch all LearningPaths to ensure complete coverage
    const learningPaths = await prisma.learningPath.findMany({
      where: { userId: studentId },
      include: {
        items: {
          include: { concept: { include: { skill: true } } },
          orderBy: { sequenceOrder: 'asc' }
        }
      },
      orderBy: { version: 'desc' }
    });

    // Merge & format versions
    const versions = learningPaths.map((lp) => {
      const stored = storedVersions.find(v => v.learningPathId === lp.id || v.versionNumber === lp.version);
      const snapshot = stored?.snapshot || {
        id: lp.id,
        title: lp.title,
        targetGoal: lp.targetGoal,
        pedagogicalApproach: lp.pedagogicalApproach,
        status: lp.status,
        version: lp.version,
        items: lp.items.map(i => ({
          id: i.id,
          conceptId: i.conceptId,
          conceptName: i.concept?.name || i.title,
          milestoneId: i.milestoneId,
          title: i.title,
          targetOutcome: i.targetOutcome,
          difficulty: i.metadata?.difficulty || 'BEGINNER',
          sequenceOrder: i.sequenceOrder,
          status: i.status,
          reason: i.reason,
          completedAt: i.completedAt
        }))
      };

      return {
        id: lp.id,
        versionNumber: lp.version,
        status: lp.status,
        title: lp.title,
        targetGoal: lp.targetGoal || 'Software Engineering Competency',
        pedagogicalApproach: lp.pedagogicalApproach,
        completionPercentage: lp.completionPercentage,
        triggerSource: lp.analysisType || stored?.triggerSource || (lp.version === 1 ? 'INITIAL_ONBOARDING' : 'ADAPTIVE_PROGRESSION'),
        changeReason: lp.triggerReason || stored?.changeReason || (lp.version === 1 ? 'Initial personalized path generation' : 'Adaptive pathway revision'),
        createdAt: lp.createdAt,
        updatedAt: lp.updatedAt,
        itemCount: lp.items.length,
        items: snapshot.items || lp.items,
        structuredDiff: stored?.structuredDiff || null,
        modelMetadata: stored?.modelMetadata || lp.evidenceSummary || null
      };
    });

    return {
      student,
      totalVersions: versions.length,
      currentVersion: versions.find(v => v.status === 'ACTIVE') || versions[0] || null,
      versions
    };
  }

  /**
   * Compares two roadmap versions side-by-side with exact mathematical diff
   */
  static async compareVersions(studentId, versionNumA, versionNumB) {
    const history = await this.getStudentRoadmapHistory(studentId);
    const verA = history.versions.find(v => v.versionNumber === Number(versionNumA));
    const verB = history.versions.find(v => v.versionNumber === Number(versionNumB));

    if (!verA || !verB) {
      throw new AppError(`Could not find roadmap versions ${versionNumA} and ${versionNumB} for student`, 404, 'NOT_FOUND');
    }

    const itemsA = verA.items || [];
    const itemsB = verB.items || [];

    // Map concepts / milestones
    const mapA = new Map(itemsA.map((item, idx) => [item.conceptId || item.milestoneId || item.title, { ...item, index: idx + 1 }]));
    const mapB = new Map(itemsB.map((item, idx) => [item.conceptId || item.milestoneId || item.title, { ...item, index: idx + 1 }]));

    const addedTopics = [];
    const removedTopics = [];
    const reorderedTopics = [];
    const difficultyChanges = [];
    const unchangedTopics = [];

    // Analyze B relative to A
    for (const [key, itemB] of mapB.entries()) {
      if (!mapA.has(key)) {
        addedTopics.push({
          title: itemB.title || itemB.conceptName,
          targetOutcome: itemB.targetOutcome,
          newPosition: itemB.sequenceOrder,
          difficulty: itemB.difficulty || itemB.metadata?.difficulty || 'BEGINNER',
          reason: itemB.reason
        });
      } else {
        const itemA = mapA.get(key);
        const posChanged = itemA.sequenceOrder !== itemB.sequenceOrder;
        const diffA = itemA.difficulty || itemA.metadata?.difficulty;
        const diffB = itemB.difficulty || itemB.metadata?.difficulty;
        const diffChanged = diffA && diffB && diffA !== diffB;

        if (posChanged) {
          reorderedTopics.push({
            title: itemB.title || itemB.conceptName,
            oldPosition: itemA.sequenceOrder,
            newPosition: itemB.sequenceOrder,
            shift: itemB.sequenceOrder - itemA.sequenceOrder
          });
        }

        if (diffChanged) {
          difficultyChanges.push({
            title: itemB.title || itemB.conceptName,
            fromDifficulty: diffA,
            toDifficulty: diffB
          });
        }

        if (!posChanged && !diffChanged) {
          unchangedTopics.push(itemB.title || itemB.conceptName);
        }
      }
    }

    // Removed topics: in A but not in B
    for (const [key, itemA] of mapA.entries()) {
      if (!mapB.has(key)) {
        removedTopics.push({
          title: itemA.title || itemA.conceptName,
          oldPosition: itemA.sequenceOrder,
          reason: 'Removed or replaced in updated learning path'
        });
      }
    }

    return {
      versionA: {
        versionNumber: verA.versionNumber,
        title: verA.title,
        targetGoal: verA.targetGoal,
        triggerSource: verA.triggerSource,
        changeReason: verA.changeReason,
        itemCount: itemsA.length,
        createdAt: verA.createdAt,
        items: itemsA
      },
      versionB: {
        versionNumber: verB.versionNumber,
        title: verB.title,
        targetGoal: verB.targetGoal,
        triggerSource: verB.triggerSource,
        changeReason: verB.changeReason,
        itemCount: itemsB.length,
        createdAt: verB.createdAt,
        items: itemsB
      },
      diffSummary: {
        addedCount: addedTopics.length,
        removedCount: removedTopics.length,
        reorderedCount: reorderedTopics.length,
        difficultyChangesCount: difficultyChanges.length,
        addedTopics,
        removedTopics,
        reorderedTopics,
        difficultyChanges,
        unchangedCount: unchangedTopics.length
      }
    };
  }
}
