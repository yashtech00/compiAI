'use client';

import React from 'react';
import { Compass, Sparkles, ShieldCheck } from 'lucide-react';

const indicators = [
  {
    icon: Compass,
    label: 'Personalized learning path',
  },
  {
    icon: Sparkles,
    label: 'AI-powered adaptation',
  },
  {
    icon: ShieldCheck,
    label: 'Safe and private data',
  },
];

export function FeatureIndicators() {
  return (
    <div className="mt-7 flex flex-wrap items-center gap-x-3.5 sm:gap-x-4 gap-y-2 text-[#111111]">
      {indicators.map((item, index) => {
        const Icon = item.icon;
        return (
          <React.Fragment key={item.label}>
            <div className="inline-flex items-center gap-2 group">
              <span className="w-6 h-6 rounded-full bg-[#d8ff19]/30 border border-[#111111]/15 text-[#111111] flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110">
                <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="text-xs font-bold text-[#111111] tracking-tight whitespace-nowrap">
                {item.label}
              </span>
            </div>
            {index < indicators.length - 1 && (
              <span className="hidden sm:block w-px h-3.5 bg-[#d9d9d2]" aria-hidden="true" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
