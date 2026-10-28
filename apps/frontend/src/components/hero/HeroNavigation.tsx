'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';

export function HeroNavigation() {
  const { user } = useAuth();

  const navItems = [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Your learning path', href: '#learning-path' },
    { label: 'Stories', href: '#stories' },
  ];

  const ctaHref = user ? '/today' : '/signup';

  return (
    <nav
      className="absolute top-4 sm:top-6 left-4 sm:left-6 right-4 sm:right-6 z-30 flex items-center justify-between gap-2 pointer-events-auto"
      aria-label="Main visual navigation"
    >
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-hidden">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="inline-flex items-center justify-center px-3.5 sm:px-4 lg:px-4.5 py-2 sm:py-2.5 rounded-full bg-white/92 hover:bg-white text-[#171720] text-[11px] sm:text-xs font-semibold tracking-tight shadow-sm hover:shadow backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 whitespace-nowrap"
          >
            {item.label}
          </a>
        ))}
      </div>

      <Link
        href={ctaHref}
        className="inline-flex items-center justify-center px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 rounded-full bg-[#101018] hover:bg-slate-900 text-white text-[11px] sm:text-xs font-bold tracking-wider uppercase shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 whitespace-nowrap ml-auto"
      >
        GET STARTED
      </Link>
    </nav>
  );
}
