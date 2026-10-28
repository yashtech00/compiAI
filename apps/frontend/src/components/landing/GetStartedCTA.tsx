'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export function GetStartedCTA() {
  return (
    <section className="relative w-full bg-[#FFFFFF] pt-16 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden text-center">
      {/* Decorative Organic Curved Line Leading Downward */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 pointer-events-none select-none">
        <svg viewBox="0 0 200 90" fill="none" className="w-full h-full">
          <path
            d="M 120 0 C 120 40, 80 50, 100 85"
            stroke="#111111"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto relative z-10 pt-8">
        <span className="text-xs font-bold uppercase tracking-wider text-[#777777] mb-3 inline-block">
          Begin Your Learning Journey
        </span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111] tracking-tight leading-[1.2] max-w-xl mx-auto mb-4"
        >
          Start Your AI Learning <br />
          Journey for Free Today
        </motion.h2>

        <p className="text-[#666666] text-sm sm:text-base max-w-lg mx-auto mb-8 font-normal">
          Take the 3-minute diagnostic test to map your current software engineering knowledge and discover your custom roadmap.
        </p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {/* Primary Action Button */}
          <Link
            href="/signup"
            className="inline-flex items-center gap-2.5 bg-[#111111] hover:bg-[#252525] active:bg-[#000000] text-white px-7 py-3.5 rounded-full font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
          >
            <Sparkles className="w-4 h-4 text-[#D4F82A]" />
            <span>Start Learning Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Secondary Web Access Button */}
          <Link
            href="/assessment"
            className="inline-flex items-center gap-2 bg-[#F4F5F7] hover:bg-[#EAECEF] text-[#111111] px-6 py-3.5 rounded-full font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5"
          >
            <span>Take 3-Min Assessment</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

export default GetStartedCTA;
