'use client';

import React from 'react';
import { ArrowRight, CheckCircle2, Calendar, ShieldCheck, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SessionCompletedViewProps {
  conceptName: string;
  earnedXp: number;
  quizResult?: {
    isPassed: boolean;
    score: number;
  } | null;
  onReturnToToday: () => void;
}

export function SessionCompletedView({
  conceptName,
  earnedXp,
  quizResult,
  onReturnToToday,
}: SessionCompletedViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 max-w-2xl mx-auto w-full select-none">
      <div className="w-full p-8 sm:p-10 rounded-3xl bg-white border border-[#d9d9d2] shadow-sm text-center relative overflow-hidden">
        {/* Celebratory Icon */}
        <div className="relative z-10 mx-auto w-20 h-20 rounded-2xl bg-[#d8ff19]/30 border border-[#111111]/20 flex items-center justify-center mb-5 text-[#111111]">
          <Trophy className="w-10 h-10 text-[#111111]" />
        </div>

        {/* Milestone Completed Badges */}
        <div className="relative z-10 flex items-center justify-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d8ff19]/30 text-[#111111] text-xs font-bold border border-[#111111]/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#15803d]" />
            Daily Session Completed
          </span>
          {quizResult && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#111111] text-[#d8ff19] text-xs font-black">
              Score: {quizResult.score}%
            </span>
          )}
        </div>

        <h1 className="relative z-10 text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
          Outstanding Progression!
        </h1>
        <p className="relative z-10 text-xs sm:text-sm text-[#686860] mt-2 max-w-md mx-auto leading-relaxed">
          You successfully completed today&apos;s adaptive learning milestone on{' '}
          <strong className="text-[#111111] font-bold underline decoration-[#d8ff19] decoration-2">{conceptName}</strong>.
        </p>

        {/* Evidence & Metrics Matrix */}
        <div className="relative z-10 my-7 p-6 rounded-2xl bg-[#F8F8F4] border border-[#d9d9d2] grid grid-cols-2 gap-4 divide-x divide-[#d9d9d2]">
          <div className="text-center pr-2">
            <div className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
              +{earnedXp} XP
            </div>
            <div className="text-xs text-[#686860] font-bold mt-1">
              Competency Evidence
            </div>
          </div>

          <div className="text-center pl-4">
            <div className="text-xl sm:text-2xl font-black text-[#15803d] flex items-center justify-center gap-1.5">
              <Calendar className="w-5 h-5 text-[#15803d]" />
              <span>In 3 Days</span>
            </div>
            <div className="text-xs text-[#686860] font-bold mt-1">
              Spaced Recall Scheduled
            </div>
          </div>
        </div>

        {/* What Happens Next Guidance */}
        <div className="relative z-10 p-4 rounded-2xl bg-[#F8F8F4] border border-[#d9d9d2] text-left mb-7 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#15803d] shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-black text-[#111111] block mb-0.5">
              What Happens Next?
            </span>
            <p className="text-xs text-[#686860] leading-relaxed">
              Your concept mastery has been committed to your skill graph. Tomorrow morning, your adaptive companion will determine whether to reinforce this concept, deliver a retrieval practice, or unlock your next prerequisite.
            </p>
          </div>
        </div>

        {/* Return Button */}
        <Button
          size="lg"
          onClick={onReturnToToday}
          className="w-full gap-2 text-base font-black bg-[#111111] hover:bg-black text-[#d8ff19] shadow-sm"
        >
          <span>Return to Today&apos;s Learning</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default SessionCompletedView;
