'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AiTutorDrawer } from '@/components/tutor/AiTutorDrawer';

interface DashboardShellProps {
  title?: string;
  children: React.ReactNode;
}

export function DashboardShell({ title = 'Overview', children }: DashboardShellProps) {
  const [isTutorDrawerOpen, setIsTutorDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-[var(--background)] text-[var(--foreground)] p-2.5 sm:p-3 md:p-3.5 lg:p-4 flex flex-col md:flex-row gap-3 sm:gap-3.5 font-sans antialiased selection:bg-[#d8ff19] selection:text-[#111111] transition-colors">
      {/* Left Vertical Sidebar (fixed in viewport, only page scrolls) */}
      <div className="hidden md:flex shrink-0 sticky top-2.5 sm:top-3 md:top-3.5 lg:top-4 h-[calc(100dvh-1.25rem)] sm:h-[calc(100dvh-1.5rem)] md:h-[calc(100dvh-1.75rem)] lg:h-[calc(100dvh-2rem)] self-start z-30">
        <Sidebar onOpenHelp={() => setIsTutorDrawerOpen(true)} />
      </div>

      {/* Flexible Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top Navigation Bar with Dynamic Title */}
        <Topbar
          title={title}
          onQuickAction={() => setIsTutorDrawerOpen(true)}
          onSearch={(q) => console.log('Searching for:', q)}
        />

        {/* Page Content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {children}
        </div>
      </main>

      {/* Slide-out Full AI Tutor Drawer */}
      <AiTutorDrawer
        isOpen={isTutorDrawerOpen}
        onClose={() => setIsTutorDrawerOpen(false)}
        conceptName="Machine Learning & Deep Learning"
      />
    </div>
  );
}
