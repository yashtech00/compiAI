'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Cpu, Database, Network, ArrowRight, Sparkles } from 'lucide-react';

export function RealTimeShowcase() {
  return (
    <section className="w-full bg-[#FFFFFF] pt-20 pb-24 px-4 sm:px-6 lg:px-8 border-t border-[#F0F0F0] overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-28 sm:space-y-32">
        
        {/* Row 1: Learn in Real Time */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Graphic: Layered Dark Card over Tilted Lime Accent */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="lg:col-span-5 relative flex items-center justify-center"
          >
            {/* Tilted Lime Background Accent Card */}
            <div className="absolute w-[290px] sm:w-[340px] h-[190px] sm:h-[220px] rounded-[26px] bg-[#D4F82A] -top-3 -left-3 sm:-top-4 sm:-left-4 transform -rotate-2 pointer-events-none" />

            {/* Foreground Pitch Black Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 w-[290px] sm:w-[340px] bg-[#111111] text-white rounded-[24px] p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.22)] border border-[#222222]"
            >
              {/* Header metrics */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#D4F82A] animate-pulse" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#999999]">Real-Time Mastery</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-white block">Level 4</span>
                  <span className="text-[10px] font-mono text-[#D4F82A]">98.4% Retention</span>
                </div>
              </div>

              {/* Chart Line Visual */}
              <div className="w-full h-28 relative">
                <svg viewBox="0 0 300 120" className="w-full h-full overflow-visible" fill="none">
                  <line x1="0" y1="30" x2="300" y2="30" stroke="#252525" strokeDasharray="3 3" />
                  <line x1="0" y1="70" x2="300" y2="70" stroke="#252525" strokeDasharray="3 3" />

                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4F82A" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#D4F82A" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <motion.path
                    d="M 0 95 L 30 75 L 60 85 L 90 60 L 120 70 L 150 45 L 180 55 L 210 30 L 240 40 L 270 20 L 300 15 L 300 120 L 0 120 Z"
                    fill="url(#chartGradient)"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                  />

                  <motion.path
                    d="M 0 95 L 30 75 L 60 85 L 90 60 L 120 70 L 150 45 L 180 55 L 210 30 L 240 40 L 270 20 L 300 15"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: 'easeInOut' }}
                  />

                  <circle cx="300" cy="15" r="4.5" fill="#D4F82A" className="animate-ping" opacity="0.75" />
                  <circle cx="300" cy="15" r="3.5" fill="#D4F82A" />
                </svg>
              </div>

              {/* Bottom Card Pill Note */}
              <div className="mt-3 pt-3 border-t border-[#222222] flex items-center justify-between text-[11px] text-[#888888]">
                <span>Socratic Prompt</span>
                <span className="text-[#D4F82A] font-medium">Concept Verified ✓</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Text */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="lg:col-span-7"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[#777777] mb-2 block">
              Dynamic Adaptation
            </span>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111] tracking-tight leading-[1.15] mb-5">
              Learn in Real Time
            </h3>
            <p className="text-[#666666] text-base sm:text-lg leading-relaxed max-w-xl font-normal">
              No more passive watching or endless tutorials. Every quiz response and code explanation is evaluated immediately. Your AI Companion continuously calibrates problem difficulty to your cognitive growth curve.
            </p>
          </motion.div>
        </div>

        {/* Row 2: 10,000+ Topics & Roadmaps with Seamless Flowing Line connecting into CTA */}
        <div className="relative pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="lg:col-span-6 pt-4"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-[#777777] mb-2 block">
                Curated Roadmaps
              </span>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111] tracking-tight leading-[1.15] mb-5">
                10,000+ Topics & Concept Roadmaps
              </h3>
              <p className="text-[#666666] text-base sm:text-lg leading-relaxed max-w-xl font-normal">
                Access comprehensive curricula across Backend Systems, AI Engineering, Full-Stack Architecture, and Cloud Infrastructure. Discover the exact conceptual path that powers your career goals.
              </p>
            </motion.div>

            {/* Right Graphic: Lime Disc, Playfully Tilted Floating Cards, & Seamless Connecting Line */}
            <div className="lg:col-span-6 relative flex items-center justify-center min-h-[360px]">
              {/* Large Neon Lime Circle Disc */}
              <div className="absolute right-0 sm:right-4 top-4 w-52 sm:w-64 h-52 sm:h-64 rounded-full bg-[#D4F82A] pointer-events-none select-none z-0" />

              {/* 3 Staggered, Playfully Tilted Floating Cards */}
              <div className="relative z-10 w-full max-w-sm sm:max-w-md space-y-4">
                {/* Card 1: System Design (tilted slightly up to the right) */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  whileHover={{ y: -3, scale: 1.02 }}
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-[#E8E8E8] shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex items-center justify-between transition-all transform -rotate-2 hover:rotate-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F4F5F7] flex items-center justify-center text-[#111111] shrink-0">
                      <Network className="w-5 h-5 text-[#111111]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#111111]">System Architecture</h4>
                      <span className="text-[10.5px] font-mono text-[#888888]">DISTRIBUTED</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg width="44" height="18" viewBox="0 0 48 18" fill="none">
                      <path d="M 2 14 Q 14 2 26 12 T 46 4" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-[#111111]">Level 4</span>
                      <span className="block text-[10px] font-mono text-emerald-600 font-medium">96% Mastered</span>
                    </div>
                  </div>
                </motion.div>

                {/* Card 2: Neural Networks & RAG (tilted slightly down to the right) */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  whileHover={{ y: -3, scale: 1.02 }}
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-[#E8E8E8] shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex items-center justify-between transition-all transform rotate-2 hover:rotate-0 ml-4 sm:ml-8"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F4F5F7] flex items-center justify-center text-[#111111] shrink-0">
                      <Cpu className="w-5 h-5 text-[#111111]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#111111]">Neural Models & RAG</h4>
                      <span className="text-[10.5px] font-mono text-[#888888]">AI / ML</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg width="44" height="18" viewBox="0 0 48 18" fill="none">
                      <path d="M 2 8 Q 14 16 26 6 T 46 10" stroke="#315EF7" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-[#111111]">12 Lessons</span>
                      <span className="block text-[10px] font-mono text-[#315EF7] font-medium">In Progress</span>
                    </div>
                  </div>
                </motion.div>

                {/* Card 3: Database Indexing (tilted slightly up) */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  whileHover={{ y: -3, scale: 1.02 }}
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-[#E8E8E8] shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex items-center justify-between transition-all transform -rotate-1 hover:rotate-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F4F5F7] flex items-center justify-center text-[#111111] shrink-0">
                      <Database className="w-5 h-5 text-[#111111]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#111111]">Relational Query Tuning</h4>
                      <span className="text-[10.5px] font-mono text-[#888888]">POSTGRES</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg width="44" height="18" viewBox="0 0 48 18" fill="none">
                      <path d="M 2 12 Q 14 4 26 10 T 46 2" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-[#111111]">Recall Ready</span>
                      <span className="block text-[10px] font-mono text-emerald-600 font-medium">+12 Day Streak</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* The Weaving Line within the Cards Area */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
                viewBox="0 0 400 360"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Loop 1: behind top card, dipping between card 1 and 2 */}
                <path
                  d="M 270 20 C 230 -10, 160 30, 200 95 C 230 145, 290 120, 260 180"
                  stroke="#111111"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Loop 2: weaves under card 2 and behind card 3 */}
                <path
                  d="M 260 180 C 230 220, 160 210, 150 260"
                  stroke="#111111"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>

          {/* Continuous Graceful Flowing Connector Line down to the CTA */}
          <div className="w-full flex justify-center pointer-events-none select-none -mt-4 sm:-mt-2 relative z-0">
            <svg
              className="w-48 sm:w-60 h-28 sm:h-36 overflow-visible"
              viewBox="0 0 160 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <motion.path
                d="M 120 0 C 105 35, 60 40, 75 75 C 82 92, 85 96, 85 100"
                stroke="#111111"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
              />
            </svg>
          </div>

          {/* Integrated Get Started CTA: Directly below the continuous flowing line */}
          <div className="max-w-3xl mx-auto text-center relative z-10 pt-2">
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111] tracking-tight leading-[1.18] mb-4"
            >
              Start Your AI Learning <br className="hidden sm:inline" />
              Journey for Free Today
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
              className="text-[#666666] text-sm sm:text-base max-w-lg mx-auto mb-8 font-normal"
            >
              Take the 3-minute diagnostic test to map your current software engineering knowledge and discover your custom roadmap.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3.5"
            >
              <Link
                href="/signup"
                className="inline-flex items-center gap-2.5 bg-[#111111] hover:bg-[#252525] active:bg-[#000000] text-white px-7 py-3.5 rounded-full font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              >
                <Sparkles className="w-4 h-4 text-[#D4F82A]" />
                <span>Start Learning Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/assessment"
                className="inline-flex items-center gap-2 bg-[#F4F5F7] hover:bg-[#EAECEF] text-[#111111] px-6 py-3.5 rounded-full font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5"
              >
                <span>Take 3-Min Assessment</span>
              </Link>
            </motion.div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default RealTimeShowcase;
