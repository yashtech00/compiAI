import { Router } from 'express';
import { RecommendationsService } from './recommendations.service.js';
import { requireAuth } from '../../middlewares/auth.js';
import { successResponse } from '../../utils/response.js';

const router = Router();

// GET /api/v1/today/recommendation
router.get('/recommendation', requireAuth, async (req, res, next) => {
  try {
    const today = await RecommendationsService.getTodayRecommendation(req.user.id);
    return successResponse(res, { today }, "Today's learning recommendation retrieved");
  } catch (error) {
    next(error);
  }
});

export default router;
