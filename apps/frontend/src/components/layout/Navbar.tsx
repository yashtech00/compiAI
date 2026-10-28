'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { Button } from '../ui/Button';
import {
  Sparkles,
  BookOpen,
  Repeat,
  TrendingUp,
  Flame,
  ShieldCheck,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { user, isAdmin, signout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const navLinks = [
    { href: '/today', label: 'Today', icon: Sparkles },
    { href: '/my-learning', label: 'My Learning', icon: BookOpen },
    { href: '/recall', label: 'Recall', icon: Repeat },
    { href: '/progress', label: 'Progress', icon: TrendingUp }
  ];

  return (
    <nav className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-slate-900 dark:text-white group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-600 dark:from-slate-100 dark:via-slate-200 dark:to-indigo-300 bg-clip-text text-transparent">
                Companion.ai
              </span>
            </Link>

            {/* Navigation links (only if user logged in) */}
            {user && (
              <div className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {user ? (
              <>
                {/* Continuity / Streak Badge */}
                {user.streak && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                    <Flame className="w-3.5 h-3.5 fill-amber-500 dark:fill-amber-400" />
                    <span>{user.streak.currentStreak} day continuity</span>
                  </div>
                )}

                {/* Plan Badge */}
                <Link href="/subscription">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 transition-colors">
                    {user.subscriptions?.[0]?.plan?.code === 'PRO' ? 'PRO' : 'Upgrade to Pro'}
                  </span>
                </Link>

                {/* Admin button if admin */}
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm" className="hidden lg:inline-flex gap-1.5 border-purple-500/30 text-purple-600 dark:text-purple-300">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Admin
                    </Button>
                  </Link>
                )}

                {/* User menu & Signout */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden md:inline-block">
                    {user.profile?.displayName || user.email}
                  </span>
                  <button
                    onClick={() => signout()}
                    title="Sign out"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/signin">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="primary" size="sm">
                    Start Learning
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
