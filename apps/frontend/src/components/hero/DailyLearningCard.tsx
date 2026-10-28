'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export function DailyLearningCard() {
  return (
    <div className="glass-surface-panel rounded-[26px] p-5 sm:p-6 text-white flex flex-col justify-between min-h-[170px] sm:min-h-[195px] relative group transition-all duration-300 hover:bg-white/35">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold tracking-tight text-white drop-shadow-sm">
            Learn in focused sessions
          </h3>
          <p className="text-xs sm:text-[13px] text-white/80 font-normal mt-0.5">
            Build a habit that lasts.
          </p>
        </div>

        {/* Action arrow button */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-[#101018] flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
        </div>
      </div>

      {/* Circular Progress Display */}
      <div className="relative mt-2 flex items-center justify-center">
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <defs>
              <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#d8ff19" />
              </linearGradient>
            </defs>
            {/* Background Track */}
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="rgba(255, 255, 255, 0.22)"
              strokeWidth="9"
            />
            {/* Active Progress Arc (approx 75% completed) */}
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="url(#ring-grad)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray="230 302"
              className="drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none drop-shadow-sm">
              15 min
            </span>
            <span className="text-[11px] text-white/85 font-medium mt-1">
              daily learning
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
