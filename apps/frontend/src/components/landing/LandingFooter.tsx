'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

export function LandingFooter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      setEmail('');
    }
  };

  return (
    <footer className="w-full bg-[#0B0C0E] text-white pt-16 pb-12 px-4 sm:px-6 lg:px-8 border-t border-[#1C1D22]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14 pb-12">
          
          {/* Brand Logo with Signature Lime Dot */}
          <div className="md:col-span-4 flex flex-col items-start">
            <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                Companion.ai
              </span>
              {/* Iconic Neon Lime Accent Dot matching Image 4 */}
              <span className="w-3.5 h-3.5 rounded-full bg-[#D4F82A] group-hover:scale-125 transition-transform" />
            </Link>
            <p className="text-xs sm:text-sm text-[#888888] leading-relaxed max-w-xs font-normal">
              The adaptive AI learning companion built to help modern software engineers master high-leverage mental models.
            </p>
          </div>

          {/* Resources Column */}
          <div className="md:col-span-2">
            <h4 className="text-sm font-bold text-white tracking-tight mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#888888]">
              <li>
                <Link href="/today" className="hover:text-white transition-colors">
                  Learning Paths
                </Link>
              </li>
              <li>
                <Link href="/chat" className="hover:text-white transition-colors">
                  AI Tutor
                </Link>
              </li>
              <li>
                <Link href="/assessment" className="hover:text-white transition-colors">
                  Diagnostic Quiz
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Mastery Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="md:col-span-2">
            <h4 className="text-sm font-bold text-white tracking-tight mb-4">
              Company
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#888888]">
              <li>
                <Link href="#about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="#advantages" className="hover:text-white transition-colors">
                  Methodology
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Subscribe to News with Dark Pill + Lime Arrow Button (Image 4) */}
          <div className="md:col-span-4">
            <h4 className="text-sm font-bold text-white tracking-tight mb-4">
              Subscribe to News
            </h4>
            <p className="text-xs text-[#888888] mb-3">
              Get weekly curated algorithmic challenges and AI architecture breakdowns.
            </p>

            <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
              <div className="w-full bg-[#16171B] border border-[#28292E] rounded-full p-1.5 pl-4 flex items-center justify-between focus-within:border-[#D4F82A] transition-colors">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your e-mail"
                  required
                  className="bg-transparent text-xs sm:text-sm text-white placeholder-[#666666] focus:outline-none flex-1 min-w-0 pr-2"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="w-8 h-8 rounded-lg bg-[#D4F82A] hover:bg-[#C4E820] active:scale-95 text-[#111111] flex items-center justify-center shrink-0 transition-transform duration-150"
                >
                  {submitted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom divider and copyright */}
        <div className="pt-8 border-t border-[#1C1D22] flex flex-col sm:flex-row items-center justify-between text-xs text-[#666666] gap-4">
          <p>© {new Date().getFullYear()} Companion.ai Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-[#999999] transition-colors">Terms of Service</Link>
            <Link href="/" className="hover:text-[#999999] transition-colors">Privacy Notice</Link>
            <Link href="/" className="hover:text-[#999999] transition-colors">Cookie Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
