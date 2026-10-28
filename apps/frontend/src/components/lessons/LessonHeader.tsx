'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Clock, Bot } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface LessonHeaderProps {
  skillName?: string | null;
  conceptName: string;
  lessonTitle: string;
  stageTitle: string;
  stageNumber: number;
  totalStages: number;
  progressPercent: number;
  dailyMinutes: number;
  onOpenTutor: () => void;
}

export function LessonHeader({
  skillName,
  conceptName,
  lessonTitle,
  stageTitle,
  stageNumber,
  totalStages,
  progressPercent,
  dailyMinutes,
  onOpenTutor,
}: LessonHeaderProps) {
  return (
    <header className="w-full mb-6 select-none">
      {/* Breadcrumb & Pacing Meta */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#686860]">
          <Link
            href="/today"
            className="hover:text-[#111111] transition-colors font-medium"
          >
            Today
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[#686860]" />
          {skillName && (
            <>
              <span className="font-medium text-[#686860]">{skillName}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#686860]" />
            </>
          )}
          <span className="font-bold text-[#111111] truncate max-w-[200px] sm:max-w-none">
            {conceptName}
          </span>
        </nav>

        <div className="flex items-center gap-3 text-xs text-[#686860]">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-[#d9d9d2] font-semibold text-[#111111]">
            <Clock className="w-3 h-3 text-[#111111]" />
            {dailyMinutes} min session
          </span>
        </div>
      </div>

      {/* Main Title Row & AI Tutor Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#d9d9d2]">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#111111]">
            {lessonTitle}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#d8ff19]/30 text-[#111111] border border-[#111111]/20 text-xs font-bold">
              Stage {stageNumber}: {stageTitle}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenTutor}
          className="shrink-0 gap-2 border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-[#d8ff19] shadow-sm transition-all duration-200 hover:-translate-y-0.5 self-start sm:self-auto font-bold"
        >
          <Bot className="w-4 h-4" />
          <span>Ask AI Tutor</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d8ff19] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d8ff19]" />
          </span>
        </Button>
      </div>

      {/* Segmented Progress Tracker */}
      <div className="pt-3">
        <div className="flex items-center justify-between text-xs text-[#686860] mb-1.5 font-medium">
          <span className="font-bold text-[#111111]">
            Stage {stageNumber} of {totalStages}
          </span>
          <span className="text-[#15803d] font-black">
            {progressPercent}% Complete
          </span>
        </div>

        {/* Multi-segment step bar */}
        <div className="grid grid-cols-9 gap-1.5 w-full">
          {Array.from({ length: totalStages }).map((_, idx) => {
            const isCompleted = idx < stageNumber - 1;
            const isCurrent = idx === stageNumber - 1;

            return (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? 'bg-[#15803d]'
                    : isCurrent
                    ? 'bg-[#d8ff19] ring-2 ring-[#111111]'
                    : 'bg-[#d9d9d2]'
                }`}
                title={`Stage ${idx + 1}`}
              />
            );
          })}
        </div>
      </div>
    </header>
  );
}

export default LessonHeader;
