'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#features', label: 'Features' },
    { href: '#about', label: 'About' },
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      setMobileMenuOpen(false);
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 flex flex-col items-center pointer-events-none hero-nav-reveal transition-all duration-300 ease-in-out ${
        scrolled
          ? 'pt-3 sm:pt-4 px-3 sm:px-6'
          : 'pt-4 sm:pt-6 px-6 sm:px-10 lg:px-14'
      }`}
    >
      {/* 
        On first view / hero section (!scrolled):
          Full-width, borderless, transparent header with logo at left corner and buttons at right corner.
        On scroll (scrolled):
          Smoothly morphs into the centered floating pill navbar with rounded curves and crisp green/black/white tokens.
      */}
      <div
        className={`w-full transition-all duration-300 ease-in-out flex items-center justify-between pointer-events-auto ${
          scrolled
            ? 'max-w-4xl lg:max-w-5xl rounded-full bg-white/95 backdrop-blur-md border border-[#d9d9d2] shadow-[0_12px_36px_rgba(0,0,0,0.08)] px-4 sm:px-6 h-14 scale-[0.99]'
            : 'max-w-[1400px] rounded-none bg-transparent border-transparent shadow-none px-0 h-12 sm:h-14'
        }`}
      >
        {/* Left: Product Wordmark / Corner Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] rounded-full p-0.5"
          aria-label="AI Learning Companion Home"
        >
          {/* Minimalist Abstract Learning Icon */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#111111] flex items-center justify-center text-[#d8ff19] shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <svg
              className="w-4.5 h-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-black text-base sm:text-lg tracking-tight text-[#111111] transition-colors whitespace-nowrap">
            AI Learning Companion
          </span>
        </Link>

        {/* Right: Desktop Navigation Links & Action Buttons */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8" aria-label="Main Navigation">
          <div className="flex items-center gap-5 lg:gap-7">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className={`text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] ${
                  scrolled
                    ? 'text-[#686860] hover:text-[#111111] hover:bg-[#F1F1EC] px-2.5 py-1 rounded-full'
                    : 'text-[#686860] hover:text-[#111111] hover:bg-black/5 px-3 py-1.5 rounded-full'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              className="text-xs sm:text-sm font-bold text-[#111111] hover:opacity-80 transition-opacity px-2 py-1"
            >
              Sign In
            </Link>

            <Link
              href="/signup"
              className="inline-flex items-center justify-center text-xs sm:text-[13px] font-black text-[#d8ff19] bg-[#111111] hover:bg-black active:bg-black px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-sm hover:shadow hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] shrink-0"
            >
              Start Learning
            </Link>
          </div>
        </nav>

        {/* Right: Mobile Actions */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center text-xs font-black text-[#d8ff19] bg-[#111111] hover:bg-black px-3.5 py-1.5 rounded-full shadow-sm"
          >
            Start Learning
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-full text-[#111111] hover:bg-[#F1F1EC] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="w-full max-w-sm sm:max-w-md mx-auto mt-2 rounded-2xl border border-[#d9d9d2] bg-white/95 backdrop-blur-md p-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xl md:hidden pointer-events-auto">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold text-[#111111] hover:bg-[#F1F1EC] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/signin"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2 rounded-xl text-sm font-bold text-[#111111] hover:bg-[#F1F1EC] transition-colors"
            >
              Sign In
            </Link>
          </div>
          <div className="pt-2 border-t border-[#d9d9d2]">
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center py-2.5 px-4 rounded-full bg-[#111111] text-[#d8ff19] font-black text-center text-sm shadow-sm"
            >
              Start Learning
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default LandingNavbar;
