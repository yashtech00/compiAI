'use client';

import React from 'react';
import { Brain, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ExplainBackRendererProps {
  conceptName: string;
  userExplanation: string;
  onExplanationChange: (val: string) => void;
  onSubmit: () => void;
  isEvaluating: boolean;
  evaluation?: {
    overallScore: number;
    accuracyScore: number;
    completenessScore: number;
    clarityScore: number;
    feedback: string;
  } | null;
}

export function ExplainBackRenderer({
  conceptName,
  userExplanation,
  onExplanationChange,
  onSubmit,
  isEvaluating,
  evaluation,
}: ExplainBackRendererProps) {
  const minLength = 20;
  const isReady = userExplanation.trim().length >= minLength;

  return (
    <article className="flex flex-col gap-6 animate-fadeIn">
      {/* Stage Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#17172A] dark:text-white tracking-tight">
          Active Synthesis: Explain It Back
        </h2>
        <p className="text-xs sm:text-sm text-[#62647A] dark:text-slate-400 mt-1 leading-relaxed">
          The ultimate test of understanding: explain <strong className="text-[#5144E8] dark:text-indigo-400">{conceptName}</strong> in your own words.
        </p>
      </div>

      {/* Socratic Prompt Card */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-[#E3E7F0] dark:border-slate-800 shadow-sm flex flex-col gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#F0EEFF] dark:bg-indigo-950/60 text-[#5144E8] dark:text-indigo-400 border border-[#6D5EF7]/20 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5144E8] dark:text-indigo-400 block mb-1">
              Feynman Technique Prompt
            </span>
            <p className="text-sm font-semibold text-[#17172A] dark:text-white leading-relaxed">
              Imagine explaining {conceptName} to a junior engineer joining your team. What problem does it solve, how does data flow, and what happens when something fails?
            </p>
          </div>
        </div>

        {/* Input Area */}
        <div className="relative mt-2">
          <textarea
            rows={6}
            disabled={Boolean(evaluation) || isEvaluating}
            value={userExplanation}
            onChange={(e) => onExplanationChange(e.target.value)}
            placeholder="For example: When JavaScript executes asynchronous code, the call stack hands off tasks to..."
            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-[#17172A] dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D5EF7] focus:border-transparent transition-all leading-relaxed"
          />
          <div className="flex items-center justify-between text-[11px] text-[#62647A] dark:text-slate-400 mt-1.5 px-1">
            <span>
              {userExplanation.trim().length < minLength
                ? `Write at least ${minLength - userExplanation.trim().length} more characters to submit`
                : `${userExplanation.trim().length} characters written`}
            </span>
            <span className="text-slate-400">AI evaluated via Socratic rubric</span>
          </div>
        </div>

        {!evaluation && (
          <Button
            size="md"
            onClick={onSubmit}
            isLoading={isEvaluating}
            disabled={!isReady || isEvaluating}
            className="w-full sm:w-auto self-end bg-[#17172A] hover:bg-slate-800 dark:bg-[#6D5EF7] dark:hover:bg-[#5144E8] text-white font-semibold gap-2 mt-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Evaluate My Synthesis</span>
          </Button>
        )}
      </div>

      {/* Socratic Rubric Evaluation Results */}
      {evaluation && (
        <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-white to-[#F0EEFF]/50 dark:from-slate-900 dark:to-indigo-950/30 border border-[#6D5EF7]/30 shadow-md flex flex-col gap-5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-base text-[#17172A] dark:text-white">
                Socratic Rubric Evaluation
              </h3>
            </div>
            <span className="text-sm font-extrabold px-3 py-1 rounded-full bg-[#6D5EF7] text-white shadow-sm">
              Overall: {evaluation.overallScore}%
            </span>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-[#E3E7F0] dark:border-slate-800 text-center shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Accuracy</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{evaluation.accuracyScore}%</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-[#E3E7F0] dark:border-slate-800 text-center shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Completeness</span>
              <span className="text-lg font-bold text-sky-600 dark:text-sky-400">{evaluation.completenessScore}%</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-[#E3E7F0] dark:border-slate-800 text-center shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Clarity</span>
              <span className="text-lg font-bold text-[#5144E8] dark:text-indigo-400">{evaluation.clarityScore}%</span>
            </div>
          </div>

          {/* Feedback Body */}
          <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong className="text-slate-900 dark:text-white block mb-1 font-semibold">Tutor Feedback:</strong>
            {evaluation.feedback}
          </div>
        </div>
      )}
    </article>
  );
}
