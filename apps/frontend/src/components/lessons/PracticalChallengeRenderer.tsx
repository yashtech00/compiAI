'use client';

import React, { useState } from 'react';
import { Award, HelpCircle, Eye, EyeOff, CheckCircle2, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PracticalChallengeRendererProps {
  prompt?: string;
  hint?: string;
  solution?: string;
  explanation?: string;
  onUseHint?: () => void;
}

export function PracticalChallengeRenderer({
  prompt,
  hint,
  solution,
  explanation,
  onUseHint,
}: PracticalChallengeRendererProps) {
  const [isSolutionRevealed, setIsSolutionRevealed] = useState(false);
  const [isHintRevealed, setIsHintRevealed] = useState(false);

  const handleRevealHint = () => {
    if (!isHintRevealed) {
      setIsHintRevealed(true);
      onUseHint?.();
    }
  };

  const handleToggleSolution = () => {
    setIsSolutionRevealed((prev) => !prev);
    if (!isSolutionRevealed) {
      onUseHint?.();
    }
  };

  return (
    <article className="flex flex-col gap-6 animate-fadeIn">
      {/* Stage Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#17172A] dark:text-white tracking-tight">
          Practical Architectural Challenge
        </h2>
        <p className="text-xs sm:text-sm text-[#62647A] dark:text-slate-400 mt-1 leading-relaxed">
          Test your design intuition by solving this real engineering constraint.
        </p>
      </div>

      {/* Challenge Prompt Card */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-[#E3E7F0] dark:border-slate-800 shadow-sm">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-1">
              Challenge Scenario
            </span>
            <p className="text-sm sm:text-base font-semibold text-[#17172A] dark:text-white leading-relaxed">
              {prompt || 'Analyze the system constraints and determine the optimal architecture pattern.'}
            </p>
          </div>
        </div>

        {/* Hint Section */}
        {hint && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {isHintRevealed ? (
              <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-300 leading-relaxed flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Architectural Hint:</span>
                  <span>{hint}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleRevealHint}
                className="inline-flex items-center gap-1.5 text-xs text-[#5144E8] dark:text-indigo-400 font-semibold hover:underline"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Need a hint? (Counts as 1 hint in session metrics)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Verified Solution Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="md"
            onClick={handleToggleSolution}
            className="gap-2 border-[#6D5EF7]/40 text-[#5144E8] dark:text-indigo-300 hover:bg-[#F0EEFF] dark:hover:bg-indigo-950/40"
          >
            {isSolutionRevealed ? (
              <>
                <EyeOff className="w-4 h-4" />
                <span>Hide Solution</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span>Reveal Verified Solution & Explanation</span>
              </>
            )}
          </Button>
        </div>

        {isSolutionRevealed && (
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#F0FDF4] via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 border border-emerald-300 dark:border-emerald-800/40 shadow-sm flex flex-col gap-4 animate-fadeIn">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
              <h3 className="font-bold text-sm">Verified Engineering Solution</h3>
            </div>

            {solution && (
              <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
                <div className="flex items-center gap-1.5 text-slate-500 mb-2 pb-2 border-b border-slate-800 text-[11px]">
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Production Implementation</span>
                </div>
                <pre>{solution}</pre>
              </div>
            )}

            {explanation && (
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white/80 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <strong className="text-slate-900 dark:text-white font-semibold">Solution Rationale: </strong>
                {explanation}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
