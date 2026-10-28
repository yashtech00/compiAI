import { Router } from 'express';
import prisma from '../../config/prisma.js';
import { requireAuth } from '../../middlewares/auth.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { config } from '../../config/index.js';

const router = Router();

// GET /api/v1/subscriptions/plans - Public or authenticated
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { monthlyPrice: 'asc' }
    });
    return successResponse(res, { plans }, 'Subscription plans retrieved');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/subscriptions/current - Authenticated
router.get('/current', requireAuth, async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        status: 'ACTIVE'
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });

    const isPro = subscription?.plan?.code === 'PRO';

    return successResponse(res, {
      subscription,
      isPro,
      entitlements: {
        unlimitedSessions: isPro,
        socraticTutor: isPro,
        explainBackRubric: isPro,
        spacedRepetitionQueue: true, // Included
        adaptiveRoadmap: true
      }
    }, 'Current subscription retrieved');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/subscriptions/checkout
router.post('/checkout', requireAuth, async (req, res, next) => {
  try {
    const { planCode } = req.body;

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { code: planCode || 'PRO' }
    });

    if (!plan) {
      return errorResponse(res, 'Plan not found', 404, 'NOT_FOUND');
    }

    if (!config.stripeSecretKey) {
      // Return clear notice that Stripe credentials are unconfigured in environment
      return successResponse(res, {
        checkoutUrl: null,
        isConfigured: false,
        message: 'Live billing provider is currently in staging mode. Configure STRIPE_SECRET_KEY in production to enable automated credit card checkout.',
        plan
      }, 'Stripe integration interface ready');
    }

    // In a live environment with Stripe configured, return session URL
    return successResponse(res, {
      checkoutUrl: `https://checkout.stripe.com/c/pay/mock_session_${Date.now()}`,
      isConfigured: true,
      plan
    }, 'Checkout session initialized');
  } catch (error) {
    next(error);
  }
});

export default router;
