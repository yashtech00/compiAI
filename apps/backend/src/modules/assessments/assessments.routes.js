import { Router } from 'express';
import { z } from 'zod';
import { AssessmentService } from './assessments.service.js';
import { requireAuth } from '../../middlewares/auth.js';
import { successResponse } from '../../utils/response.js';

const router = Router();

// GET /api/v1/assessments/diagnostic
router.get('/diagnostic', requireAuth, async (req, res, next) => {
  try {
    const assessment = await AssessmentService.getDiagnosticAssessment();
    return successResponse(res, { assessment }, 'Diagnostic assessment loaded');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/assessments/:id/submit
const submitSchema = z.object({
  responses: z.array(z.object({
    questionId: z.string().uuid(),
    response: z.string()
  })),
  durationSeconds: z.number().int().nonnegative().optional()
});

router.post('/:id/submit', requireAuth, async (req, res, next) => {
  try {
    const validated = submitSchema.parse(req.body);
    const result = await AssessmentService.submitAssessment(
      req.user.id,
      req.params.id,
      validated.responses,
      validated.durationSeconds || 0
    );

    return successResponse(res, { result }, 'Assessment graded and learner model updated');
  } catch (error) {
    next(error);
  }
});

export default router;
