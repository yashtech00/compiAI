import { Router } from 'express';
import prisma from '../../config/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';
import { successResponse } from '../../utils/response.js';

const router = Router();

// GET /api/v1/analytics/summary
router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Total Learning Minutes
    const activities = await prisma.learningActivity.findMany({
      where: { userId }
    });
    const totalMinutes = Math.round(
      activities.reduce((acc, a) => acc + (a.durationSeconds || 0), 0) / 60
    );

    // 2. Completed Sessions
    const completedSessions = await prisma.learningSession.count({
      where: { userId, status: 'COMPLETED' }
    });

    // 3. Concepts Studied & Mastered
    const userConcepts = await prisma.userConcept.findMany({
      where: { userId }
    });
    const conceptsStudied = userConcepts.length;
    const conceptsMastered = userConcepts.filter(c => c.masteryScore >= 75).length;

    // 4. Streak
    const streak = await prisma.streak.findUnique({
      where: { userId }
    });

    // 5. Total XP
    const xpAggregate = await prisma.xpTransaction.aggregate({
      where: { userId },
      _sum: { amount: true }
    });
    const totalXp = xpAggregate._sum.amount || 0;

    // 6. Roadmap completion
    const activePath = await prisma.learningPath.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { items: true }
    });
    const roadmapCompletion = activePath ? activePath.completionPercentage : 0;

    // 7. Weekly Activity Distribution (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyActivities = await prisma.learningActivity.findMany({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo }
      }
    });

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyMap = new Map();

    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const label = dayLabels[d.getDay()];
      dailyMap.set(label, { day: label, date: d.toISOString().split('T')[0], minutes: 0, sessions: 0 });
    }

    for (const act of weeklyActivities) {
      const actDate = new Date(act.createdAt);
      const label = dayLabels[actDate.getDay()];
      if (dailyMap.has(label)) {
        const item = dailyMap.get(label);
        item.minutes += Math.round((act.durationSeconds || 0) / 60);
        item.sessions += 1;
      }
    }

    const weeklyChartData = Array.from(dailyMap.values());

    return successResponse(res, {
      totalMinutes,
      completedSessions,
      conceptsStudied,
      conceptsMastered,
      streak: {
        current: streak?.currentStreak || 0,
        longest: streak?.longestStreak || 0
      },
      totalXp,
      roadmapCompletion,
      weeklyActivity: weeklyChartData
    }, 'Analytics summary loaded');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/analytics/skills
// Roadmap-driven: Derives domain knowledge & skill breakdown strictly from the learner's active roadmap
router.get('/skills', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Fetch the learner's active roadmap and its items
    const activePath = await prisma.learningPath.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        items: {
          include: {
            concept: {
              include: {
                skill: true,
                userConcepts: {
                  where: { userId }
                }
              }
            }
          },
          orderBy: { sequenceOrder: 'asc' }
        }
      }
    });

    if (!activePath || !activePath.items || activePath.items.length === 0) {
      return successResponse(res, {
        hasRoadmap: false,
        roadmapTitle: null,
        roadmapVersion: null,
        skills: []
      }, 'No active roadmap found for learner');
    }

    // 2. Fetch user's registered userSkill records for these skills
    const userSkills = await prisma.userSkill.findMany({
      where: { userId }
    });
    const userSkillMap = new Map();
    for (const us of userSkills) {
      userSkillMap.set(us.skillId, us);
    }

    // 3. Group roadmap items by Domain Skill (or Topic if custom/unlinked)
    const domainMap = new Map();

    for (const item of activePath.items) {
      const skill = item.concept?.skill;
      const groupKey = skill ? skill.id : (item.conceptId || item.id);
      const groupName = skill ? skill.name : (item.title || item.concept?.name || 'Roadmap Topic');
      const groupCategory = skill ? skill.category : (activePath.targetGoal || 'Core Engineering');
      const groupSlug = skill ? skill.slug : (item.concept?.slug || `topic-${item.sequenceOrder}`);

      if (!domainMap.has(groupKey)) {
        domainMap.set(groupKey, {
          id: groupKey,
          name: groupName,
          slug: groupSlug,
          category: groupCategory,
          difficulty: skill?.difficulty || 1,
          items: []
        });
      }

      domainMap.get(groupKey).items.push(item);
    }

    // 4. Calculate real metrics for each domain based strictly on active roadmap items
    const skillAnalytics = Array.from(domainMap.values()).map(domain => {
      const totalConcepts = domain.items.length;
      const completedConcepts = domain.items.filter(i => i.status === 'COMPLETED').length;
      const inProgressConcepts = domain.items.filter(i => i.status === 'IN_PROGRESS').length;

      // Extract user concept telemetry for this domain's items
      const assessedItems = domain.items.filter(i => {
        const uc = i.concept?.userConcepts?.[0];
        return uc && uc.attempts > 0;
      });

      const isAssessed = assessedItems.length > 0;
      let masteryScore = null;
      let confidenceScore = 0;

      if (isAssessed) {
        const totalMastery = assessedItems.reduce((acc, i) => acc + (i.concept.userConcepts[0].masteryScore || 0), 0);
        const totalConfidence = assessedItems.reduce((acc, i) => acc + (i.concept.userConcepts[0].confidenceScore || 0), 0);
        masteryScore = Math.round(totalMastery / assessedItems.length);
        confidenceScore = Math.round(totalConfidence / assessedItems.length);
      } else {
        // Check if there is an explicit userSkill assessment
        const us = userSkillMap.get(domain.id);
        if (us && us.lastAssessedAt) {
          masteryScore = Math.round(us.masteryScore);
          confidenceScore = Math.round(us.confidenceScore);
        }
      }

      const masteredConcepts = domain.items.filter(i => {
        const uc = i.concept?.userConcepts?.[0];
        return (uc?.masteryScore || 0) >= 75 || i.status === 'COMPLETED';
      }).length;

      let status = 'PLANNED';
      if (completedConcepts === totalConcepts && totalConcepts > 0) {
        status = 'COMPLETED';
      } else if (completedConcepts > 0 || inProgressConcepts > 0 || isAssessed) {
        status = 'IN_PROGRESS';
      }

      return {
        id: domain.id,
        name: domain.name,
        slug: domain.slug,
        category: domain.category,
        difficulty: domain.difficulty,
        isAssessed: masteryScore !== null,
        masteryScore: masteryScore, // null if not assessed!
        confidenceScore: confidenceScore,
        status,
        totalConcepts,
        completedConcepts,
        masteredConcepts
      };
    });

    return successResponse(res, {
      hasRoadmap: true,
      roadmapTitle: activePath.title,
      roadmapVersion: activePath.version,
      completionPercentage: activePath.completionPercentage,
      skills: skillAnalytics
    }, 'Roadmap-driven skill analytics loaded');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/analytics/progress (Combined summary and skills telemetry)
router.get('/progress', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Total Learning Minutes
    const activities = await prisma.learningActivity.findMany({
      where: { userId }
    });
    const totalMinutes = Math.round(
      activities.reduce((acc, a) => acc + (a.durationSeconds || 0), 0) / 60
    );

    // 2. Completed Sessions
    const completedSessions = await prisma.learningSession.count({
      where: { userId, status: 'COMPLETED' }
    });

    // 3. Concepts Studied & Mastered
    const userConcepts = await prisma.userConcept.findMany({
      where: { userId }
    });
    const conceptsStudied = userConcepts.length;
    const conceptsMastered = userConcepts.filter(c => c.masteryScore >= 75).length;

    // 4. Streak
    const streak = await prisma.streak.findUnique({
      where: { userId }
    });

    // 5. Total XP
    const xpAggregate = await prisma.xpTransaction.aggregate({
      where: { userId },
      _sum: { amount: true }
    });
    const totalXp = xpAggregate._sum.amount || 0;

    // 6. Roadmap & items
    const activePath = await prisma.learningPath.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        items: {
          include: {
            concept: {
              include: {
                skill: true,
                userConcepts: { where: { userId } }
              }
            }
          },
          orderBy: { sequenceOrder: 'asc' }
        }
      }
    });
    const roadmapCompletion = activePath ? activePath.completionPercentage : 0;

    // 7. Weekly Activity Distribution
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyActivities = await prisma.learningActivity.findMany({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo }
      }
    });

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyMap = new Map();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const label = dayLabels[d.getDay()];
      dailyMap.set(label, { day: label, date: d.toISOString().split('T')[0], minutes: 0, sessions: 0 });
    }

    for (const act of weeklyActivities) {
      const actDate = new Date(act.createdAt);
      const label = dayLabels[actDate.getDay()];
      if (dailyMap.has(label)) {
        const item = dailyMap.get(label);
        item.minutes += Math.round((act.durationSeconds || 0) / 60);
        item.sessions += 1;
      }
    }

    const summary = {
      totalMinutes,
      completedSessions,
      conceptsStudied,
      conceptsMastered,
      streak: {
        current: streak?.currentStreak || 0,
        longest: streak?.longestStreak || 0
      },
      totalXp,
      roadmapCompletion,
      weeklyActivity: Array.from(dailyMap.values())
    };

    // Skills breakdown from active roadmap
    let skills = [];
    if (activePath?.items?.length) {
      const domainMap = new Map();
      for (const item of activePath.items) {
        const skill = item.concept?.skill;
        const groupKey = skill ? skill.id : (item.conceptId || item.id);
        const groupName = skill ? skill.name : (item.title || item.concept?.name || 'Roadmap Topic');
        const groupCategory = skill ? skill.category : (activePath.targetGoal || 'Core Engineering');
        const groupSlug = skill ? skill.slug : (item.concept?.slug || `topic-${item.sequenceOrder}`);

        if (!domainMap.has(groupKey)) {
          domainMap.set(groupKey, {
            id: groupKey,
            name: groupName,
            slug: groupSlug,
            category: groupCategory,
            difficulty: skill?.difficulty || 1,
            items: []
          });
        }
        domainMap.get(groupKey).items.push(item);
      }

      skills = Array.from(domainMap.values()).map(domain => {
        const totalConcepts = domain.items.length;
        const completedConcepts = domain.items.filter(i => i.status === 'COMPLETED').length;
        const assessedItems = domain.items.filter(i => {
          const uc = i.concept?.userConcepts?.[0];
          return uc && uc.attempts > 0;
        });
        const isAssessed = assessedItems.length > 0;
        let masteryScore = null;
        let confidenceScore = 0;
        if (isAssessed) {
          const totalMastery = assessedItems.reduce((acc, i) => acc + (i.concept.userConcepts[0].masteryScore || 0), 0);
          const totalConfidence = assessedItems.reduce((acc, i) => acc + (i.concept.userConcepts[0].confidenceScore || 0), 0);
          masteryScore = Math.round(totalMastery / assessedItems.length);
          confidenceScore = Math.round(totalConfidence / assessedItems.length);
        }

        return {
          id: domain.id,
          name: domain.name,
          slug: domain.slug,
          category: domain.category,
          difficulty: domain.difficulty,
          isAssessed,
          masteryScore,
          confidenceScore,
          status: completedConcepts === totalConcepts && totalConcepts > 0 ? 'COMPLETED' : completedConcepts > 0 || isAssessed ? 'IN_PROGRESS' : 'PLANNED',
          totalConcepts,
          completedConcepts,
          masteredConcepts: domain.items.filter(i => (i.concept?.userConcepts?.[0]?.masteryScore || 0) >= 75 || i.status === 'COMPLETED').length
        };
      });
    }

    return successResponse(res, {
      summary,
      skills,
      hasRoadmap: Boolean(activePath),
      roadmapTitle: activePath?.title || null,
      roadmapVersion: activePath?.version || null
    }, 'Progress telemetry retrieved');
  } catch (error) {
    next(error);
  }
});

export default router;
