'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  GitFork,
  BookMarked,
  BrainCircuit,
  Activity,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  Menu,
  X,
  Compass
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/students', label: 'Students', icon: Users, exact: false },
  { href: '/admin/roles', label: 'Target Roles', icon: Compass, exact: false },
  { href: '/admin/analytics', label: 'Learning Analytics', icon: BarChart3, exact: false },
  { href: '/admin/roadmaps', label: 'Roadmap Intelligence', icon: GitFork, exact: false },
  { href: '/admin/content', label: 'Content & Topics', icon: BookMarked, exact: false },
  { href: '/admin/adaptation', label: 'Adaptive Insights', icon: BrainCircuit, exact: false },
  { href: '/admin/system', label: 'System & Audit', icon: Activity, exact: false },
  { href: '/admin/settings', label: 'Settings', icon: Settings, exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, isLoading, signout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // If on login page, render without admin chrome
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#315EF7] border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-[#626262]">Authenticating administrative session...</p>
        </div>
      </div>
    );
  }

  // Unauthorized view
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center border-[#E7E7E7] dark:border-slate-800 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#171717] dark:text-white mb-2">Administrator Access Required</h1>
          <p className="text-sm text-[#626262] dark:text-slate-400 mb-6 leading-relaxed">
            You must be signed in with administrative credentials to access learning intelligence and system telemetry.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            <Button onClick={() => router.push('/admin/login')} className="w-full sm:w-auto bg-[#315EF7] text-white">
              Admin Sign In
            </Button>
            <Button variant="outline" onClick={() => router.push('/problem')} className="w-full sm:w-auto">
              Learner Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] dark:bg-slate-950 flex flex-col md:flex-row text-[#171717] dark:text-slate-100">
      {/* Mobile Top Bar */}
      <div className="md:hidden h-14 bg-white dark:bg-slate-900 border-b border-[#E7E7E7] dark:border-slate-800 px-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#315EF7] flex items-center justify-center text-white font-bold text-xs">
            AL
          </div>
          <span className="font-bold text-sm tracking-tight text-[#171717] dark:text-white">Admin Intelligence</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg text-[#626262] hover:text-[#171717] hover:bg-[#F3F6FF]"
          aria-label="Toggle Navigation"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Overlay on Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-50 w-64 bg-white dark:bg-slate-900 border-r border-[#E7E7E7] dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand header */}
          <div className="h-16 px-6 border-b border-[#E7E7E7] dark:border-slate-800 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-[#315EF7] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-[#171717] dark:text-white block leading-tight">
                  AI Companion
                </span>
                <span className="text-[10px] font-semibold text-[#315EF7] uppercase tracking-wider block">
                  Admin Intelligence
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-[13px] font-medium transition-all ${
                    isActive
                      ? 'bg-[#315EF7] text-white font-semibold shadow-sm shadow-[#315EF7]/20'
                      : 'text-[#626262] dark:text-slate-400 hover:text-[#171717] dark:hover:text-white hover:bg-[#F3F6FF] dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#8E8E8E]'}`} />
                  <span className="truncate">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info & Learner switch */}
        <div className="p-3 border-t border-[#E7E7E7] dark:border-slate-800 space-y-2">
          <Link
            href="/today"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#626262] hover:text-[#171717] hover:bg-[#F3F6FF] transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
              Learner Portal
            </span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>

          <div className="pt-2 px-3 flex items-center justify-between border-t border-[#F0F0F0] dark:border-slate-800/80">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-[#171717] dark:text-white truncate">
                {user.profile?.displayName || 'Administrator'}
              </p>
              <p className="text-[11px] text-[#8E8E8E] truncate">{user.email}</p>
            </div>
            <button
              onClick={() => signout()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-[#8E8E8E] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Administrative Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar on desktop */}
        <header className="hidden md:flex h-16 bg-white dark:bg-slate-900 border-b border-[#E7E7E7] dark:border-slate-800 px-6 sm:px-8 items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs text-[#626262] dark:text-slate-400">
            <Link href="/admin" className="hover:text-[#171717]">Admin</Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#A0A0A0]" />
            <span className="font-semibold text-[#171717] dark:text-white capitalize">
              {ADMIN_NAV_ITEMS.find(i => (i.exact ? pathname === i.href : pathname.startsWith(i.href)))?.label || 'Overview'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800 border border-[#E7E7E7] dark:border-slate-700 text-[#626262] dark:text-slate-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Operational Workspace
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
