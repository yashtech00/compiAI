'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  BarChart3,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Users,
  Compass,
  ArrowUpRight,
  Filter,
  Layers
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [topicsData, setTopicsData] = useState<any>(null);
  const [retentionData, setRetentionData] = useState<any>(null);
  const [rolesData, setRolesData] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState('failureRate');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      setIsLoading(true);
      try {
        const [topics, retention, roles] = await Promise.all([
          apiClient(`/admin/analytics/topics?sortBy=${sortBy}&sortOrder=desc`),
          apiClient('/admin/analytics/retention'),
          apiClient('/admin/analytics/roles')
        ]);
        setTopicsData(topics);
        setRetentionData(retention);
        setRolesData(roles?.segments || []);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAnalytics();
  }, [sortBy]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-[#315EF7] tracking-wide uppercase">Telemetry & Diagnostics</span>
          <span className="text-xs text-[#8E8E8E]">•</span>
          <span className="text-xs text-[#8E8E8E]">Curriculum Failure Detection</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white tracking-tight">
          Learning Analytics & Bottlenecks
        </h1>
        <p className="text-xs sm:text-sm text-[#626262] dark:text-slate-400 mt-1">
          Identify where learners encounter friction, fail assessments, or abandon topics
        </p>
      </div>

      {/* Cohort Retention Cards */}
      {retentionData && (
        <div>
          <h2 className="text-sm font-bold text-[#171717] dark:text-white mb-3">Cohort Retention</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7]">
              <span className="text-xs text-[#8E8E8E] block mb-1">Day 1 Retention</span>
              <div className="text-2xl font-extrabold text-[#171717] dark:text-white mb-1">
                {retentionData.day1.rate}%
              </div>
              <p className="text-[11px] text-[#8E8E8E]">
                {retentionData.day1.retained} of {retentionData.day1.eligible} returned next day
              </p>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7]">
              <span className="text-xs text-[#8E8E8E] block mb-1">Day 7 Retention</span>
              <div className="text-2xl font-extrabold text-[#171717] dark:text-white mb-1">
                {retentionData.day7.rate}%
              </div>
              <p className="text-[11px] text-[#8E8E8E]">
                {retentionData.day7.retained} of {retentionData.day7.eligible} active in week 1
              </p>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7]">
              <span className="text-xs text-[#8E8E8E] block mb-1">Day 30 Retention</span>
              <div className="text-2xl font-extrabold text-[#171717] dark:text-white mb-1">
                {retentionData.day30.rate}%
              </div>
              <p className="text-[11px] text-[#8E8E8E]">
                {retentionData.day30.retained} of {retentionData.day30.eligible} active at 1 month
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Topic Performance & Bottlenecks Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#171717] dark:text-white">Topic Performance & Bottlenecks</h2>
            <p className="text-xs text-[#626262] dark:text-slate-400">
              Rank topics by assessment failure rate, completion rate, or abandonment
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#626262]">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#E7E7E7] bg-white text-xs font-semibold focus:ring-2 focus:ring-[#315EF7]"
            >
              <option value="failureRate">Highest Failure Rate</option>
              <option value="abandonmentRate">Highest Abandonment</option>
              <option value="completionRate">Lowest Completion</option>
              <option value="studentsStarted">Most Popular</option>
            </select>
          </div>
        </div>

        <Card className="bg-white dark:bg-slate-900 border-[#E7E7E7] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#F0F0F0] bg-[#FAFAFA] text-[11px] font-bold text-[#626262] uppercase tracking-wider">
                  <th className="py-3 px-4">Topic / Concept</th>
                  <th className="py-3 px-4">Skill Domain</th>
                  <th className="py-3 px-4">Difficulty</th>
                  <th className="py-3 px-4">Started</th>
                  <th className="py-3 px-4">Completion %</th>
                  <th className="py-3 px-4">Abandon %</th>
                  <th className="py-3 px-4">Quiz Avg</th>
                  <th className="py-3 px-4">Failure Rate</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#8E8E8E]">
                      Loading topic performance metrics...
                    </td>
                  </tr>
                ) : (
                  topicsData?.topics?.map((topic: any) => (
                    <tr key={topic.conceptId} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#171717] dark:text-white">
                        {topic.name}
                      </td>
                      <td className="py-3 px-4 text-[#626262]">{topic.skillName}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {topic.difficulty}
                        </span>
                      </td>
                      <td className="py-3 px-4">{topic.studentsStarted}</td>
                      <td className="py-3 px-4 font-semibold">{topic.completionRate}%</td>
                      <td className="py-3 px-4 text-[#8E8E8E]">{topic.abandonmentRate}%</td>
                      <td className="py-3 px-4 font-bold text-[#315EF7]">{topic.avgScore}%</td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${topic.failureRate > 35 ? 'text-rose-600' : 'text-[#626262]'}`}>
                          {topic.failureRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          topic.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800'
                            : topic.severity === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {topic.severity}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Target Role Learner Segment Comparison */}
      <div>
        <h2 className="text-base font-bold text-[#171717] dark:text-white mb-3">Career Goal Distribution & Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rolesData.map((role: any) => (
            <Card key={role.roleId} className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] shadow-xs">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-sm text-[#171717] dark:text-white">{role.name}</span>
                <span className="text-[#315EF7] font-bold">{role.studentCount} students</span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-[#626262]">
                <div className="flex justify-between">
                  <span>Avg Roadmap Progress</span>
                  <span className="font-semibold text-[#171717]">{role.avgProgress}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed Sessions</span>
                  <span className="font-semibold text-[#171717]">{role.totalCompletedSessions}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
