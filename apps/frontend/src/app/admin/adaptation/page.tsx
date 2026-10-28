'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  BrainCircuit,
  GitFork,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
  Layers,
  Activity
} from 'lucide-react';

export default function AdminAdaptationPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAdaptation() {
      try {
        const res = await apiClient('/admin/analytics/adaptation');
        setData(res);
      } catch (err) {
        console.error('Failed to load adaptation intelligence:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAdaptation();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white border border-[#E7E7E7] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const { summary, versionDistribution, triggerBreakdown, recentAdaptationEvents, observedOutcomes } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-[#315EF7] tracking-wide uppercase">AI Engine Observability</span>
          <span className="text-xs text-[#8E8E8E]">•</span>
          <span className="text-xs text-[#8E8E8E]">Adaptive Pathway Verification</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white tracking-tight">
          Adaptive Learning Intelligence
        </h1>
        <p className="text-xs sm:text-sm text-[#626262] dark:text-slate-400 mt-1">
          Evaluate whether the adaptive engine realigns roadmaps effectively based on learner signals
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] shadow-xs">
          <span className="text-xs text-[#8E8E8E] block mb-1">Total Path Generations</span>
          <div className="text-2xl font-extrabold text-[#171717] dark:text-white">
            {summary.totalGenerations}
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-1">Across all registered learners</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] shadow-xs">
          <span className="text-xs text-[#8E8E8E] block mb-1">Initial (V1) Paths</span>
          <div className="text-2xl font-extrabold text-[#171717] dark:text-white">
            {summary.initialGenerations}
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-1">Synthesized during onboarding</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] shadow-xs">
          <span className="text-xs text-[#8E8E8E] block mb-1">Adaptive Revisions (V2+)</span>
          <div className="text-2xl font-extrabold text-[#315EF7]">
            {summary.adaptiveRevisions}
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-1">{summary.adaptationRate}% adaptation rate</p>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] shadow-xs">
          <span className="text-xs text-[#8E8E8E] block mb-1">Observed Post-Revision Rate</span>
          <div className="text-2xl font-extrabold text-emerald-600">
            {observedOutcomes.postRevisionCompletionRate}%
          </div>
          <p className="text-[11px] text-[#8E8E8E] mt-1">Session persistence after revision</p>
        </Card>
      </div>

      {/* Version Distribution & Trigger Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Version Distribution */}
        <Card className="p-5 bg-white dark:bg-slate-900 border-[#E7E7E7]">
          <h2 className="text-base font-bold text-[#171717] dark:text-white mb-1">Roadmap Version Distribution</h2>
          <p className="text-xs text-[#626262] mb-4">Highest version reached per student</p>

          <div className="space-y-3">
            {[
              { label: 'Version 1 (Initial Onboarding Only)', count: versionDistribution.v1, color: 'bg-[#315EF7]' },
              { label: 'Version 2 (1 Adaptive Revision)', count: versionDistribution.v2, color: 'bg-[#4873FB]' },
              { label: 'Version 3 (2 Adaptive Revisions)', count: versionDistribution.v3, color: 'bg-[#628BFF]' },
              { label: 'Version 4+ (Deep Adaptation)', count: versionDistribution.v4Plus, color: 'bg-emerald-500' }
            ].map((item, idx) => {
              const total = Math.max(1, Object.values(versionDistribution).reduce((a: any, b: any) => a + b, 0) as number);
              const pct = Math.round((item.count / total) * 100);

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#171717]">{item.label}</span>
                    <span className="font-bold text-[#171717]">{item.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-[#F0F0F0] rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Trigger Breakdown */}
        <Card className="p-5 bg-white dark:bg-slate-900 border-[#E7E7E7]">
          <h2 className="text-base font-bold text-[#171717] dark:text-white mb-1">Adaptation Trigger Breakdown</h2>
          <p className="text-xs text-[#626262] mb-4">What triggered pathway re-synthesis</p>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl border border-[#F0F0F0] flex justify-between items-center">
              <div>
                <span className="font-semibold block text-[#171717]">Initial Onboarding Synthesis</span>
                <span className="text-[11px] text-[#8E8E8E]">Generated from diagnostic assessment</span>
              </div>
              <span className="font-bold text-[#315EF7]">{triggerBreakdown.ONBOARDING}</span>
            </div>

            <div className="p-3 rounded-xl border border-[#F0F0F0] flex justify-between items-center">
              <div>
                <span className="font-semibold block text-[#171717]">Mini Analysis (Session Cadence)</span>
                <span className="text-[11px] text-[#8E8E8E]">Triggered after quiz failure or speed acceleration</span>
              </div>
              <span className="font-bold text-amber-600">{triggerBreakdown.MINI_REVIEW}</span>
            </div>

            <div className="p-3 rounded-xl border border-[#F0F0F0] flex justify-between items-center">
              <div>
                <span className="font-semibold block text-[#171717]">Full Review (Weekly Realignment)</span>
                <span className="text-[11px] text-[#8E8E8E]">Topological re-ordering of unblocked concepts</span>
              </div>
              <span className="font-bold text-emerald-600">{triggerBreakdown.FULL_REVIEW}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Adaptation Events Table */}
      <Card className="bg-white dark:bg-slate-900 border-[#E7E7E7] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#F0F0F0] bg-[#FAFAFA]">
          <h2 className="font-bold text-sm text-[#171717]">Recent Adaptive Revision Events</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#F0F0F0] text-[11px] font-bold text-[#626262] uppercase tracking-wider">
                <th className="py-2.5 px-4">Student</th>
                <th className="py-2.5 px-4">Transition</th>
                <th className="py-2.5 px-4">Trigger</th>
                <th className="py-2.5 px-4">Recorded Change Reason</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {recentAdaptationEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#8E8E8E]">
                    No adaptive revisions triggered yet.
                  </td>
                </tr>
              ) : (
                recentAdaptationEvents.map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#171717]">{ev.studentName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F3F6FF] text-[#315EF7] border border-[#E0E7FF]">
                        V{ev.previousVersion} → V{ev.newVersion}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#626262]">{ev.trigger}</td>
                    <td className="py-3 px-4 text-[#626262] max-w-xs truncate">{ev.changeReason}</td>
                    <td className="py-3 px-4 text-[#8E8E8E] text-[11px]">{new Date(ev.timestamp).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/roadmaps?studentId=${ev.studentId}&vA=${ev.previousVersion}&vB=${ev.newVersion}`}
                        className="text-xs font-semibold text-[#315EF7] hover:underline"
                      >
                        Compare Diff
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
