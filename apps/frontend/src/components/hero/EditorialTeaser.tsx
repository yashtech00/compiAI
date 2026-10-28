'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

export function EditorialTeaser() {
  return (
    <div className="mt-7 pt-5 border-t border-[#d9d9d2]">
      <a
        href="#how-it-works"
        className="group flex items-center gap-3.5 sm:gap-4 p-2 -m-2 rounded-2xl hover:bg-[#F1F1EC] transition-colors"
        aria-label="See how your AI companion builds your learning path - 2 min read"
      >
        {/* Orb Thumbnail */}
        <div className="relative shrink-0 w-[110px] sm:w-[130px] lg:w-[150px] h-[75px] sm:h-[85px] rounded-2xl overflow-hidden bg-[#F8F8F4] border border-[#d9d9d2] shadow-sm flex items-center justify-center p-1">
          <Image
            src="/images/ai-orb-3d.png"
            alt="Companion AI Orb Preview"
            width={130}
            height={130}
            className="w-[90px] sm:w-[105px] h-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Copy */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <h2 className="text-xs sm:text-sm font-bold text-[#111111] group-hover:text-black transition-colors leading-snug tracking-tight">
            See how your AI companion builds your learning path
          </h2>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#d8ff19] text-[#111111] text-[11px] font-black tracking-tight border border-[#111111]/20">
              2 min read
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="ml-auto shrink-0 w-8 h-8 rounded-full border border-[#d9d9d2] group-hover:border-[#111111] group-hover:bg-[#111111] flex items-center justify-center text-[#686860] group-hover:text-[#d8ff19] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
          <ArrowUpRight className="w-4 h-4 stroke-[2]" />
        </div>
      </a>
    </div>
  );
}
