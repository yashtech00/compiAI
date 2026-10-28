import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../config/prisma.js';
import { AiService } from './ai.service.js';
import { MasteryEngine } from '../learner-model/mastery-engine.js';
import { requireAuth } from '../../middlewares/auth.js';
import { successResponse } from '../../utils/response.js';
import { AppError } from '../../middlewares/errorHandler.js';

const router = Router();

// POST /api/v1/ai/tutor
const tutorMessageSchema = z.object({
  lessonId: z.string().uuid().optional(),
  message: z.string().trim().min(2, 'Message cannot be empty').max(1000)
});

router.post('/tutor', requireAuth, async (req, res, next) => {
  try {
    const { lessonId, message } = tutorMessageSchema.parse(req.body);

    // 1. Fetch lesson and concept context if available
    let lessonContext = null;
    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          concept: {
            include: { skill: true }
          }
        }
      });
      if (lesson) {
        lessonContext = {
          lessonTitle: lesson.title,
          conceptName: lesson.concept.name,
          skillName: lesson.concept.skill.name,
          objective: lesson.objective
        };
      }
    }

    // 2. Fetch or create AI conversation record
    let conversation = await prisma.aiConversation.findFirst({
      where: {
        userId: req.user.id,
        lessonId: lessonId || null
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (!conversation) {
      conversation = await prisma.aiConversation.create({
        data: {
          userId: req.user.id,
          lessonId: lessonId || null,
          contextType: 'LESSON_TUTOR'
        }
      });
    }

    // 3. Save user's question
    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message
      }
    });

    // 4. Get response from AI service
    const tutorResponse = await AiService.getTutorResponse({
      userQuestion: message,
      lessonContext,
      learnerState: {
        userId: req.user.id,
        name: req.user.profile?.displayName
      },
      userId: req.user.id
    });

    // 5. Save assistant reply
    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: tutorResponse.reply,
        model: tutorResponse.model,
        inputTokens: tutorResponse.tokens.input,
        outputTokens: tutorResponse.tokens.output
      }
    });

    return successResponse(res, {
      reply: tutorResponse.reply,
      conversationId: conversation.id,
      provider: tutorResponse.provider,
      model: tutorResponse.model
    }, 'Tutor response generated');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/ai/conversations/:lessonId
router.get('/conversations/:lessonId', requireAuth, async (req, res, next) => {
  try {
    const conversation = await prisma.aiConversation.findFirst({
      where: {
        userId: req.user.id,
        lessonId: req.params.lessonId
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return successResponse(res, {
      messages: conversation?.messages || []
    }, 'Conversation history loaded');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/ai/explain-back
const explainBackSchema = z.object({
  conceptId: z.string().uuid(),
  userExplanation: z.string().trim().min(10, 'Please write at least a few sentences explaining the concept.').max(5000, 'Explanation cannot exceed 5000 characters.')
});

router.post('/explain-back', requireAuth, async (req, res, next) => {
  try {
    const { conceptId, userExplanation } = explainBackSchema.parse(req.body);

    const concept = await prisma.concept.findUnique({
      where: { id: conceptId },
      include: { skill: true }
    });

    if (!concept) {
      throw new AppError('Concept not found', 404, 'NOT_FOUND');
    }

    const evaluation = await AiService.evaluateExplainBack({
      userExplanation,
      conceptName: concept.name,
      learningObjective: concept.description,
      userId: req.user.id
    });

    // Save ExplainBackAttempt and update learner model in transaction
    const result = await prisma.$transaction(async (tx) => {
      const attempt = await tx.explainBackAttempt.create({
        data: {
          userId: req.user.id,
          conceptId,
          responseText: userExplanation,
          accuracyScore: evaluation.accuracyScore,
          completenessScore: evaluation.completenessScore,
          clarityScore: evaluation.clarityScore,
          overallScore: evaluation.overallScore,
          misconceptions: evaluation.misconceptions,
          feedback: evaluation.feedback
        }
      });

      // Update concept mastery with MasteryEngine
      const currentConcept = await tx.userConcept.findUnique({
        where: { userId_conceptId: { userId: req.user.id, conceptId } }
      });
      const currentScore = currentConcept?.masteryScore || 50;
      const currentConfidence = currentConcept?.confidenceScore || 50;

      const masteryOutcome = MasteryEngine.evaluateExplainBackOutcome({
        currentMastery: currentScore,
        currentConfidence,
        rubricScores: {
          accuracy: evaluation.accuracyScore,
          completeness: evaluation.completenessScore,
          clarity: evaluation.clarityScore,
          overall: evaluation.overallScore
        },
        misconceptions: evaluation.misconceptions
      });

      await tx.userConcept.upsert({
        where: { userId_conceptId: { userId: req.user.id, conceptId } },
        update: {
          masteryScore: masteryOutcome.newMastery,
          confidenceScore: masteryOutcome.newConfidence,
          lastSeenAt: new Date()
        },
        create: {
          userId: req.user.id,
          conceptId,
          masteryScore: masteryOutcome.newMastery,
          confidenceScore: masteryOutcome.newConfidence,
          lastSeenAt: new Date()
        }
      });

      // Award XP (40 XP)
      await tx.xpTransaction.upsert({
        where: {
          userId_sourceType_sourceId: {
            userId: req.user.id,
            sourceType: 'EXPLAIN_BACK',
            sourceId: attempt.id
          }
        },
        update: {},
        create: {
          userId: req.user.id,
          sourceType: 'EXPLAIN_BACK',
          sourceId: attempt.id,
          amount: 40
        }
      });

      // Link attempt to active learning session if present
      await tx.learningSession.updateMany({
        where: {
          userId: req.user.id,
          lesson: { conceptId },
          status: { in: ['STARTED', 'IN_PROGRESS'] }
        },
        data: {
          explainAttemptId: attempt.id,
          finalMastery: masteryOutcome.newMastery
        }
      });

      return {
        attemptId: attempt.id,
        evaluation,
        newMasteryScore: masteryOutcome.newMastery,
        masteryChange: masteryOutcome.masteryDelta
      };
    });

    return successResponse(res, { result }, 'Explain-back evaluated');
  } catch (error) {
    next(error);
  }
});

export default router;
