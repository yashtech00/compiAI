'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Users,
  TrendingUp,
  UserCheck,
  GitFork,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Compass,
  ArrowRight,
  Clock,
  Filter
} from 'lucide-react';

export default function AdminOverviewDashboard() {
  const [data, setData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async (range = timeRange, showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await apiClient(`/admin/overview?timeRange=${range}`);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load admin overview:', err);
      setError(err?.message || 'Failed to load telemetry data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview(timeRange);
  }, [timeRange]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-28 bg-white dark:bg-slate-900 border border-[#E7E7E7] dark:border-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-white dark:bg-slate-900 border border-[#E7E7E7] dark:border-slate-800 rounded-2xl" />
          <div className="h-72 bg-white dark:bg-slate-900 border border-[#E7E7E7] dark:border-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/50">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-[#171717] dark:text-white mb-1">Failed to load learning intelligence</h2>
        <p className="text-xs text-[#626262] mb-4">{error || 'Server error encountered.'}</p>
        <Button onClick={() => fetchOverview(timeRange)} size="sm">Try Again</Button>
      </Card>
    );
  }

  const { kpis, funnel, trends, needsAttention, period } = data;

  return (
    <div className="space-y-8">
      {/* 1. Header with Global Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-[#315EF7] tracking-wide uppercase">Learning Intelligence</span>
            <span className="text-xs text-[#8E8E8E]">•</span>
            <span className="text-xs text-[#8E8E8E]">Live Decision Support</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white tracking-tight">
            Platform Overview
          </h1>
        </div>

        {/* Global Time Range Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-[#E7E7E7] dark:border-slate-800 shadow-sm">
            {['7d', '30d', '90d', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  timeRange === range
                    ? 'bg-[#315EF7] text-white shadow-xs'
                    : 'text-[#626262] hover:text-[#171717] hover:bg-[#F3F6FF]'
                }`}
              >
                {range === 'all' ? 'All Time' : range.toUpperCase()}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOverview(timeRange, true)}
            disabled={isRefreshing}
            className="h-9 w-9 p-0 flex items-center justify-center border-[#E7E7E7] dark:border-slate-800 bg-white"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#626262] ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 2. Key Performance Indicators (Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#626262] dark:text-slate-400 mb-1.5">
            <span className="font-medium">Total Registered</span>
            <Users className="w-4 h-4 text-[#315EF7]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white">
              {kpis.totalStudents.value.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-1">Learners across all cohorts</p>
        </Card>

        {/* Active Students in Period */}
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#626262] dark:text-slate-400 mb-1.5">
            <span className="font-medium">Active Learners</span>
            <Flame className="w-4 h-4 text-[#F27405]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white">
              {kpis.activeStudents.value.toLocaleString()}
            </span>
            {kpis.activeStudents.changePct !== 0 && (
              <span className={`inline-flex items-center text-xs font-semibold ${
                kpis.activeStudents.changePct > 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {kpis.activeStudents.changePct > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {Math.abs(kpis.activeStudents.changePct)}%
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-1">Logged activity in {timeRange}</p>
        </Card>

        {/* New Registrations */}
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#626262] dark:text-slate-400 mb-1.5">
            <span className="font-medium">New Registrations</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white">
              {kpis.newRegistrations.value.toLocaleString()}
            </span>
            {kpis.newRegistrations.changePct !== 0 && (
              <span className={`inline-flex items-center text-xs font-semibold ${
                kpis.newRegistrations.changePct > 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {kpis.newRegistrations.changePct > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {Math.abs(kpis.newRegistrations.changePct)}%
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-1">vs preceding period ({kpis.newRegistrations.previousValue})</p>
        </Card>

        {/* Roadmap Progress */}
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#626262] dark:text-slate-400 mb-1.5">
            <span className="font-medium">Avg Roadmap Progress</span>
            <GitFork className="w-4 h-4 text-[#315EF7]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white">
              {kpis.avgRoadmapCompletion.value}%
            </span>
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-1">{kpis.roadmapStarted.value} learners with active path</p>
        </Card>

        {/* Session Completion Rate */}
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#626262] dark:text-slate-400 mb-1.5">
            <span className="font-medium">Session Completion</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white">
              {kpis.sessionCompletionRate.value}%
            </span>
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-1">
            {kpis.sessionCompletionRate.sessionsCompleted} completed of {kpis.sessionCompletionRate.sessionsStarted} started
          </p>
        </Card>

        {/* Avg Quiz Score */}
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#626262] dark:text-slate-400 mb-1.5">
            <span className="font-medium">Avg Quiz Mastery</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white">
              {kpis.avgQuizScore.value}%
            </span>
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-1">{kpis.avgQuizScore.attemptsCount} attempts in period</p>
        </Card>

        {/* Diagnostic Assessment Avg */}
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#626262] dark:text-slate-400 mb-1.5">
            <span className="font-medium">Diagnostic Avg</span>
            <Compass className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white">
              {kpis.avgAssessmentScore.value}%
            </span>
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-1">Initial knowledge baseline</p>
        </Card>

        {/* Disengaged Students */}
        <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#626262] dark:text-slate-400 mb-1.5">
            <span className="font-medium">At-Risk Learners</span>
            <AlertTriangle className={`w-4 h-4 ${kpis.disengagedStudents.value > 10 ? 'text-rose-500' : 'text-amber-500'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white">
              {kpis.disengagedStudents.value}
            </span>
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-1">No learning in &gt;7 days</p>
        </Card>
      </div>

      {/* 3. Actionable Insights: "Needs Attention" */}
      {needsAttention && needsAttention.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
              <h2 className="text-base font-bold text-[#171717] dark:text-white">Needs Attention</h2>
            </div>
            <span className="text-xs text-[#8E8E8E]">Transparent rule-based detection</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {needsAttention.map((insight: any) => (
              <Card
                key={insight.id}
                className={`p-4 bg-white dark:bg-slate-900 border transition-all hover:shadow-sm flex flex-col justify-between ${
                  insight.severity === 'HIGH'
                    ? 'border-rose-200 dark:border-rose-950/60'
                    : 'border-amber-200 dark:border-amber-950/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      insight.severity === 'HIGH'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    }`}>
                      {insight.severity} Priority
                    </span>
                    <span className="text-xs font-semibold text-[#171717] dark:text-white">{insight.metric}</span>
                  </div>
                  <h3 className="font-bold text-sm text-[#171717] dark:text-white mb-1 leading-snug">
                    {insight.title}
                  </h3>
                  <p className="text-xs text-[#626262] dark:text-slate-400 leading-relaxed mb-3">
                    {insight.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F0F0F0] dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-[#8E8E8E] truncate pr-2">
                    Action: {insight.suggestedAction}
                  </span>
                  <Link
                    href={insight.link}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#315EF7] hover:underline shrink-0"
                  >
                    Inspect <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 4. Student Learning Funnel & Daily Activity Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Learning Funnel */}
        <Card className="lg:col-span-2 p-5 sm:p-6 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-base text-[#171717] dark:text-white">Student Learning Funnel</h2>
              <p className="text-xs text-[#626262] dark:text-slate-400 mt-0.5">
                Conversion and drop-off across the learner progression journey
              </p>
            </div>
            <Badge variant="default">All Time</Badge>
          </div>

          <div className="space-y-3 pt-2">
            {funnel.map((stage: any, idx: number) => {
              const maxCount = funnel[0]?.count || 1;
              const barWidth = Math.max(8, Math.round((stage.count / maxCount) * 100));

              return (
                <div key={stage.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#171717] dark:text-white">{stage.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#171717] dark:text-white">{stage.count.toLocaleString()}</span>
                      <span className="text-[11px] text-[#8E8E8E] w-12 text-right">
                        {stage.overallConversion}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-[#F0F0F0] dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0
                          ? 'bg-[#315EF7]'
                          : idx < 4
                          ? 'bg-[#4873FB]'
                          : idx < 7
                          ? 'bg-[#628BFF]'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  {idx > 0 && stage.dropOff > 0 && (
                    <div className="flex justify-between text-[10px] text-[#A0A0A0] px-1">
                      <span>Step Conversion: {stage.stepConversion}%</span>
                      <span>Drop-off: -{stage.dropOff.toLocaleString()} learners</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Engagement Trend Bars */}
        <Card className="p-5 sm:p-6 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-base text-[#171717] dark:text-white">Engagement Activity</h2>
                <p className="text-xs text-[#626262] dark:text-slate-400 mt-0.5">Sessions completed per interval</p>
              </div>
            </div>

            {/* Simple visual spark bar chart */}
            <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 border-b border-[#F0F0F0] dark:border-slate-800">
              {trends.map((t: any, i: number) => {
                const maxVal = Math.max(...trends.map((item: any) => item.completedSessions || item.activeUsers || 1));
                const barHeight = Math.max(6, Math.round(((t.completedSessions || t.activeUsers || 0) / maxVal) * 100));

                return (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                      <div className="bg-[#171717] text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap">
                        {t.date}: {t.completedSessions} sessions ({t.activeUsers} active)
                      </div>
                    </div>
                    <div
                      className="w-full bg-[#315EF7]/80 hover:bg-[#315EF7] rounded-t transition-all"
                      style={{ height: `${barHeight}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-[#8E8E8E] pt-2">
              <span>{trends[0]?.date || 'Start'}</span>
              <span>{trends[trends.length - 1]?.date || 'Today'}</span>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#F0F0F0] dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-[#626262]">Total Sessions (Period)</span>
            <span className="font-bold text-sm text-[#171717] dark:text-white">
              {kpis.sessionCompletionRate.sessionsCompleted}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
