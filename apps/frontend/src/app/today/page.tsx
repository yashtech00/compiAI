'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Sparkles,
  Clock,
  Flame,
  ArrowRight,
  Target,
  Repeat,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Terminal,
  BookOpen
} from 'lucide-react';

interface RecommendedActivity {
  type: string;
  actionType: 'ADVANCE' | 'REINFORCE' | 'REMEDIATE' | 'REVIEW' | 'PREREQUISITE' | 'CONTENT_UNAVAILABLE' | 'COMPLETED' | string;
  isPathCompleted?: boolean;
  title: string;
  concept?: {
    id: string;
    name: string;
    skillName?: string;
  } | null;
  lessonId?: string | null;
  lessonSlug?: string | null;
  estimatedMinutes?: number;
  reason?: string;
  dueReviewsCount?: number;
  reviewConcept?: {
    id: string;
    name: string;
    skillName?: string;
  } | null;
  pacingLabel?: string;
}

interface TodayData {
  greeting?: string;
  goal?: {
    id: string;
    title: string;
    targetRole?: string;
    targetReadiness?: number;
  } | null;
  streak?: {
    current: number;
    longest: number;
  };
  recommendedActivity?: RecommendedActivity;
  progress?: {
    completedConceptsCount: number;
    weeklyMinutes: number;
    overallMastery: number;
    dailyMinutes: number;
  };
}

export default function TodayLearningPage() {
  const router = useRouter();
  const [data, setData] = useState<TodayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const loadTodayRecommendation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient('/today/recommendation');
      if (res?.today) {
        setData(res.today);
      } else {
        // Fallback check to /today
        const directRes = await apiClient('/today');
        if (directRes?.today) {
          setData(directRes.today);
        } else {
          setError('Unable to load today’s learning recommendation.');
        }
      }
    } catch (err: any) {
      console.error('Failed to load today recommendation:', err);
      setError(err?.message || 'Could not connect to the learning engine. Please verify your connection and retry.');
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    loadTodayRecommendation();
  }, [loadTodayRecommendation]);

  const handleStartLearning = () => {
    const slug = data?.recommendedActivity?.lessonSlug;
    if (slug) {
      router.push(`/lessons/${slug}`);
    } else {
      // If content is pending or milestone needs preparation, route to problem workspace or reload
      router.push('/problem');
    }
  };

  if (isLoading) {
    return (
      <DashboardShell title="Today's Learning">
        <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full mb-3" />
          <p className="text-xs font-bold text-[#686860] uppercase tracking-wider">
            Loading today&apos;s adaptive recommendation...
          </p>
        </div>
      </DashboardShell>
    );
  }

  if (error || !data) {
    return (
      <DashboardShell title="Today's Learning">
        <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[60vh] max-w-md mx-auto text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-[#111111] mb-2 tracking-tight">
            Learning Engine Disconnected
          </h2>
          <p className="text-xs text-[#686860] mb-6 leading-relaxed font-medium">
            {error || 'Unable to retrieve your scheduled learning session.'}
          </p>
          <Button
            size="md"
            isLoading={isRetrying}
            onClick={() => {
              setIsRetrying(true);
              loadTodayRecommendation();
            }}
            className="gap-2 bg-[#111111] text-[#d8ff19] hover:bg-black font-bold shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Recommendation
          </Button>
        </div>
      </DashboardShell>
    );
  }

  const { greeting, goal, streak, recommendedActivity } = data;
  const isCompleted = recommendedActivity?.isPathCompleted || recommendedActivity?.actionType === 'COMPLETED';
  const hasDueReviews = (recommendedActivity?.dueReviewsCount || 0) > 0;

  const actionTypeLabels: Record<string, { label: string; badgeClass: string }> = {
    ADVANCE: { label: 'New Milestone', badgeClass: 'bg-[#d8ff19] text-[#111111] border-[#111111]/20' },
    REINFORCE: { label: 'Reinforcement', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
    REMEDIATE: { label: 'Targeted Remediation', badgeClass: 'bg-orange-100 text-orange-800 border-orange-300' },
    REVIEW: { label: 'Spaced Recall Due', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
    PREREQUISITE: { label: 'Prerequisite Focus', badgeClass: 'bg-purple-100 text-purple-800 border-purple-300' },
    CONTENT_UNAVAILABLE: { label: 'Curriculum Update', badgeClass: 'bg-neutral-100 text-neutral-800 border-neutral-300' },
    COMPLETED: { label: 'Path Mastered', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
  };

  const actionMeta = actionTypeLabels[recommendedActivity?.actionType || 'ADVANCE'] || actionTypeLabels.ADVANCE;

  return (
    <DashboardShell title="Today's Learning">
      <div className="flex-1 flex flex-col gap-6 max-w-4xl mx-auto w-full py-4 px-2 sm:px-4">
        {/* Header Bar: Greeting & Top Telemetry */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#F1F1EC]">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8F8F4] border border-[#d9d9d2] text-xs font-black text-[#111111] mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#111111]" />
              Personalized Plan
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
              {greeting || 'What should I study today?'}
            </h1>
            {goal?.targetRole && (
              <p className="text-xs sm:text-sm text-[#686860] mt-1 font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-[#111111]" />
                Target Role: <span className="font-bold text-[#111111]">{goal.targetRole}</span>
                {goal.title && <span className="text-[#a0a098]">({goal.title})</span>}
              </p>
            )}
          </div>

          {/* Continuity Streak Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#F8F8F4] border border-[#d9d9d2] shadow-xs">
              <div className="w-7 h-7 rounded-xl bg-[#d8ff19]/30 border border-[#111111]/20 flex items-center justify-center">
                <Flame className="w-4 h-4 text-[#111111]" />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold text-[#686860] uppercase tracking-wider">Continuity Streak</div>
                <div className="text-xs font-black text-[#111111]">
                  {streak?.current || 0} {streak?.current === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Due Recall Banner (if any spaced reviews pending) */}
        {hasDueReviews && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                <Repeat className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-950">
                  {recommendedActivity?.dueReviewsCount} Spaced Retrieval Practice {recommendedActivity?.dueReviewsCount === 1 ? 'Item' : 'Items'} Due
                </p>
                <p className="text-[11px] text-amber-800 font-medium">
                  Quick active recall reinforces retention before memory begins to decay.
                </p>
              </div>
            </div>
            <Link href="/recall">
              <Button size="sm" variant="outline" className="text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-100">
                Review Now
              </Button>
            </Link>
          </div>
        )}

        {/* Primary Focus Card: "What should I study today?" */}
        <Card className="p-6 sm:p-8 rounded-3xl bg-white border border-[#d9d9d2] shadow-sm relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#d8ff19]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-6">
            {/* Meta Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black border ${actionMeta.badgeClass}`}>
                {actionMeta.label}
              </span>
              {recommendedActivity?.concept?.skillName && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F8F8F4] border border-[#d9d9d2] text-[#111111]">
                  {recommendedActivity.concept.skillName}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F8F8F4] border border-[#d9d9d2] text-[#686860]">
                <Clock className="w-3 h-3 text-[#111111]" />
                {recommendedActivity?.estimatedMinutes || 15} min
              </span>
            </div>

            {/* Title & Core Topic */}
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
                {recommendedActivity?.title || 'Daily Engineering Session'}
              </h2>
              {recommendedActivity?.concept?.name && recommendedActivity.concept.name !== recommendedActivity.title && (
                <p className="text-xs font-bold text-[#686860] mt-1">
                  Concept: <span className="text-[#111111]">{recommendedActivity.concept.name}</span>
                </p>
              )}
            </div>

            {/* Pedagogical Relevance / Why This Topic Matters */}
            {recommendedActivity?.reason && (
              <div className="p-4 rounded-2xl bg-[#F8F8F4] border border-[#d9d9d2]/80">
                <div className="text-[10px] font-bold text-[#686860] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3 text-[#111111]" />
                  Why This Matters Today
                </div>
                <p className="text-xs sm:text-sm text-[#111111] leading-relaxed font-medium">
                  {recommendedActivity.reason}
                </p>
              </div>
            )}

            {/* Terminal State or Primary Action Button */}
            {isCompleted ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#F1F1EC]">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  All milestones in this learning roadmap have been mastered!
                </div>
                <Link href="/my-learning">
                  <Button size="md" className="bg-[#111111] text-[#d8ff19] hover:bg-black font-bold">
                    View My Completed Path
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#F1F1EC]">
                <div className="text-xs text-[#686860] font-medium">
                  Structured into concept explanation, code examples, guided practice, and evaluation.
                </div>
                <Button
                  size="lg"
                  onClick={handleStartLearning}
                  className="w-full sm:w-auto gap-2 bg-[#111111] hover:bg-black text-[#d8ff19] font-bold text-sm px-7 py-3 rounded-2xl shadow-sm hover:scale-[1.01] transition-transform"
                >
                  Start Learning
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Secondary Hub Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/my-learning"
            className="p-5 rounded-2xl bg-white border border-[#d9d9d2] hover:border-[#111111] transition-all flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F8F8F4] group-hover:bg-[#d8ff19]/30 border border-[#d9d9d2] flex items-center justify-center transition-colors">
                <Layers className="w-4 h-4 text-[#111111]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#111111]">My Learning Path</h3>
                <p className="text-[11px] text-[#686860] font-medium">Inspect curriculum milestones and mastered topics</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#686860] group-hover:text-[#111111] group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/problem"
            className="p-5 rounded-2xl bg-white border border-[#d9d9d2] hover:border-[#111111] transition-all flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F8F8F4] group-hover:bg-[#d8ff19]/30 border border-[#d9d9d2] flex items-center justify-center transition-colors">
                <Terminal className="w-4 h-4 text-[#111111]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#111111]">Interactive Problem Track</h3>
                <p className="text-[11px] text-[#686860] font-medium">Hands-on diagnostic drills &amp; capstone scenarios</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#686860] group-hover:text-[#111111] group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
