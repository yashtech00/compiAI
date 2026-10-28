'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Layers, Repeat, TrendingUp, HelpCircle, LogOut, Terminal } from 'lucide-react';

interface SidebarProps {
  onOpenHelp?: () => void;
}

export function Sidebar({ onOpenHelp }: SidebarProps) {
  const pathname = usePathname();
  const { signout } = useAuth();

  const navItems = [
    { href: '/problem', label: 'Problem-First Track (Main)', icon: Terminal, match: pathname === '/problem' || pathname === '/today' || pathname === '/dashboard' },
    { href: '/my-learning', label: 'My Learning Paths', icon: Layers, match: pathname === '/my-learning' },
    { href: '/recall', label: 'Spaced Recall', icon: Repeat, match: pathname === '/recall' },
    { href: '/progress', label: 'Progress & Mastery', icon: TrendingUp, match: pathname === '/progress' },
  ];

  return (
    <aside className="w-[60px] sm:w-[66px] h-full shrink-0 bg-surface border border-border rounded-[24px] sm:rounded-[28px] py-4 px-2 flex flex-col items-center justify-between shadow-sm select-none transition-colors">
      {/* Top Section: Waveform Logo & Primary Navigation */}
      <div className="flex flex-col items-center gap-4 sm:gap-5 w-full">
        {/* Waveform Abstract Logo */}
        <Link
          href="/problem"
          className="flex items-center justify-center p-1.5 rounded-xl hover:scale-105 transition-transform"
          title="AI Learning Companion"
        >
          <svg
            className="w-7 h-7 text-[#111111] dark:text-white"
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
          >
            <line x1="6" y1="13" x2="6" y2="19" strokeWidth="2.5" />
            <line x1="10" y1="10" x2="10" y2="22" strokeWidth="2.5" />
            <line x1="14" y1="7" x2="14" y2="25" strokeWidth="2.5" stroke="#d8ff19" />
            <line x1="18" y1="5" x2="18" y2="27" strokeWidth="2.5" stroke="#d8ff19" />
            <line x1="22" y1="8" x2="22" y2="24" strokeWidth="2.5" />
            <line x1="26" y1="11" x2="26" y2="21" strokeWidth="2.5" />
          </svg>
        </Link>

        {/* Primary Navigation Icons */}
        <nav className="flex flex-col items-center gap-2.5 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.match;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`relative group w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#111111] text-[#d8ff19] shadow-[0_4px_12px_rgba(0,0,0,0.2)] ring-1.5 ring-[#d8ff19] scale-105'
                    : 'bg-surface-subtle text-muted hover:text-foreground hover:bg-[#E5E5DE] dark:hover:bg-[#2D274A] hover:scale-105'
                }`}
              >
                <Icon className="w-4.5 h-4.5" strokeWidth={isActive ? 2.4 : 1.8} />
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Pinned Section: Help & Logout */}
      <div className="flex flex-col items-center gap-2.5 w-full pt-3 border-t border-border">
        {/* Help */}
        <button
          onClick={onOpenHelp}
          title="Help & Socratic Guide"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-subtle text-muted hover:text-[#111111] hover:bg-[#E5E5DE] dark:hover:bg-[#2D274A] transition-all hover:scale-105"
        >
          <HelpCircle className="w-4.5 h-4.5" strokeWidth={1.8} />
        </button>

        {/* Logout */}
        <button
          onClick={() => signout()}
          title="Sign out"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-subtle text-muted hover:text-[#111111] hover:bg-red-50 dark:hover:bg-[#381B2B] transition-all hover:scale-105"
        >
          <LogOut className="w-4.5 h-4.5" strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  );
}
