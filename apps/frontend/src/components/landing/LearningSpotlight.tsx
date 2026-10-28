'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function LearningSpotlight() {
  return (
    <section id="features" className="w-full bg-[#FFFFFF] py-20 px-4 sm:px-6 lg:px-8 border-t border-[#F0F0F0] scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-12"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-[#777777] mb-2 block">
            Adaptive Learning Engine
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111] tracking-tight leading-[1.15]">
            Master Complex Concepts <br className="hidden sm:inline" />
            Faster with Socratic AI
          </h2>
        </motion.div>

        {/* 2 Wide Feature Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Card 1: Adaptive Knowledge Graphs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            whileHover={{ y: -4 }}
            className="group relative bg-[#F8F9FA] hover:bg-[#F5F6F8] border border-[#E9ECEF] rounded-[32px] p-8 sm:p-10 flex flex-col justify-between overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 min-h-[310px]"
          >
            <div className="relative z-10 max-w-[270px] sm:max-w-[310px]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#666666] font-semibold block mb-2">
                Knowledge Graphs
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight mb-3">
                Strict Dependency Roadmaps
              </h3>
              <p className="text-[#666666] text-sm sm:text-[15px] leading-relaxed mb-8">
                Concepts are mapped with strict prerequisites. We verify foundational mental models before unlocking distributed systems or advanced neural architectures.
              </p>
              <Link
                href="/roadmap"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#111111] group-hover:text-[#315EF7] transition-colors"
              >
                <span>Explore Roadmaps</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Graphic: Neo-Brutalist Organic Lime & Black Shapes with Doodle Line */}
            <div className="absolute right-0 bottom-0 w-[200px] sm:w-[240px] h-[200px] sm:h-[230px] pointer-events-none select-none overflow-hidden">
              <svg viewBox="0 0 240 230" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Lime Organic Polygon/Blob */}
                <motion.path
                  d="M110 30 C160 10, 230 40, 235 110 C240 180, 190 225, 140 220 C90 215, 75 160, 80 110 C85 60, 60 50, 110 30 Z"
                  fill="#D4F82A"
                  animate={{ scale: [1, 1.03, 1], rotate: [0, 1.5, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Obsidian Asymmetric Pebble */}
                <motion.path
                  d="M135 145 C155 130, 195 140, 205 175 C215 210, 175 235, 145 230 C115 225, 110 190, 120 165 C125 150, 125 155, 135 145 Z"
                  fill="#111111"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Hand-drawn loop/squiggle line */}
                <motion.path
                  d="M175 140 C190 120, 205 135, 190 155 C175 175, 160 150, 185 135 C200 125, 210 145, 195 160"
                  stroke="#111111"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  animate={{ pathLength: [0.8, 1, 0.8] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
              </svg>
            </div>
          </motion.div>

          {/* Card 2: Retention Analytics in Your App */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
            whileHover={{ y: -4 }}
            className="group relative bg-[#F8F9FA] hover:bg-[#F5F6F8] border border-[#E9ECEF] rounded-[32px] p-8 sm:p-10 flex flex-col justify-between overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 min-h-[310px]"
          >
            <div className="relative z-10 max-w-[270px] sm:max-w-[310px]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#666666] font-semibold block mb-2">
                Memory Decay Modeling
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight mb-3">
                Retention & Mastery Analytics
              </h3>
              <p className="text-[#666666] text-sm sm:text-[15px] leading-relaxed mb-8">
                Every quiz interaction updates your personalized forgetting curve. We schedule micro-recalls precisely when memory strength begins to decay.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#111111] group-hover:text-[#315EF7] transition-colors"
              >
                <span>View Analytics</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Graphic: Segmented Donut Arc with Trending Arrow */}
            <div className="absolute right-0 bottom-0 w-[190px] sm:w-[220px] h-[190px] sm:h-[220px] pointer-events-none select-none">
              <svg viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Segment 1: Neon Lime Arc (Top) */}
                <path
                  d="M 125 55 A 75 75 0 0 1 180 82"
                  stroke="#D4F82A"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                {/* Segment 2: Deep Obsidian Arc (Right) */}
                <path
                  d="M 197 100 A 75 75 0 0 1 190 185"
                  stroke="#111111"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                {/* Segment 3: Coral Red Arc (Left) */}
                <path
                  d="M 110 200 A 75 75 0 0 1 110 135"
                  stroke="#FF6B6B"
                  strokeWidth="14"
                  strokeLinecap="round"
                />

                {/* Inside Sparkline & Arrow */}
                <g transform="translate(130, 130)">
                  <motion.path
                    d="M 5 25 Q 12 18 18 22 T 30 14 T 42 6"
                    fill="none"
                    stroke="#111111"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    animate={{ pathLength: [0.6, 1, 0.6] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {/* Arrow head */}
                  <path
                    d="M 36 6 L 42 6 L 42 12"
                    fill="none"
                    stroke="#111111"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </svg>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default LearningSpotlight;
