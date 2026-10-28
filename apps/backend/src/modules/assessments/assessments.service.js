import prisma from '../../config/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';

export class AssessmentService {
  /**
   * Retrieves active diagnostic assessment with sanitized questions (without exposing answers)
   */
  static async getDiagnosticAssessment() {
    const assessment = await prisma.assessment.findFirst({
      where: { type: 'INITIAL', status: 'ACTIVE' },
      include: {
        questions: {
          select: {
            id: true,
            conceptId: true,
            questionType: true,
            questionText: true,
            options: true,
            difficulty: true,
            concept: {
              select: {
                id: true,
                name: true,
                slug: true,
                skill: {
                  select: { id: true, name: true, slug: true }
                }
              }
            }
          }
        }
      }
    });

    if (!assessment) {
      throw new AppError('Diagnostic assessment not found', 404, 'NOT_FOUND');
    }

    return assessment;
  }

  /**
   * Evaluates diagnostic assessment submission deterministically and updates learner model
   */
  static async submitAssessment(userId, assessmentId, responses, durationSeconds = 0) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          include: {
            concept: {
              include: { skill: true }
            }
          }
        }
      }
    });

    if (!assessment) {
      throw new AppError('Assessment not found', 404, 'NOT_FOUND');
    }

    const questionMap = new Map();
    for (const q of assessment.questions) {
      questionMap.set(q.id, q);
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    const evaluatedResponses = [];
    const conceptOutcomes = new Map(); // conceptId -> { correct: number, total: number, skillId: string }

    for (const r of responses) {
      const question = questionMap.get(r.questionId);
      if (!question) continue;

      const difficultyWeight = question.difficulty || 1;
      totalPoints += difficultyWeight;

      const cleanUserResponse = String(r.response || '').trim().toLowerCase();
      const cleanAnswer = String(question.answer || '').trim().toLowerCase();
      const isCorrect = cleanUserResponse === cleanAnswer;

      if (isCorrect) {
        earnedPoints += difficultyWeight;
      }

      evaluatedResponses.push({
        questionId: question.id,
        response: String(r.response || ''),
        isCorrect,
        confidence: 1.0,
        feedback: isCorrect ? 'Correct!' : (question.explanation || 'Incorrect answer')
      });

      if (question.conceptId) {
        const current = conceptOutcomes.get(question.conceptId) || {
          correct: 0,
          total: 0,
          skillId: question.concept.skillId,
          conceptName: question.concept.name
        };
        current.total += 1;
        if (isCorrect) current.correct += 1;
        conceptOutcomes.set(question.conceptId, current);
      }
    }

    const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    // Use transaction to update AssessmentAttempt, Responses, UserConcepts, and UserSkills
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create AssessmentAttempt
      const attempt = await tx.assessmentAttempt.create({
        data: {
          userId,
          assessmentId,
          score: finalScore,
          durationSeconds,
          completedAt: new Date(),
          responses: {
            create: evaluatedResponses.map(er => ({
              questionId: er.questionId,
              response: er.response,
              isCorrect: er.isCorrect,
              confidence: er.confidence,
              feedback: er.feedback
            }))
          }
        }
      });

      // 2. Update UserConcepts
      const affectedSkillIds = new Set();
      const weakConcepts = [];
      const strongConcepts = [];

      for (const [conceptId, outcome] of conceptOutcomes.entries()) {
        const accuracy = outcome.correct / outcome.total;
        // Calibrated baseline: correct diagnostic gives 45% (demonstrated familiarity, below 75% mastered ceiling); incorrect gives 10%
        const initialConceptScore = accuracy >= 0.7 ? 45 : 10;
        const initialConfidenceScore = accuracy >= 0.7 ? 35 : 20;

        if (initialConceptScore >= 40) {
          strongConcepts.push(outcome.conceptName);
        } else {
          weakConcepts.push(outcome.conceptName);
        }

        affectedSkillIds.add(outcome.skillId);

        await tx.userConcept.upsert({
          where: {
            userId_conceptId: { userId, conceptId }
          },
          update: {
            masteryScore: initialConceptScore,
            confidenceScore: initialConfidenceScore,
            attempts: { increment: outcome.total },
            correctAttempts: { increment: outcome.correct },
            lastSeenAt: new Date(),
            nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          },
          create: {
            userId,
            conceptId,
            masteryScore: initialConceptScore,
            confidenceScore: initialConfidenceScore,
            attempts: outcome.total,
            correctAttempts: outcome.correct,
            lastSeenAt: new Date(),
            nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        });
      }

      // 3. Update UserSkills based on aggregated concept mastery
      for (const skillId of affectedSkillIds) {
        const skillConcepts = await tx.userConcept.findMany({
          where: {
            userId,
            concept: { skillId }
          }
        });

        const avgScore = skillConcepts.length > 0
          ? Math.round(skillConcepts.reduce((acc, c) => acc + c.masteryScore, 0) / skillConcepts.length)
          : 0;

        await tx.userSkill.upsert({
          where: {
            userId_skillId: { userId, skillId }
          },
          update: {
            masteryScore: avgScore,
            confidenceScore: avgScore,
            lastAssessedAt: new Date(),
            lastPracticedAt: new Date()
          },
          create: {
            userId,
            skillId,
            masteryScore: avgScore,
            confidenceScore: avgScore,
            lastAssessedAt: new Date(),
            lastPracticedAt: new Date()
          }
        });
      }

      // 4. Update Profile onboarding status
      await tx.userProfile.update({
        where: { userId },
        data: {
          onboardingCompleted: true,
          onboardingStep: 5
        }
      });

      return {
        attemptId: attempt.id,
        score: finalScore,
        totalQuestions: evaluatedResponses.length,
        correctAnswers: evaluatedResponses.filter(r => r.isCorrect).length,
        weakConcepts,
        strongConcepts
      };
    });

    return result;
  }
}
