import prisma from '../../config/prisma.js';
import { AdaptiveEngine } from './adaptive-engine.js';

export class RecommendationsService {
  /**
   * Generates Today's Learning session recommendation and dashboard metrics
   * Powered by the Adaptive Learning Engine (ADVANCE, REINFORCE, REVIEW, PREREQUISITE, CONTENT_UNAVAILABLE)
   */
  static async getTodayRecommendation(userId) {
    // 1. Get user profile and streak
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        streak: true,
        learningGoals: {
          where: { status: 'ACTIVE' },
          include: { targetRole: true },
          take: 1
        }
      }
    });

    const activeGoal = user?.learningGoals?.[0] || null;

    // 2. Check due recall items count (Spaced Repetition)
    const now = new Date();
    const dueRecalls = await prisma.recallSchedule.findMany({
      where: {
        userId,
        scheduledAt: { lte: now },
        status: 'SCHEDULED'
      },
      include: {
        concept: {
          include: { skill: true }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    // 3. Evaluate next action using AdaptiveEngine
    const decision = await AdaptiveEngine.evaluateNextAction(userId);
    const stagesConfig = AdaptiveEngine.getTimeAdaptedConfig(decision.dailyMinutes);

    // If lesson wasn't found directly on concept, check if any published lesson exists for THIS concept only
    let recommendedLesson = decision.lesson;
    if (!recommendedLesson && decision.concept) {
      recommendedLesson = await prisma.lesson.findFirst({
        where: { conceptId: decision.concept.id, status: 'PUBLISHED' },
        include: {
          quizzes: {
            take: 1,
            select: { id: true, title: true }
          }
        }
      });
    }

    // 4. Calculate weekly learning minutes and completed sessions
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActivities = await prisma.learningActivity.findMany({
      where: {
        userId,
        createdAt: { gte: oneWeekAgo }
      }
    });

    const weeklyLearningMinutes = Math.round(
      recentActivities.reduce((acc, act) => acc + (act.durationSeconds || 0), 0) / 60
    );

    // 5. Calculate overall skill mastery and completed concepts
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { masteryScore: 'desc' },
      take: 6
    });

    const totalMastery = userSkills.length > 0
      ? Math.round(userSkills.reduce((acc, s) => acc + s.masteryScore, 0) / userSkills.length)
      : 0;

    const completedConceptsCount = await prisma.userConcept.count({
      where: { userId, masteryScore: { gte: 70 } }
    });

    // Content unavailable recoverable state handling
    if (!recommendedLesson || decision.actionType === 'CONTENT_UNAVAILABLE') {
      return {
        greeting: `Welcome back, ${user?.profile?.displayName || 'Learner'}`,
        goal: activeGoal ? {
          id: activeGoal.id,
          title: activeGoal.title,
          targetRole: activeGoal.targetRole?.name || 'Software Engineer',
          targetReadiness: activeGoal.targetReadiness
        } : null,
        streak: {
          current: user?.streak?.currentStreak || 0,
          longest: user?.streak?.longestStreak || 0
        },
        recommendedActivity: {
          type: 'CONTENT_UNAVAILABLE',
          actionType: 'CONTENT_UNAVAILABLE',
          title: decision.concept?.name ? `${decision.concept.name} (In Review)` : 'Curriculum Update in Progress',
          concept: decision.concept ? {
            id: decision.concept.id,
            name: decision.concept.name,
            skillName: decision.concept.skill?.name
          } : null,
          lessonId: null,
          lessonSlug: null,
          estimatedMinutes: decision.dailyMinutes || 15,
          reason: decision.reason || 'This learning module is currently in review. Please check back shortly.',
          dueReviewsCount: dueRecalls.length,
          reviewConcept: dueRecalls[0]?.concept ? {
            id: dueRecalls[0].concept.id,
            name: dueRecalls[0].concept.name,
            skillName: dueRecalls[0].concept.skill?.name
          } : null,
          pacingLabel: stagesConfig.pacingLabel,
          includedStages: []
        },
        progress: {
          completedConceptsCount,
          weeklyMinutes: weeklyLearningMinutes,
          overallMastery: totalMastery,
          dailyMinutes: decision.dailyMinutes,
          topSkills: userSkills.map(us => ({
            id: us.skillId,
            name: us.skill.name,
            category: us.skill.category,
            masteryScore: us.masteryScore
          }))
        }
      };
    }

    return {
      greeting: `Welcome back, ${user?.profile?.displayName || 'Learner'}`,
      goal: activeGoal ? {
        id: activeGoal.id,
        title: activeGoal.title,
        targetRole: activeGoal.targetRole?.name || 'Software Engineer',
        targetReadiness: activeGoal.targetReadiness
      } : null,
      streak: {
        current: user?.streak?.currentStreak || 0,
        longest: user?.streak?.longestStreak || 0
      },
      recommendedActivity: {
        type: decision.actionType === 'REVIEW' ? 'RECALL_AND_LESSON' : 'DAILY_LESSON',
        actionType: decision.actionType, // ADVANCE, REINFORCE, REVIEW, PREREQUISITE
        title: recommendedLesson.title || decision.concept?.name || 'Daily Engineering Session',
        concept: decision.concept ? {
          id: decision.concept.id,
          name: decision.concept.name,
          skillName: decision.concept.skill?.name
        } : null,
        lessonId: recommendedLesson.id,
        lessonSlug: recommendedLesson.slug,
        estimatedMinutes: decision.dailyMinutes || recommendedLesson.estimatedMinutes || 15,
        reason: decision.reason,
        dueReviewsCount: dueRecalls.length,
        reviewConcept: dueRecalls[0]?.concept ? {
          id: dueRecalls[0].concept.id,
          name: dueRecalls[0].concept.name,
          skillName: dueRecalls[0].concept.skill?.name
        } : null,
        pacingLabel: stagesConfig.pacingLabel,
        includedStages: stagesConfig.includedStages
      },
      progress: {
        completedConceptsCount,
        weeklyMinutes: weeklyLearningMinutes,
        overallMastery: totalMastery,
        dailyMinutes: decision.dailyMinutes,
        topSkills: userSkills.map(us => ({
          id: us.skillId,
          name: us.skill.name,
          category: us.skill.category,
          masteryScore: us.masteryScore
        }))
      }
    };
  }
}
