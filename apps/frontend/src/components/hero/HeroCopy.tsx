'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { FeatureIndicators } from './FeatureIndicators';
import { EditorialTeaser } from './EditorialTeaser';

export function HeroCopy() {
  const { user } = useAuth();
  const ctaLink = user ? '/today' : '/onboarding';

  return (
    <div className="flex flex-col justify-between h-full py-1 lg:py-2 pr-0 lg:pr-6 xl:pr-10">
      {/* Brand Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 group focus:outline-none"
          aria-label="Companion AI home"
        >
          {/* Two-part abstract symbol using overlapping black & lime shapes */}
          <div className="relative w-8 h-6 flex items-center justify-center">
            {/* Black pill */}
            <span className="absolute left-0 top-0.5 w-5 h-3.5 rounded-full bg-[#111111] opacity-90 rotate-[-15deg] transition-transform group-hover:scale-105" />
            {/* Lime pill */}
            <span className="absolute right-0 bottom-0.5 w-5 h-3.5 rounded-full bg-[#d8ff19] border border-[#111111]/20 shadow-sm rotate-[15deg] transition-transform group-hover:scale-105" />
          </div>

          <span className="font-black text-xl sm:text-2xl tracking-tight text-[#111111] lowercase">
            companion ai
          </span>
        </Link>
      </div>

      {/* Main Copy Content */}
      <div className="my-auto pt-7 sm:pt-10 pb-5">
        {/* Eyebrow */}
        <p className="text-xs sm:text-[13px] font-black tracking-widest text-[#111111] uppercase mb-3 sm:mb-4">
          Your AI learning companion
        </p>

        {/* Oversized Editorial Headline */}
        <h1 className="text-[40px] sm:text-[52px] md:text-[60px] lg:text-[62px] xl:text-[68px] font-black text-[#111111] leading-[0.98] tracking-[-0.04em] max-w-xl">
          Your goals.
          <br />
          Your pace.
          <br />
          <span className="whitespace-nowrap">Your AI learning</span>
          <br />
          <span className="relative inline-block">
            companion.
            {/* Lime-to-black curved underline */}
            <svg
              viewBox="0 0 320 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-auto overflow-visible pointer-events-none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="curve-gradient" x1="0" y1="0" x2="320" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#d8ff19" />
                  <stop offset="100%" stopColor="#111111" />
                </linearGradient>
              </defs>
              <path
                d="M 4 14 C 90 20, 220 20, 316 6"
                stroke="url(#curve-gradient)"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>

        {/* Supporting Paragraph */}
        <p className="mt-5 sm:mt-6 text-base sm:text-lg lg:text-[18.5px] text-[#686860] max-w-lg leading-relaxed font-normal">
          A personal learning path that adapts to your goals, your progress, and
          the way you learn — one focused session at a time.
        </p>

        {/* Primary CTA */}
        <div className="mt-7 sm:mt-8">
          <Link
            href={ctaLink}
            className="group inline-flex items-center gap-4 sm:gap-5 pl-7 pr-2.5 py-2.5 rounded-full bg-[#111111] hover:bg-black text-[#d8ff19] font-black text-xs sm:text-[13px] tracking-wider uppercase shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#d8ff19] focus:ring-offset-2"
          >
            <span>START YOUR JOURNEY</span>
            <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#d8ff19] text-[#111111] flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shadow-sm">
              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </span>
          </Link>
        </div>

        {/* Feature Indicators */}
        <FeatureIndicators />
      </div>

      {/* Bottom Editorial Feature Teaser */}
      <EditorialTeaser />
    </div>
  );
}
