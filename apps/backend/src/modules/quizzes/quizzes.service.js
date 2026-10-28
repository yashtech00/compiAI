import prisma from '../../config/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { MasteryEngine } from '../learner-model/mastery-engine.js';

export class QuizService {
  static async submitQuiz(userId, quizId, responses, durationSeconds = 0, hintsUsed = 0) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          include: {
            concept: {
              include: { skill: true }
            }
          }
        },
        questions: {
          include: {
            concept: true
          }
        }
      }
    });

    if (!quiz) {
      throw new AppError('Quiz not found', 404, 'QUIZ_NOT_FOUND');
    }

    // Authorization check: If this quiz belongs to a user-custom lesson, only that user may submit
    if (quiz.lesson?.userId && quiz.lesson.userId !== userId) {
      throw new AppError('Unauthorized access to quiz', 403, 'FORBIDDEN');
    }

    const questionMap = new Map();
    for (const q of quiz.questions) {
      questionMap.set(q.id, q);
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    const evaluatedResponses = [];

    for (const r of responses) {
      const question = questionMap.get(r.questionId);
      if (!question) continue;

      // Validate option membership if options are present
      const opts = Array.isArray(question.options) ? question.options : [];
      let userAns = String(r.response || '').trim();

      // If user passed a numeric index string (e.g. "0", "1", "2", "3")
      if (/^[0-3]$/.test(userAns) && opts[Number(userAns)]) {
        userAns = opts[Number(userAns)];
      }

      // Check if user answer is an allowed option
      if (opts.length > 0 && !opts.some(o => o.trim().toLowerCase() === userAns.toLowerCase())) {
        throw new AppError(`Invalid answer option for question: ${question.questionText}`, 400, 'INVALID_ANSWER_OPTION');
      }

      const difficultyWeight = question.difficulty || 1;
      totalPoints += difficultyWeight;

      const correctAns = String(question.answer || '').trim().toLowerCase();
      const isCorrect = userAns.toLowerCase() === correctAns;

      if (isCorrect) {
        earnedPoints += difficultyWeight;
      }

      evaluatedResponses.push({
        questionId: question.id,
        response: userAns,
        isCorrect,
        correctAnswer: question.answer,
        explanation: question.explanation || '',
        feedback: isCorrect ? 'Correct! Well done.' : `Incorrect. The correct answer is: ${question.answer}`
      });
    }

    const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const isPassed = scorePercentage >= 70;
    const concept = quiz.lesson.concept;
    const skill = concept?.skill;

    // Check for previous attempts on this quiz to guard against duplicate submissions
    const previousAttempts = await prisma.quizAttempt.findMany({
      where: { userId, quizId },
      orderBy: { completedAt: 'desc' },
      take: 5
    });

    const hasPassedBefore = previousAttempts.some(a => a.score >= 70);
    const bestPreviousScore = previousAttempts.length > 0 ? Math.max(...previousAttempts.map(a => a.score)) : 0;
    const isRedundantAttempt = hasPassedBefore && scorePercentage <= bestPreviousScore;

    // Use transaction for consistency across mastery, quiz attempt, XP, and streak
    const result = await prisma.$transaction(async (tx) => {
      // 1. Record QuizAttempt and Responses (always preserved for audit history)
      const attempt = await tx.quizAttempt.create({
        data: {
          userId,
          quizId,
          score: scorePercentage,
          durationSeconds,
          completedAt: new Date(),
          responses: {
            create: evaluatedResponses.map(er => ({
              questionId: er.questionId,
              response: er.response,
              isCorrect: er.isCorrect,
              confidence: 1.0,
              feedback: er.feedback
            }))
          }
        }
      });

      // 2. Evaluate mastery deterministically using MasteryEngine
      let updatedConcept = null;
      let masteryOutcome = null;

      if (concept) {
        const existingConcept = await tx.userConcept.findUnique({
          where: { userId_conceptId: { userId, conceptId: concept.id } }
        });

        const currentMastery = existingConcept?.masteryScore || 0;
        const currentConfidence = existingConcept?.confidenceScore || 50;

        if (isRedundantAttempt) {
          // Re-submission of already passed quiz with equal or lower score:
          // Preserve demonstrated mastery score without artificial inflation or penalties
          updatedConcept = existingConcept;
          masteryOutcome = {
            newMastery: currentMastery,
            newConfidence: currentConfidence,
            masteryDelta: 0,
            actionType: 'ADVANCE',
            reason: 'Maintained demonstrated mastery score from prior success.'
          };
        } else {
          masteryOutcome = MasteryEngine.evaluateAssessmentOutcome({
            currentMastery,
            currentConfidence,
            isPassed,
            scorePercentage,
            hintsUsed,
            priorAttempts: existingConcept?.attempts || 0,
            correctAttempts: existingConcept?.correctAttempts || 0,
            independentSuccesses: existingConcept?.independentSuccesses || 0,
            assistedSuccesses: existingConcept?.assistedSuccesses || 0,
            timeSpentSeconds: durationSeconds
          });

          const wrongResponses = evaluatedResponses.filter(r => !r.isCorrect);
          const misconceptionsList = wrongResponses.length > 0
            ? wrongResponses.map(r => r.explanation || `Mistake on question: ${r.response}`)
            : null;

          updatedConcept = await tx.userConcept.upsert({
            where: { userId_conceptId: { userId, conceptId: concept.id } },
            update: {
              masteryScore: masteryOutcome.newMastery,
              confidenceScore: masteryOutcome.newConfidence,
              attempts: { increment: 1 },
              correctAttempts: isPassed ? { increment: 1 } : undefined,
              hintsCount: { increment: hintsUsed },
              independentSuccesses: masteryOutcome.isIndependentSuccess ? { increment: 1 } : undefined,
              assistedSuccesses: masteryOutcome.isAssistedSuccess ? { increment: 1 } : undefined,
              misconceptions: isPassed ? null : misconceptionsList, // Clear resolved misconceptions on pass
              lastActionType: masteryOutcome.actionType,
              lastSeenAt: new Date(),
              nextReviewAt: new Date(Date.now() + masteryOutcome.nextReviewDays * 24 * 60 * 60 * 1000)
            },
            create: {
              userId,
              conceptId: concept.id,
              masteryScore: masteryOutcome.newMastery,
              confidenceScore: masteryOutcome.newConfidence,
              attempts: 1,
              correctAttempts: isPassed ? 1 : 0,
              hintsCount: hintsUsed,
              independentSuccesses: masteryOutcome.isIndependentSuccess ? 1 : 0,
              assistedSuccesses: masteryOutcome.isAssistedSuccess ? 1 : 0,
              misconceptions: isPassed ? null : misconceptionsList,
              lastActionType: masteryOutcome.actionType,
              lastSeenAt: new Date(),
              nextReviewAt: new Date(Date.now() + masteryOutcome.nextReviewDays * 24 * 60 * 60 * 1000)
            }
          });
        }

        // 3. Update UserSkill aggregate
        if (skill && !isRedundantAttempt) {
          const allUserConcepts = await tx.userConcept.findMany({
            where: {
              userId,
              concept: { skillId: skill.id }
            }
          });

          const avgScore = allUserConcepts.length > 0
            ? Math.round(allUserConcepts.reduce((acc, c) => acc + c.masteryScore, 0) / allUserConcepts.length)
            : masteryOutcome.newMastery;

          await tx.userSkill.upsert({
            where: { userId_skillId: { userId, skillId: skill.id } },
            update: {
              masteryScore: avgScore,
              confidenceScore: avgScore,
              lastPracticedAt: new Date()
            },
            create: {
              userId,
              skillId: skill.id,
              masteryScore: avgScore,
              confidenceScore: avgScore,
              lastPracticedAt: new Date()
            }
          });
        }

        // 4. Update Spaced Repetition (RecallSchedule) with scientifically scheduled intervals
        if (!isRedundantAttempt) {
          const nextReviewDate = new Date(Date.now() + masteryOutcome.nextReviewDays * 24 * 60 * 60 * 1000);
          await tx.recallSchedule.upsert({
            where: { userId_conceptId: { userId, conceptId: concept.id } },
            update: {
              scheduledAt: nextReviewDate,
              intervalDays: masteryOutcome.nextReviewDays,
              predictedRecall: masteryOutcome.predictedRecall,
              status: 'SCHEDULED'
            },
            create: {
              userId,
              conceptId: concept.id,
              scheduledAt: nextReviewDate,
              intervalDays: masteryOutcome.nextReviewDays,
              predictedRecall: masteryOutcome.predictedRecall,
              status: 'SCHEDULED'
            }
          });
        }

        // 5. Update LearningPathItem when quiz is passed
        if (isPassed) {
          await tx.learningPathItem.updateMany({
            where: {
              learningPath: { userId, status: 'ACTIVE' },
              conceptId: concept.id
            },
            data: {
              status: 'COMPLETED',
              completedAt: new Date()
            }
          });
        }
      }

      // 6. Record LearningActivity
      await tx.learningActivity.create({
        data: {
          userId,
          conceptId: concept?.id || null,
          activityType: 'QUIZ',
          sourceType: 'QUIZ_ATTEMPT',
          sourceId: attempt.id,
          score: scorePercentage,
          durationSeconds
        }
      });

      // 7. Award XP idempotently (only once per quiz)
      const existingXp = await tx.xpTransaction.findFirst({
        where: {
          userId,
          sourceType: 'QUIZ',
          sourceId: quiz.id
        }
      });

      let xpAmount = 0;
      if (!existingXp && isPassed) {
        xpAmount = scorePercentage === 100 ? 75 : 50;
        try {
          await tx.xpTransaction.create({
            data: {
              userId,
              sourceType: 'QUIZ',
              sourceId: quiz.id,
              amount: xpAmount
            }
          });
        } catch (xpErr) {
          // If concurrent request won the race, unique constraint [userId, sourceType, sourceId] handles idempotency
          if (xpErr.code !== 'P2002') {
            throw xpErr;
          }
        }
      }

      // 8. Update Streak
      const streakRecord = await tx.streak.findUnique({ where: { userId } });
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let currentStreak = streakRecord?.currentStreak || 0;
      let longestStreak = streakRecord?.longestStreak || 0;

      if (streakRecord?.lastActivityDate) {
        const lastAct = new Date(streakRecord.lastActivityDate);
        lastAct.setHours(0, 0, 0, 0);
        const diffDays = Math.round((today - lastAct) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak += 1;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      const updatedStreak = await tx.streak.upsert({
        where: { userId },
        update: {
          currentStreak,
          longestStreak,
          lastActivityDate: new Date()
        },
        create: {
          userId,
          currentStreak,
          longestStreak,
          lastActivityDate: new Date()
        }
      });

      // 9. Update current active LearningSession if present
      const activeSession = await tx.learningSession.findFirst({
        where: {
          userId,
          lessonId: quiz.lessonId,
          status: { in: ['STARTED', 'IN_PROGRESS'] }
        },
        orderBy: { startedAt: 'desc' }
      });

      if (activeSession) {
        await tx.learningSession.update({
          where: { id: activeSession.id },
          data: {
            quizAttemptId: attempt.id,
            hintsUsed: { increment: hintsUsed },
            finalMastery: masteryOutcome?.newMastery || 0,
            status: isPassed ? 'COMPLETED' : activeSession.status,
            completedAt: isPassed ? new Date() : null
          }
        });
      }

      return {
        attemptId: attempt.id,
        score: scorePercentage,
        isPassed,
        xpAwarded: xpAmount,
        evaluatedResponses,
        streak: updatedStreak.currentStreak,
        conceptMastery: updatedConcept?.masteryScore || 0,
        masteryChange: masteryOutcome?.masteryDelta || 0,
        confidenceScore: updatedConcept?.confidenceScore || 50,
        decisionReason: masteryOutcome?.reason || ''
      };
    });

    return result;
  }
}
