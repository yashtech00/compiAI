import { Router } from 'express';
import prisma from '../config/prisma.js';
import authRoutes from '../modules/auth/auth.routes.js';
import onboardingRoutes from '../modules/onboarding/onboarding.routes.js';
import goalsRoutes from '../modules/goals/goals.routes.js';
import assessmentsRoutes from '../modules/assessments/assessments.routes.js';
import learningPathsRoutes from '../modules/learning-paths/learning-paths.routes.js';
import recommendationsRoutes from '../modules/recommendations/recommendations.routes.js';
import lessonsRoutes from '../modules/lessons/lessons.routes.js';
import sessionsRoutes from '../modules/learning-sessions/learning-sessions.routes.js';
import quizzesRoutes from '../modules/quizzes/quizzes.routes.js';
import recallRoutes from '../modules/recall/recall.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';
import aiRoutes from '../modules/ai/ai.routes.js';
import subscriptionsRoutes from '../modules/subscriptions/subscriptions.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import { successResponse } from '../utils/response.js';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return successResponse(res, {
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }, 'System operational');
  } catch (error) {
    next(error);
  }
});

// Mount module routers under /api/v1
apiRouter.use('/auth', authRoutes);
apiRouter.use('/onboarding', onboardingRoutes);
apiRouter.use('/', goalsRoutes); // /roles and /goals
apiRouter.use('/assessments', assessmentsRoutes);
apiRouter.use('/learning-paths', learningPathsRoutes);
apiRouter.use('/today', recommendationsRoutes);
apiRouter.use('/lessons', lessonsRoutes);
apiRouter.use('/sessions', sessionsRoutes);
apiRouter.use('/quizzes', quizzesRoutes);
apiRouter.use('/recall', recallRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/subscriptions', subscriptionsRoutes);
apiRouter.use('/admin', adminRoutes);

export default apiRouter;
