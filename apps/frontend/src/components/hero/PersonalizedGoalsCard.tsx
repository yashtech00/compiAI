'use client';

import React from 'react';
import { ArrowUpRight, GraduationCap, Briefcase, Palette, Dumbbell } from 'lucide-react';

const goalIcons = [
  {
    icon: GraduationCap,
    label: 'Academic & Foundation',
    bg: 'bg-[#111111]',
    text: 'text-white',
  },
  {
    icon: Briefcase,
    label: 'Career Growth',
    bg: 'bg-[#d8ff19]',
    text: 'text-[#111111]',
  },
  {
    icon: Palette,
    label: 'Creative & Design',
    bg: 'bg-white',
    text: 'text-[#111111]',
  },
  {
    icon: Dumbbell,
    label: 'Discipline & Skills',
    bg: 'bg-[#15803d]',
    text: 'text-white',
  },
];

export function PersonalizedGoalsCard() {
  return (
    <div className="glass-surface-panel rounded-[26px] p-5 sm:p-6 text-white flex flex-col justify-between min-h-[170px] sm:min-h-[195px] relative group transition-all duration-300 hover:bg-white/35">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-black tracking-tight text-white drop-shadow-sm">
            A path built around you
          </h3>
          <p className="text-xs sm:text-[13px] text-white/85 font-bold mt-0.5">
            Your goals
          </p>
        </div>

        {/* Action arrow button */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-[#111111] flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
          <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
        </div>
      </div>

      {/* 4 Theme Interest Icons with borders */}
      <div className="mt-5 flex items-center">
        {goalIcons.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              title={item.label}
              className={`relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full ${item.bg} ${item.text} border-2 border-[#111111] shadow-md transition-transform hover:scale-110 hover:z-10`}
              style={{
                marginLeft: index === 0 ? '0px' : '-8px',
                zIndex: index,
              }}
            >
              <Icon className="w-5 h-5 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
