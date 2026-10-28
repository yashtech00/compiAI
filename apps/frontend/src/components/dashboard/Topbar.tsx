'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/AuthContext';
import { Search, Flame } from 'lucide-react';

interface TopbarProps {
  title?: string;
  onSearch?: (query: string) => void;
  onQuickAction?: () => void;
}

export function Topbar({ title = 'Overview', onSearch }: TopbarProps) {
  const { user } = useAuth();
  const [searchVal, setSearchVal] = useState('');

  const learnerName = user?.profile?.displayName || 'hb';
  const learnerRole = user?.profile?.experienceLevel
    ? `${user.profile.experienceLevel.charAt(0) + user.profile.experienceLevel.slice(1).toLowerCase()} AI Track`
    : 'Beginner AI Track';

  const streakDays = user?.streak?.currentStreak ?? 0;

  return (
    <header className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3.5 select-none relative z-30">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>

        {/* Mobile streak indicator */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#EA580C] text-[11px] font-semibold">
            <Flame className="w-3.5 h-3.5 fill-[#F27405] text-[#F27405]" />
            <span>{streakDays}d</span>
          </div>
        </div>
      </div>

      {/* Right Controls Group */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Search Input Field */}
        <div className="relative flex-1 sm:w-56 md:w-64">
          <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => {
              setSearchVal(e.target.value);
              onSearch?.(e.target.value);
            }}
            placeholder="Start searching here..."
            className="w-full pl-9 pr-3.5 py-1.5 sm:py-2 rounded-full text-xs bg-surface border border-border text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-[#111111]/30 transition-all shadow-sm"
          />
        </div>

        {/* Streak Pill Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#F27405] text-xs font-semibold">
          <Flame className="w-3.5 h-3.5 fill-[#F27405] text-[#F27405]" />
          <span>{streakDays}d streak</span>
        </div>

        {/* Learner Profile Info */}
        <div className="flex items-center gap-2 pl-1">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-foreground leading-tight">
              {learnerName}
            </div>
            <div className="text-[10px] font-medium text-muted leading-tight">
              {learnerRole}
            </div>
          </div>

          {/* Circular Profile Avatar */}
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-border shadow-sm shrink-0">
            <Image
              src="/images/dashboard/topbar-avatar-exact.png"
              alt={learnerName}
              width={36}
              height={36}
              className="w-full h-full object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </header>
  );
}
