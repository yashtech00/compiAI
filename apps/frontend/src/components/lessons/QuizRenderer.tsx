'use client';

import React from 'react';
import { HelpCircle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface QuizQuestion {
  id: string;
  questionType: string;
  questionText: string;
  options: string[];
  difficulty: number;
}

interface QuizData {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

interface QuizRendererProps {
  quiz?: QuizData;
  quizResponses: Record<string, string>;
  onSelectOption: (questionId: string, option: string) => void;
  onSubmitQuiz: () => void;
  isSubmitting: boolean;
  quizResult?: {
    isPassed: boolean;
    score: number;
    xpAwarded?: number;
    evaluatedResponses?: Array<{
      questionId: string;
      isCorrect: boolean;
      explanation: string;
      correctOption?: string;
    }>;
  } | null;
}

export function QuizRenderer({
  quiz,
  quizResponses,
  onSelectOption,
  onSubmitQuiz,
  isSubmitting,
  quizResult,
}: QuizRendererProps) {
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-[#E3E7F0] dark:border-slate-800">
        <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Assessment Questions</h3>
        <p className="text-xs text-slate-500 mt-1">This milestone has no active quiz attached. You may advance to the next stage.</p>
      </div>
    );
  }

  const allAnswered = quiz.questions.every((q) => Boolean(quizResponses[q.id]));
  const answeredCount = Object.keys(quizResponses).length;

  return (
    <article className="flex flex-col gap-6 animate-fadeIn">
      {/* Stage Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl sm:text-2xl font-bold text-[#17172A] dark:text-white tracking-tight">
            {quiz.title || 'Knowledge Verification'}
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F0EEFF] dark:bg-indigo-950/60 text-[#5144E8] dark:text-indigo-300">
            {answeredCount} of {quiz.questions.length} Answered
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#62647A] dark:text-slate-400 leading-relaxed">
          Verify your retention before updating your continuous competency graph.
        </p>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {quiz.questions.map((q, idx) => {
          const selectedOption = quizResponses[q.id];
          const evaluated = quizResult?.evaluatedResponses?.find((er) => er.questionId === q.id);

          return (
            <div
              key={q.id}
              className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-[#E3E7F0] dark:border-slate-800 shadow-sm flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6D5EF7] block">
                  Question {idx + 1}
                </span>
                {evaluated && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      evaluated.isCorrect
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {evaluated.isCorrect ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> Needs Review
                      </>
                    )}
                  </span>
                )}
              </div>

              <h3 className="text-sm sm:text-base font-semibold text-[#17172A] dark:text-white leading-relaxed">
                {q.questionText}
              </h3>

              {/* Options */}
              <div className="space-y-2.5">
                {q.options?.map((opt, optIdx) => {
                  const isSelected = selectedOption === opt;
                  const isSubmitted = Boolean(quizResult);

                  let borderClass = 'border-[#E3E7F0] dark:border-slate-800 hover:border-[#6D5EF7]/40 bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-200';
                  let badgeClass = 'border-slate-300 dark:border-slate-700 text-slate-500';

                  if (isSubmitted) {
                    if (isSelected && evaluated?.isCorrect) {
                      borderClass = 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold';
                      badgeClass = 'border-emerald-500 bg-emerald-600 text-white';
                    } else if (isSelected && !evaluated?.isCorrect) {
                      borderClass = 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 font-semibold';
                      badgeClass = 'border-rose-500 bg-rose-600 text-white';
                    }
                  } else if (isSelected) {
                    borderClass = 'border-[#6D5EF7] bg-[#F0EEFF]/70 dark:bg-indigo-950/40 text-[#17172A] dark:text-white font-semibold ring-2 ring-[#6D5EF7]/20';
                    badgeClass = 'border-[#6D5EF7] bg-[#6D5EF7] text-white';
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => onSelectOption(q.id, opt)}
                      className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm transition-all duration-200 flex items-center justify-between gap-3 ${borderClass}`}
                    >
                      <span className="leading-snug">{opt}</span>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-xs transition-colors ${badgeClass}`}
                      >
                        {isSelected && '✓'}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Individual Question Explanation after submission */}
              {evaluated?.explanation && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
                  <strong className="text-slate-900 dark:text-white font-semibold block mb-0.5">
                    Concept Rationale:
                  </strong>
                  {evaluated.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Evaluation Results Banner & Action */}
      {quizResult ? (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-white to-[#F0EEFF]/40 dark:from-slate-900 dark:to-indigo-950/30 border border-[#6D5EF7]/30 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-bold text-[#17172A] dark:text-white">
                Score: {quizResult.score}%
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  quizResult.isPassed
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                }`}
              >
                {quizResult.isPassed ? 'Passed' : 'Needs Review'}
              </span>
            </div>
            <p className="text-xs text-[#62647A] dark:text-slate-400">
              {quizResult.isPassed
                ? 'Your answers have been recorded in your knowledge graph. Continue to synthesis!'
                : 'Review the explanations above to solidify any missed concepts before moving forward.'}
            </p>
          </div>

          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            +{quizResult.xpAwarded || 50} XP Awarded
          </span>
        </div>
      ) : (
        <div className="pt-2">
          <Button
            size="lg"
            onClick={onSubmitQuiz}
            isLoading={isSubmitting}
            disabled={!allAnswered || isSubmitting}
            className="w-full bg-[#17172A] hover:bg-slate-800 dark:bg-[#6D5EF7] dark:hover:bg-[#5144E8] text-white font-semibold py-3.5 shadow-md"
          >
            <span>Submit Verification</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </article>
  );
}
