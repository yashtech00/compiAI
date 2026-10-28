'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface LessonStageNavProps {
  currentStageIndex: number;
  totalStages: number;
  onPrev: () => void;
  onNext: () => void;
  onComplete: () => void;
  isNextDisabled?: boolean;
  isLoading?: boolean;
}

export function LessonStageNav({
  currentStageIndex,
  totalStages,
  onPrev,
  onNext,
  onComplete,
  isNextDisabled = false,
  isLoading = false,
}: LessonStageNavProps) {
  const isLastStage = currentStageIndex >= totalStages - 1;

  return (
    <footer className="w-full flex items-center justify-between pt-6 mt-8 border-t border-[#d9d9d2] select-none">
      <Button
        variant="outline"
        size="md"
        disabled={currentStageIndex === 0 || isLoading}
        onClick={onPrev}
        className="gap-2 border-[#d9d9d2] hover:bg-[#F1F1EC] text-[#111111] transition-all duration-200 font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Previous Stage</span>
        <span className="sm:hidden">Back</span>
      </Button>

      <div className="text-xs text-[#686860] font-bold hidden md:block">
        Step {currentStageIndex + 1} of {totalStages}
      </div>

      {isLastStage ? (
        <Button
          size="md"
          onClick={onComplete}
          isLoading={isLoading}
          className="gap-2 bg-[#15803d] hover:bg-[#166534] text-white font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5"
        >
          <span>Complete Session</span>
          <CheckCircle2 className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          size="md"
          disabled={isNextDisabled || isLoading}
          onClick={onNext}
          className="gap-2 bg-[#111111] hover:bg-black text-[#d8ff19] font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5"
        >
          <span>Next Stage</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}
    </footer>
  );
}

export default LessonStageNav;
