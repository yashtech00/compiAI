'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export function HeroIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Respect prefers-reduced-motion and touch devices
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isTouch = 'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);

    if (mediaQuery.matches || isTouch) {
      return;
    }

    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Only calculate if visible in viewport
      if (rect.top > window.innerHeight || rect.bottom < 0) return;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      // Gentle dampening: max 3px movement to preserve stability
      const targetX = ((e.clientX - centerX) / centerX) * 3;
      const targetY = ((e.clientY - centerY) / centerY) * 2;

      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        setOffset({ x: targetX, y: targetY });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 w-full relative select-none overflow-hidden hero-illustration-reveal"
      style={{
        contain: 'layout paint',
      }}
    >
      {/* 
        Flexible viewport-fitting illustration layer:
        - Occupies exactly the remaining vertical height of the viewport
        - Never overflows or pushes below the fold on desktop
        - Mobile: object-cover object-[50%_bottom] preserves central student prominence
        - Desktop: object-contain object-bottom preserves the full crowd framing
      */}
      <div
        className="relative w-full h-full max-w-[1536px] mx-auto flex items-end justify-center transition-transform duration-700 ease-out"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          willChange: 'transform',
        }}
      >
        <Image
          src="/images/image.png"
          alt="Adaptive learning companion illustration: a colorful student standing out from a monochrome crowd, surrounded by radiating symbols of curiosity, books, technology, and learning"
          fill
          priority
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1536px"
          className="object-cover object-[50%_bottom] sm:object-contain sm:object-bottom pointer-events-none select-none"
        />

        {/* Subtle, seamless bottom blend into white page background */}
        <div className="absolute inset-x-0 bottom-0 h-6 sm:h-10 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

export default HeroIllustration;
