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
router.get('/skills', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const allSkills = await prisma.skill.findMany({
      include: {
        concepts: {
          select: { id: true, name: true, difficulty: true }
        },
        userSkills: {
          where: { userId }
        }
      },
      orderBy: { name: 'asc' }
    });

    const userConcepts = await prisma.userConcept.findMany({
      where: { userId }
    });
    const conceptMasteryMap = new Map();
    for (const uc of userConcepts) {
      conceptMasteryMap.set(uc.conceptId, uc.masteryScore);
    }

    const skillAnalytics = allSkills.map(skill => {
      const userSkill = skill.userSkills[0];
      const totalConcepts = skill.concepts.length;
      const masteredConcepts = skill.concepts.filter(
        c => (conceptMasteryMap.get(c.id) || 0) >= 75
      ).length;

      return {
        id: skill.id,
        name: skill.name,
        slug: skill.slug,
        category: skill.category,
        difficulty: skill.difficulty,
        masteryScore: userSkill?.masteryScore || 0,
        confidenceScore: userSkill?.confidenceScore || 0,
        lastPracticedAt: userSkill?.lastPracticedAt || null,
        totalConcepts,
        masteredConcepts
      };
    });

    return successResponse(res, { skills: skillAnalytics }, 'Skill analytics loaded');
  } catch (error) {
    next(error);
  }
});

export default router;
