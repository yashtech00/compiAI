import { Router } from 'express';
import { z } from 'zod';
import { QuizService } from './quizzes.service.js';
import { requireAuth } from '../../middlewares/auth.js';
import { successResponse } from '../../utils/response.js';

const router = Router();

// POST /api/v1/quizzes/:id/submit
const quizSubmitSchema = z.object({
  responses: z.array(z.object({
    questionId: z.string().uuid(),
    response: z.string()
  })),
  durationSeconds: z.number().int().nonnegative().optional(),
  hintsUsed: z.number().int().nonnegative().optional()
});

router.post('/:id/submit', requireAuth, async (req, res, next) => {
  try {
    const validated = quizSubmitSchema.parse(req.body);
    const result = await QuizService.submitQuiz(
      req.user.id,
      req.params.id,
      validated.responses,
      validated.durationSeconds || 0,
      validated.hintsUsed || 0
    );

    return successResponse(res, { result }, 'Quiz submitted and graded');
  } catch (error) {
    next(error);
  }
});

export default router;
