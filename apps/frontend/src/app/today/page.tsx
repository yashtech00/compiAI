'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Sparkles,
  Play,
  Flame,
  Clock,
  Repeat,
  Brain,
  CheckCircle2
} from 'lucide-react';

interface TodayData {
  greeting: string;
  goal: {
    id: string;
    title: string;
    targetRole: string;
    targetReadiness: number;
  } | null;
  streak: {
    current: number;
    longest: number;
  };
  recommendedActivity: {
    type: string;
    actionType?: 'ADVANCE' | 'REINFORCE' | 'REVIEW' | 'PREREQUISITE' | 'CONTENT_UNAVAILABLE';
    title: string;
    concept: {
      id: string;
      name: string;
      skillName?: string;
    } | null;
    lessonId: string | null;
    lessonSlug: string | null;
    estimatedMinutes: number;
    pacingLabel?: string;
    reason: string;
    dueReviewsCount: number;
    reviewConcept: {
      id: string;
      name: string;
      skillName?: string;
    } | null;
  };
  progress: {
    completedConceptsCount?: number;
    weeklyMinutes: number;
    overallMastery: number;
    dailyMinutes?: number;
    topSkills: Array<{
      id: string;
      name: string;
      category: string;
      masteryScore: number;
    }>;
  };
}

export default function TodayPage() {
  const router = useRouter();
  const [data, setData] = useState<TodayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTodayData() {
      try {
        const res = await apiClient('/today/recommendation');
        if (res?.today) {
          setData(res.today);
        }
      } catch (err) {
        console.error('Failed to load today recommendation:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadTodayData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
          Analyzing learner model & preparing today&apos;s recommendation...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="text-center p-8 max-w-md">
          <p className="text-slate-500 dark:text-slate-400 mb-4">No active recommendation available.</p>
          <Button onClick={() => router.push('/onboarding')}>Complete Onboarding</Button>
        </Card>
      </div>
    );
  }

  const act = data.recommendedActivity;
  const targetSlug = act.lessonSlug;
  const isContentUnavailable = act.actionType === 'CONTENT_UNAVAILABLE' || !targetSlug;

  // Action badge config
  const actionBadges: Record<string, { label: string; variant: 'purple' | 'warning' | 'info' | 'success' }> = {
    ADVANCE: { label: "Today's Recommended Milestone", variant: 'purple' },
    REINFORCE: { label: 'Targeted Reinforcement', variant: 'warning' },
    REVIEW: { label: 'Spaced Retrieval Practice', variant: 'info' },
    PREREQUISITE: { label: 'Foundational Knowledge Step', variant: 'purple' },
    CONTENT_UNAVAILABLE: { label: 'Content In Editorial Review', variant: 'warning' }
  };

  const actionBadge = actionBadges[act.actionType || 'ADVANCE'] || actionBadges.ADVANCE;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 w-full flex-1 flex flex-col justify-center">
      {/* 1. Header with Personalized Greeting & Continuity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {data.greeting}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Target Goal: <span className="text-indigo-600 dark:text-indigo-300 font-semibold">{data.goal?.title || 'Software Engineer'}</span>
          </p>
        </div>

        {/* Subtle Continuity & Recall Indicators */}
        <div className="flex items-center gap-3">
          {data.streak.current > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              <Flame className="w-4 h-4 fill-amber-500 dark:fill-amber-400" />
              <span>{data.streak.current} Day Continuity</span>
            </div>
          )}

          {act.dueReviewsCount > 0 && (
            <Link href="/recall">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <Repeat className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                <span>{act.dueReviewsCount} Due Recall{act.dueReviewsCount > 1 ? 's' : ''}</span>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Hero Recommendation Card (Singular Primary Learning Action) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 dark:from-indigo-950/60 dark:via-slate-900 dark:to-slate-900 border border-indigo-200 dark:border-indigo-500/30 p-6 sm:p-10 mb-8 shadow-xl shadow-indigo-500/5 dark:shadow-indigo-950/40">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-48 h-48 text-indigo-500" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant={actionBadge.variant} size="md">
              {actionBadge.label}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {act.estimatedMinutes} minutes
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2 leading-tight">
            {act.title}
          </h2>

          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
            Concept: {act.concept?.name} {act.concept?.skillName ? `• ${act.concept.skillName}` : ''}
          </div>

          {/* Explainable Recommendation Reason */}
          <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-950/70 border border-indigo-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            <span className="font-semibold text-indigo-600 dark:text-indigo-300">Why today: </span>
            {act.reason}
          </div>

          {/* Singular Primary CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {isContentUnavailable ? (
              <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium">
                This curriculum module is currently being finalized. Please check back shortly or explore your learning history.
              </div>
            ) : (
              <Link href={`/lessons/${targetSlug}`}>
                <Button size="lg" className="w-full sm:w-auto gap-2.5 text-base font-semibold shadow-xl shadow-indigo-600/30">
                  <Play className="w-4 h-4 fill-white" />
                  Start Today&apos;s Learning
                </Button>
              </Link>
            )}

            {act.dueReviewsCount > 0 && (
              <Link href="/recall">
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-sm text-sky-600 dark:text-sky-300 border-sky-300 dark:border-sky-500/30">
                  <Repeat className="w-4 h-4" />
                  Review {act.dueReviewsCount} Due Recall First
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 3. Compact Progress Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {data.progress.completedConceptsCount ?? 0} Concepts
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Mastered in History</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {data.progress.overallMastery}% Mastery
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Average Core Skills</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/40 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {data.progress.weeklyMinutes} min
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Last 7 Days Learning</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
