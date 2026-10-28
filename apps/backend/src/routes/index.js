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
import simulationsRoutes from '../modules/simulations/simulation.routes.js';
import { successResponse } from '../utils/response.js';

const apiRouter = Router();

import { ResilientAiProvider } from '../modules/ai/resilient-ai-provider.js';

// Health check endpoint
apiRouter.get('/health', async (req, res, next) => {
  try {
    let dbStatus = 'connected';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbErr) {
      dbStatus = 'disconnected';
    }

    const aiSnapshot = ResilientAiProvider.getObservabilitySnapshot();
    const isCoreHealthy = dbStatus === 'connected';
    const overallStatus = !isCoreHealthy ? 'unhealthy' : (aiSnapshot.status === 'degraded' ? 'degraded' : 'healthy');

    const statusCode = isCoreHealthy ? 200 : 503;
    return res.status(statusCode).json({
      success: isCoreHealthy,
      data: {
        status: overallStatus,
        database: dbStatus,
        aiProvider: {
          status: aiSnapshot.status,
          circuitBreaker: aiSnapshot.circuitBreaker.state,
          configuredModel: aiSnapshot.configuredModel,
          isConfigured: aiSnapshot.isConfigured
        },
        observability: aiSnapshot.metrics,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      },
      message: isCoreHealthy ? 'System operational' : 'Database connectivity failed'
    });
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
apiRouter.use('/simulations', simulationsRoutes);

export default apiRouter;
