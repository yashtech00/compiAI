'use client';

import React from 'react';
import { BookOpen, Code2, Box, BarChart3 } from 'lucide-react';

export interface StageCardProps {
  stage: 1 | 2 | 3 | 4;
  title: string;
  subtitle: string;
  className?: string;
}

export function LearningStageCard({ stage, title, subtitle, className = '' }: StageCardProps) {
  const getIcon = () => {
    switch (stage) {
      case 1:
        return <BookOpen className="w-5 h-5 text-[#111111]" />;
      case 2:
        return <Code2 className="w-5 h-5 text-[#111111]" />;
      case 3:
        return <Box className="w-5 h-5 text-[#111111]" />;
      case 4:
        return <BarChart3 className="w-5 h-5 text-[#111111]" />;
    }
  };

  return (
    <div
      className={`glass-step-card flex items-center justify-between gap-3.5 p-3 sm:p-3.5 rounded-2xl bg-white border border-[#d9d9d2] shadow-sm cursor-default select-none ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Icon badge */}
        <div className="w-10 h-10 rounded-xl bg-[#F8F8F4] border border-[#d9d9d2] flex items-center justify-center shrink-0 shadow-xs">
          {getIcon()}
        </div>

        {/* Text */}
        <div className="flex flex-col min-w-0 pr-2">
          <span className="text-sm font-black text-[#111111] tracking-tight leading-tight">
            {title}
          </span>
          <span className="text-[11px] text-[#686860] font-bold tracking-wider uppercase mt-0.5">
            {subtitle}
          </span>
        </div>
      </div>

      {/* Level & Wave Indicator */}
      <div className="text-right shrink-0 flex flex-col items-end">
        <svg className="w-8 h-3 text-[#15803d]" viewBox="0 0 32 12" fill="none">
          <path d="M1 8C5 2 9 2 13 8C17 14 21 14 25 8C27 5 29 5 31 8" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] font-black text-[#15803d] mt-0.5">
          Level {stage}
        </span>
      </div>
    </div>
  );
}
