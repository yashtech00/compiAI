'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  Clock,
  Brain,
  TrendingUp,
  Award
} from 'lucide-react';

interface ProgressSummary {
  totalMinutes: number;
  completedSessions: number;
  conceptsStudied: number;
  conceptsMastered: number;
  streak: { current: number; longest: number };
  totalXp: number;
  weeklyActivity: Array<{ day: string; date: string; minutes: number; sessions: number }>;
}

interface SkillProgress {
  id: string;
  name: string;
  slug: string;
  category: string;
  difficulty: number;
  masteryScore: number;
  confidenceScore: number;
  totalConcepts: number;
  masteredConcepts: number;
}

export default function ProgressPage() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [skills, setSkills] = useState<SkillProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sumRes, skRes] = await Promise.all([
          apiClient('/analytics/summary'),
          apiClient('/analytics/skills')
        ]);
        if (sumRes) setSummary(sumRes);
        if (skRes?.skills) setSkills(skRes.skills);
      } catch (err) {
        console.error('Failed to load progress telemetry:', err);
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
          Computing progress telemetry...
        </div>
      </div>
    );
  }

  const maxWeeklyMinutes = Math.max(1, ...(summary?.weeklyActivity?.map(d => d.minutes) || [1]));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 w-full flex-1 flex flex-col gap-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="purple">Learning Intelligence</Badge>
          <span className="text-xs text-slate-500 dark:text-slate-400">Meaningful Mastery Insights</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Learning Progress
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Calm, objective evidence of conceptual mastery, spaced retention health, and daily practice continuity.
        </p>
      </div>

      {/* 1. Core Learning Improvements Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Focused Learning</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {summary?.totalMinutes || 0} <span className="text-xs font-normal text-slate-500">mins</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{summary?.completedSessions || 0} completed sessions</div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Concept Mastery</span>
            <Brain className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {summary?.conceptsMastered || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{summary?.conceptsStudied || 0} concepts studied</div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Learning Continuity</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {summary?.streak?.current || 0} <span className="text-xs font-normal text-slate-500">days</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Best streak: {summary?.streak?.longest || 0} days</div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Evidence Level</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {summary?.totalXp || 0} <span className="text-xs font-normal text-slate-500">XP</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Gained via quiz & application</div>
        </Card>
      </div>

      {/* 2. 7-Day Consistency Distribution (Accessible SVG Bar Chart) */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Last 7 Days Consistency</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Daily time investment in focused learning</p>
          </div>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            {summary?.weeklyActivity?.reduce((acc, d) => acc + d.minutes, 0) || 0} mins this week
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-36 pt-4 border-b border-slate-200 dark:border-slate-800">
          {summary?.weeklyActivity?.map((d, i) => {
            const heightPercent = Math.max(8, Math.round((d.minutes / maxWeeklyMinutes) * 100));
            return (
              <div key={i} className="flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.minutes}m
                </span>
                <div
                  className="w-full max-w-[36px] bg-indigo-500/80 hover:bg-indigo-600 rounded-t-lg transition-all"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{d.day}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 3. Skill & Domain Mastery Breakdown */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3">
          Domain Knowledge Breakdown
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {skills.map((s) => (
            <Card key={s.id} className="p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{s.name}</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{s.category}</span>
                </div>
                <Badge variant={s.masteryScore >= 70 ? 'success' : s.masteryScore >= 40 ? 'warning' : 'default'}>
                  {Math.round(s.masteryScore)}% Mastery
                </Badge>
              </div>

              <div className="mt-3">
                <ProgressBar value={s.masteryScore} color={s.masteryScore >= 70 ? 'emerald' : 'indigo'} size="sm" />
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                  <span>Confidence: {Math.round(s.confidenceScore)}%</span>
                  <span>{s.masteredConcepts} / {s.totalConcepts} concepts</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
