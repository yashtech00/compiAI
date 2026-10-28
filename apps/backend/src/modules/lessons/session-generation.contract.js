import { z } from 'zod';

export const QuizQuestionGenerationSchema = z.object({
  questionText: z.string().min(10).max(500),
  questionType: z.literal('MCQ').default('MCQ'),
  options: z.array(z.string().min(1).max(300)).length(4),
  correctAnswerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(10).max(600),
  difficulty: z.number().int().min(1).max(3).default(1)
});

export const QuizGenerationSchema = z.object({
  title: z.string().min(3).max(120),
  questions: z.array(QuizQuestionGenerationSchema).min(2).max(4)
});

export const SessionActivitiesSchema = z.object({
  conceptOverview: z.object({
    summary: z.string().min(25).max(1000),
    keyTerms: z.array(z.object({
      term: z.string().min(1).max(80),
      definition: z.string().min(5).max(300)
    })).min(2).max(6)
  }),
  mentalModel: z.object({
    analogy: z.string().min(20).max(800),
    intuition: z.string().min(20).max(800),
    commonMisconceptions: z.array(z.string().min(5).max(400)).min(1).max(5),
    remediationRule: z.string().min(10).max(400).optional()
  }),
  visualization: z.object({
    visualType: z.string().min(2).max(60).default('architecture'),
    title: z.string().min(3).max(120),
    diagram: z.string().min(10).max(2000),
    explanation: z.string().min(15).max(800)
  }),
  codeMechanics: z.object({
    language: z.string().min(1).max(30),
    codeSnippet: z.string().min(15).max(3000),
    walkthrough: z.string().min(20).max(1000)
  }),
  productionScenario: z.object({
    scenario: z.string().min(30).max(1200),
    tradeoffs: z.array(z.string().min(5).max(400)).min(2).max(6),
    failureMode: z.string().min(10).max(500)
  }),
  practicalChallenge: z.object({
    prompt: z.string().min(20).max(1000),
    starterCode: z.string().max(2000).optional().default(''),
    hint: z.string().min(10).max(400),
    solution: z.string().min(15).max(3000),
    explanation: z.string().min(15).max(800)
  }),
  coreSynthesis: z.object({
    takeaways: z.array(z.string().min(5).max(300)).min(2).max(6),
    nextStep: z.string().min(10).max(300)
  })
});

export const SessionGenerationSchema = z.object({
  lessonTitle: z.string().min(3).max(140),
  lessonSlug: z.string().min(3).max(140).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  objective: z.string().min(10).max(400),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  estimatedMinutes: z.number().int().min(5).max(30),
  activities: SessionActivitiesSchema,
  quiz: QuizGenerationSchema
});

/**
 * Validates generated session payload against schema and assessment integrity rules
 */
export function validateSessionContent(rawContent) {
  const validated = SessionGenerationSchema.parse(rawContent);

  // Validate quiz options uniqueness and answer integrity
  for (let i = 0; i < validated.quiz.questions.length; i++) {
    const q = validated.quiz.questions[i];
    const uniqueOptions = new Set(q.options.map(opt => opt.trim().toLowerCase()));
    if (uniqueOptions.size !== 4) {
      throw new Error(`Quiz Question #${i + 1} has duplicate or blank options. All 4 options must be distinct.`);
    }

    const selectedAnswer = q.options[q.correctAnswerIndex];
    if (!selectedAnswer || !selectedAnswer.trim()) {
      throw new Error(`Quiz Question #${i + 1} correctAnswerIndex (${q.correctAnswerIndex}) points to an empty option.`);
    }
  }

  return validated;
}
