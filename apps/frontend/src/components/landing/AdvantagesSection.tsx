'use client';

import React from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { Check } from 'lucide-react';

interface AdvantageItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaText: string;
  href: string;
}

const ADVANTAGES: AdvantageItem[] = [
  {
    icon: (
      <svg className="w-4 h-4 text-[#111111]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17l9.2-9.2M17 17V7H7" />
      </svg>
    ),
    title: 'Diagnostic Baseline',
    description: 'Calibrate your technical proficiency in 3 minutes. Skip concepts you already know and target high-impact knowledge gaps.',
    ctaText: 'Take Assessment',
    href: '/assessment',
  },
  {
    icon: <span className="font-bold text-sm text-[#111111]">?</span>,
    title: 'Socratic AI Tutor',
    description: 'Our AI companion guides your thinking instead of dumping answers. Explain logic in your own words to verify true understanding.',
    ctaText: 'Ask AI Tutor',
    href: '/chat',
  },
  {
    icon: (
      <svg className="w-4 h-4 text-[#111111]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
        <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
      </svg>
    ),
    title: 'Zero Tutorial Hell',
    description: 'Break free from passive 40-hour video courses. Master software architecture through hands-on practice and active recall.',
    ctaText: 'Explore Paths',
    href: '/roadmap',
  },
  {
    icon: <Check className="w-4 h-4 text-[#111111] stroke-[2.8]" />,
    title: 'Personalized Daily Queue',
    description: 'Receive a curated 15-minute daily learning queue designed around spaced repetition to lock in concepts before memory decay.',
    ctaText: 'Start Learning',
    href: '/signup',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export function AdvantagesSection() {
  return (
    <section id="advantages" className="w-full bg-[#FFFFFF] py-24 px-4 sm:px-6 lg:px-8 border-t border-[#F0F0F0] scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Heading & Mission Note */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="lg:col-span-4"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-[#777777] mb-2 block">
              Cognitive Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111111] tracking-tight leading-[1.15]">
              Platform Advantages
            </h2>
            <p className="text-[#666666] text-base sm:text-[17px] mt-5 leading-relaxed font-normal">
              Built on cognitive science: active recall, spaced repetition, and Socratic dialogues that turn passive watchers into confident engineers.
            </p>
          </motion.div>

          {/* Right Column: 2x2 Grid with Crisp Dividing Borders */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-12 sm:gap-y-14"
          >
            {ADVANTAGES.map((adv, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="flex flex-col items-start group"
              >
                {/* Lime Icon Pill */}
                <div className="w-10 h-10 rounded-full bg-[#D4F82A] flex items-center justify-center shrink-0 mb-4 shadow-sm group-hover:scale-110 transition-transform duration-200">
                  {adv.icon}
                </div>

                {/* Title */}
                <h3 className="text-lg sm:text-xl font-bold text-[#111111] tracking-tight mb-2">
                  {adv.title}
                </h3>

                {/* Description */}
                <p className="text-[#666666] text-sm sm:text-[14.5px] leading-relaxed mb-5 min-h-[56px]">
                  {adv.description}
                </p>

                {/* Action Pill Button */}
                <Link
                  href={adv.href}
                  className="inline-flex items-center justify-center px-5 py-2 rounded-xl bg-[#F4F5F7] hover:bg-[#EAECEF] active:bg-[#DFE2E6] text-[#111111] text-xs sm:text-[13px] font-semibold transition-all duration-200 hover:-translate-y-0.5"
                >
                  {adv.ctaText}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default AdvantagesSection;
