'use client';

import React, { useState, useEffect } from 'react';
import './companion-hero.css';
import { LandingNavbar } from './LandingNavbar';
import { HeroCTA } from './HeroCTA';
import { HeroIllustration } from './HeroIllustration';

const ROTATING_PHRASES = [
  'Your AI learning companion.',
  'Your future, reimagined.',
  'Your skills, evolving.',
  'Your path, personalized.',
  'Your potential, unlocked.',
] as const;

export function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Hold each phrase for ~2.8s + 0.6s transition = 3.4s interval
    const interval = setInterval(() => {
      setCurrentIndex((current) => {
        const next = (current + 1) % ROTATING_PHRASES.length;
        if (!mediaQuery.matches) {
          setPrevIndex(current);
          setIsTransitioning(true);
        }
        return next;
      });
    }, 3400);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isTransitioning) return;
    const timer = setTimeout(() => {
      setIsTransitioning(false);
      setPrevIndex(null);
    }, 600);

    return () => clearTimeout(timer);
  }, [isTransitioning]);

  return (
    <section className="relative w-full h-[100svh] min-h-[560px] max-h-[1050px] bg-[#FFFFFF] text-[#171717] overflow-hidden flex flex-col justify-between pt-0 pb-0">
      {/* 1. Subtle Black Grid Background Pattern & Central Spotlight */}
      <div className="hero-grid-pattern absolute inset-0 pointer-events-none z-0" aria-hidden="true" />
      <div className="hero-spotlight absolute inset-0 pointer-events-none z-0" aria-hidden="true" />

      {/* 2. Fixed Top Navigation (stays fixed at top of viewport across entire page) */}
      <LandingNavbar />

      {/* Spacer matching fixed navbar height with generous breathing room */}
      <div className="h-20 sm:h-24 flex-shrink-0 pointer-events-none" aria-hidden="true" />

      {/* 3. Compact Centered Content: 3-line headline with dynamic rotating phrase, copy, CTAs */}
      <div className="flex-shrink-0 relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-1 sm:pt-2 pb-1 sm:pb-2 flex flex-col items-center text-center">
        {/* Exact 3-line Headline scaled with clamp() to balance visibility with remaining height */}
        <h1
          className="font-extrabold tracking-[-0.035em] text-[#171717] leading-[1.1] flex flex-col items-center w-full"
          style={{
            fontSize: 'clamp(1.4rem, 3.5vw, 3.15rem)',
          }}
        >
          <span className="hero-headline-line-1 block">Your goals.</span>
          <span className="hero-headline-line-2 block text-[#15803d]">Your pace.</span>
          <span className="hero-headline-line-3 block w-full" aria-live="polite" aria-atomic="true">
            <span className="rotating-phrase-wrapper">
              {!isTransitioning ? (
                <span className="rotating-phrase-item phrase-current">
                  {ROTATING_PHRASES[currentIndex]}
                </span>
              ) : (
                <>
                  {prevIndex !== null && (
                    <span className="rotating-phrase-item phrase-exit-up" aria-hidden="true">
                      {ROTATING_PHRASES[prevIndex]}
                    </span>
                  )}
                  <span className="rotating-phrase-item phrase-enter-down">
                    {ROTATING_PHRASES[currentIndex]}
                  </span>
                </>
              )}
            </span>
          </span>
        </h1>

        {/* Supporting Copy: 2 lines maximum */}
        <p className="hero-copy-reveal mt-2 sm:mt-2.5 text-xs sm:text-sm md:text-[15px] text-[#626262] max-w-[580px] leading-snug sm:leading-relaxed font-normal">
          Build skills that matter with an AI companion that adapts to your goals, your pace, and your progress. Your journey is personal. Your potential is limitless.
        </p>

        {/* Action Buttons: Single row on desktop */}
        <div className="mt-2.5 sm:mt-3.5 w-full sm:w-auto">
          <HeroCTA />
        </div>
      </div>

      {/* 4. Flexible Remaining-Height Illustration: Fits completely inside initial viewport */}
      <HeroIllustration />
    </section>
  );
}

export default HeroSection;
