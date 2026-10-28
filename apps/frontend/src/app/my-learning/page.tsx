'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle2,
  AlertCircle,
  Play,
  Clock,
  ArrowRight
} from 'lucide-react';

interface MyLearningData {
  currentFocus: {
    actionType: string;
    concept: {
      id: string;
      name: string;
      slug: string;
      skillName: string;
    } | null;
    lessonSlug: string | null;
    reason: string;
  };
  completedConcepts: Array<{
    id: string;
    name: string;
    slug: string;
    skillName: string;
    masteryScore: number;
    attempts: number;
    lastSeenAt: string;
    lessonSlug: string | null;
  }>;
  reinforcementNeeded: Array<{
    id: string;
    name: string;
    slug: string;
    skillName: string;
    masteryScore: number;
    misconceptions: string[] | null;
    lessonSlug: string | null;
  }>;
  recentActivities: Array<{
    id: string;
    activityType: string;
    conceptName: string;
    skillName: string;
    durationMinutes: number;
    createdAt: string;
  }>;
  summary: {
    completedCount: number;
    continuityDays: number;
    dailyMinutes: number;
  };
}

export default function MyLearningPage() {
  const [data, setData] = useState<MyLearningData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiClient('/learning-paths/history');
        if (res) {
          setData(res);
        }
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
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
          Loading your learning records...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="text-center p-8 max-w-md">
          <p className="text-slate-500 dark:text-slate-400 mb-4">No learning history recorded yet.</p>
          <Link href="/today">
            <Button>Go to Today</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const focus = data.currentFocus;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 w-full flex-1 flex flex-col gap-8">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="purple">Learning Journal</Badge>
          <span className="text-xs text-slate-500 dark:text-slate-400">Mastery & Evidence Record</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          My Learning
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Your personal learning history, verified concept mastery, and active focus. Future syllabus remains hidden to ensure singular daily focus.
        </p>
      </div>

      {/* 1. Current Learning Focus */}
      {focus.concept && (
        <Card className="p-6 sm:p-8 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 border-indigo-200 dark:border-indigo-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Badge variant="purple" className="mb-2">Current Active Focus</Badge>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {focus.concept.name}
              </h2>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 block mt-0.5">
                {focus.concept.skillName}
              </span>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-xl leading-relaxed">
                {focus.reason}
              </p>
            </div>

            {focus.lessonSlug && (
              <Link href={`/lessons/${focus.lessonSlug}`} className="shrink-0">
                <Button size="md" className="gap-2 font-semibold shadow-lg shadow-indigo-600/20">
                  <Play className="w-4 h-4 fill-white" />
                  Continue Session
                </Button>
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* 2. Concepts Needing Reinforcement (if any) */}
      {data.reinforcementNeeded.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Concepts for Reinforcement ({data.reinforcementNeeded.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.reinforcementNeeded.map((rc) => (
              <Card key={rc.id} className="p-4 border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/10">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{rc.name}</h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{rc.skillName}</span>
                  </div>
                  <Badge variant="warning">{rc.masteryScore}%</Badge>
                </div>
                {rc.misconceptions && rc.misconceptions.length > 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400/90 mt-2 italic">
                    Focus area: {rc.misconceptions[0]}
                  </p>
                )}
                {rc.lessonSlug && (
                  <Link href={`/lessons/${rc.lessonSlug}`} className="mt-3 block">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                      Targeted review session &rarr;
                    </span>
                  </Link>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 3. Completed Concepts History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Completed Concepts ({data.completedConcepts.length})
            </h2>
          </div>
        </div>

        {data.completedConcepts.length === 0 ? (
          <Card className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            No concepts completed yet. Start today&apos;s recommended session to earn your first milestone!
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.completedConcepts.map((cc) => (
              <Card key={cc.id} className="p-4 hoverEffect">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{cc.name}</h3>
                  <Badge variant="success">{cc.masteryScore}%</Badge>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  {cc.skillName} • {cc.attempts} attempt{cc.attempts > 1 ? 's' : ''}
                </div>
                {cc.lessonSlug && (
                  <Link href={`/lessons/${cc.lessonSlug}`}>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium">
                      Review lesson <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 4. Recent Learning History */}
      {data.recentActivities.length > 0 && (
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Recent Session History
          </h2>
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {data.recentActivities.map((act) => (
                <div key={act.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">{act.conceptName}</span>
                    <span className="text-slate-500 dark:text-slate-400 ml-2">({act.skillName})</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-slate-500 dark:text-slate-400">
                    <Badge variant="default">{act.activityType}</Badge>
                    <span>{act.durationMinutes} min</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
