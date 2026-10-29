import { Router } from 'express';
import { RecommendationsService } from './recommendations.service.js';
import { requireAuth } from '../../middlewares/auth.js';
import { successResponse } from '../../utils/response.js';

const router = Router();

const handler = async (req, res, next) => {
  try {
    const today = await RecommendationsService.getTodayRecommendation(req.user.id);
    return successResponse(res, { today }, "Today's learning recommendation retrieved");
  } catch (error) {
    next(error);
  }
};

router.get('/', requireAuth, handler);
router.get('/recommendation', requireAuth, handler);
router.get('/today', requireAuth, handler);

export default router;
