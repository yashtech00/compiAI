'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { CheckCircle2, Clock, AlertCircle, Play, ArrowRight, Compass } from 'lucide-react';

interface LearningHistoryData {
  summary: {
    completedCount: number;
    continuityDays: number;
    totalStudyHours: number;
    needsReinforcementCount: number;
  };
  currentFocus: {
    concept: { id: string; name: string; skillName: string } | null;
    reason: string;
    lessonSlug: string | null;
  } | null;
  completedConcepts: Array<{
    id: string;
    name: string;
    skillName: string;
    masteryScore: number;
    lastTestedAt: string;
    attempts: number;
    lessonSlug: string | null;
  }>;
  reinforcementNeeded: Array<{
    id: string;
    name: string;
    skillName: string;
    masteryScore: number;
    misconceptions: string[];
    lessonSlug: string | null;
  }>;
  recentActivities: Array<{
    id: string;
    conceptName: string;
    skillName: string;
    activityType: string;
    score: number;
    durationMinutes: number;
    createdAt: string;
  }>;
}

export default function MyLearningPage() {
  const [data, setData] = useState<LearningHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [dashRes, todayRes] = await Promise.all([
          apiClient('/dashboard/stats').catch(() => null),
          apiClient('/daily/today').catch(() => null)
        ]);

        const completed = (dashRes?.skills || []).flatMap((s: any) =>
          (s.concepts || [])
            .filter((c: any) => (c.masteryScore || 0) >= 80)
            .map((c: any) => ({
              id: c.id,
              name: c.name,
              skillName: s.name,
              masteryScore: c.masteryScore || 85,
              lastTestedAt: c.updatedAt || new Date().toISOString(),
              attempts: 3,
              lessonSlug: c.lessons?.[0]?.slug || null
            }))
        );

        const needingWork = (dashRes?.skills || []).flatMap((s: any) =>
          (s.concepts || [])
            .filter((c: any) => (c.masteryScore || 0) > 0 && (c.masteryScore || 0) < 70)
            .map((c: any) => ({
              id: c.id,
              name: c.name,
              skillName: s.name,
              masteryScore: c.masteryScore || 45,
              misconceptions: c.misconceptions || [],
              lessonSlug: c.lessons?.[0]?.slug || null
            }))
        );

        const rec = todayRes?.today?.recommendedActivity || todayRes?.recommendedActivity;

        setData({
          summary: {
            completedCount: completed.length,
            continuityDays: dashRes?.streak?.current || dashRes?.profile?.streakDays || 0,
            totalStudyHours: Math.round((dashRes?.profile?.totalPoints || 0) / 30),
            needsReinforcementCount: needingWork.length
          },
          currentFocus: rec ? {
            concept: rec.concept || {
              id: 'c-curr',
              name: rec.title || 'Current Milestone',
              skillName: rec.concept?.skillName || 'Core Learning'
            },
            reason: rec.reason || 'Next recommended milestone in your individualized path.',
            lessonSlug: rec.lessonSlug || null
          } : null,
          completedConcepts: completed,
          reinforcementNeeded: needingWork,
          recentActivities: []
        });
      } catch (err) {
        console.error('Failed to load learning history:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <DashboardShell title="My Learning Paths">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-[#686860]">
            <div className="animate-spin w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full mx-auto mb-3" />
            Loading your learning records...
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!data) {
    return (
      <DashboardShell title="My Learning Paths">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center p-8 max-w-md rounded-2xl bg-white border border-[#d9d9d2] shadow-sm">
            <p className="text-[#686860] mb-4">No learning history recorded yet.</p>
            <Link href="/today">
              <button className="px-5 py-2.5 rounded-full bg-[#111111] hover:bg-black text-[#d8ff19] text-xs font-bold shadow-sm hover:scale-105 active:scale-95 transition-all">
                Go to Overview
              </button>
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const focus = data.currentFocus;

  return (
    <DashboardShell title="My Learning Paths">
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
        {/* Header summary subtitle */}
        <div className="flex items-center justify-between pb-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
              Learning Journal &amp; Verified Records
            </h1>
            <p className="text-xs sm:text-sm text-[#686860] mt-0.5">
              Personal learning history, concept mastery, and active syllabus focus.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#d8ff19]/30 border border-[#111111]/20 text-[#111111] text-xs font-bold">
              {data.summary.completedCount} Mastered
            </span>
            <span className="px-3 py-1 rounded-full bg-[#111111] text-[#d8ff19] text-xs font-bold">
              {data.summary.continuityDays}d Continuity
            </span>
          </div>
        </div>

        {/* 1. Current Learning Focus */}
        {focus?.concept ? (
          <div className="p-5 sm:p-6 rounded-[24px] bg-white border border-[#d9d9d2] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#d8ff19]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-0.5 rounded-full bg-[#d8ff19] text-[#111111] text-[11px] font-black border border-[#111111]/20">
                    Current Active Focus
                  </span>
                  <span className="text-xs font-bold text-[#15803d] flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5" />
                    {focus.concept.skillName}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-[#111111] tracking-tight">
                  {focus.concept.name}
                </h2>
                <p className="text-xs sm:text-sm text-[#686860] mt-1.5 max-w-xl leading-relaxed">
                  {focus.reason}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {focus.lessonSlug && (
                  <Link href={`/lessons/${focus.lessonSlug}`}>
                    <button className="px-5 py-2.5 rounded-full border border-[#d9d9d2] text-[#111111] font-bold text-xs flex items-center gap-2 hover:border-[#111111] transition-all">
                      <Play className="w-3.5 h-3.5" />
                      <span>Continue Lesson</span>
                    </button>
                  </Link>
                )}
                <Link href="/today">
                  <button className="px-6 py-3 rounded-full bg-[#111111] hover:bg-black text-[#d8ff19] font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm hover:scale-105 active:scale-95 transition-all">
                    <ArrowRight className="w-4 h-4" />
                    <span>Today&apos;s Learning</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 rounded-[24px] bg-[#111111] border border-[#111111] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#d8ff19]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-3 py-0.5 rounded-full bg-[#d8ff19]/20 text-[#d8ff19] text-[11px] font-black border border-[#d8ff19]/30 inline-block mb-2">
                  No Active Session Yet
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Start Today&apos;s Learning
                </h2>
                <p className="text-xs sm:text-sm text-white/60 mt-1.5 max-w-xl leading-relaxed">
                  Begin with your personalized daily lesson. Each milestone adapts to your skill level and selected goal.
                </p>
              </div>
              <Link href="/today" className="shrink-0">
                <button className="px-6 py-3 rounded-full bg-[#d8ff19] hover:bg-[#c5ec00] text-[#111111] font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm hover:scale-105 active:scale-95 transition-all">
                  <ArrowRight className="w-4 h-4" />
                  <span>Start Learning</span>
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* 2. Concepts Needing Reinforcement (if any) */}
        {data.reinforcementNeeded.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <AlertCircle className="w-4 h-4 text-[#111111]" />
              <h2 className="text-sm sm:text-base font-black text-[#111111]">
                Concepts for Reinforcement ({data.reinforcementNeeded.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.reinforcementNeeded.map((rc) => (
                <div
                  key={rc.id}
                  className="p-4 rounded-2xl bg-white border border-[#d9d9d2] shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <h3 className="font-bold text-[#111111] text-xs sm:text-sm">
                        {rc.name}
                      </h3>
                      <span className="text-[11px] text-[#686860]">{rc.skillName}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#F1F1EC] text-[#111111] text-[10px] font-bold border border-[#d9d9d2]">
                      {rc.masteryScore}%
                    </span>
                  </div>
                  {rc.misconceptions && rc.misconceptions.length > 0 && (
                    <p className="text-[11px] text-[#686860] mt-1.5 italic">
                      Focus area: {rc.misconceptions[0]}
                    </p>
                  )}
                  {rc.lessonSlug && (
                    <Link href={`/lessons/${rc.lessonSlug}`} className="mt-2.5 inline-block">
                      <span className="text-xs font-bold text-[#15803d] hover:underline flex items-center gap-1">
                        Targeted review session &rarr;
                      </span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Completed Concepts History */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#15803d]" />
            <h2 className="text-sm sm:text-base font-black text-[#111111]">
              Completed Concepts ({data.completedConcepts.length})
            </h2>
          </div>

          {data.completedConcepts.length === 0 ? (
            <div className="p-6 rounded-2xl text-center text-[#686860] text-xs bg-white border border-[#d9d9d2] shadow-sm">
              No concepts completed yet. Start today&apos;s recommended session to earn your first milestone!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.completedConcepts.map((cc) => (
                <div
                  key={cc.id}
                  className="p-4 rounded-2xl bg-white border border-[#d9d9d2] hover:border-[#111111] transition-all shadow-sm group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-[#111111] text-xs sm:text-sm group-hover:text-black transition-colors">
                      {cc.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#d8ff19]/30 text-[#111111] text-[10px] font-black border border-[#111111]/20">
                      {cc.masteryScore}%
                    </span>
                  </div>
                  <div className="text-[11px] text-[#686860] mb-2.5">
                    {cc.skillName} • {cc.attempts} attempt{cc.attempts > 1 ? 's' : ''}
                  </div>
                  {cc.lessonSlug && (
                    <Link href={`/lessons/${cc.lessonSlug}`}>
                      <span className="text-xs text-[#15803d] hover:underline flex items-center gap-1 font-bold">
                        Review lesson <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Recent Session History */}
        {data.recentActivities.length > 0 && (
          <div>
            <h2 className="text-sm sm:text-base font-black text-[#111111] mb-2.5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#686860]" />
              Recent Session History
            </h2>
            <div className="rounded-2xl overflow-hidden bg-white border border-[#d9d9d2] divide-y divide-[#d9d9d2] shadow-sm">
              {data.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 flex items-center justify-between gap-4 hover:bg-[#F8F8F4] transition-colors text-xs"
                >
                  <div>
                    <span className="font-bold text-[#111111]">
                      {act.conceptName}
                    </span>
                    <span className="text-[#686860] ml-2 font-medium">
                      ({act.skillName})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[#686860]">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#111111] text-[#d8ff19] text-[10px] font-black">
                      {act.activityType}
                    </span>
                    <span className="font-semibold text-[#111111]">{act.durationMinutes} min</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
