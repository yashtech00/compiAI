'use client';

import React from 'react';
import Link from 'next/link';

export function HeroCTA() {
  const handleScrollToHowItWorks = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.querySelector('#how-it-works');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-row items-center justify-center gap-2.5 sm:gap-3.5 w-full sm:w-auto hero-cta-reveal">
      {/* Primary CTA */}
      <Link
        href="/signup"
        className="group inline-flex items-center justify-center gap-1.5 sm:gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[#111111] hover:bg-black active:bg-black text-[#d8ff19] font-black text-xs sm:text-sm shadow-sm hover:shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] shrink-0"
        id="hero-primary-cta"
      >
        <span>Start Your Learning Journey</span>
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-1"
        >
          →
        </span>
      </Link>

      {/* Secondary CTA */}
      <a
        href="#how-it-works"
        onClick={handleScrollToHowItWorks}
        className="inline-flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-white hover:bg-[#F1F1EC] text-[#111111] font-bold text-xs sm:text-sm border border-[#d9d9d2] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] shadow-xs shrink-0"
        id="hero-secondary-cta"
      >
        Discover How It Works
      </a>
    </div>
  );
}

export default HeroCTA;
