'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ChevronLeft,
  Mail,
  Calendar,
  Flame,
  GitFork,
  BookOpen,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Edit3,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function AdminStudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'roadmap' | 'assessments' | 'timeline' | 'edit'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    displayName: '',
    experienceLevel: 'BEGINNER',
    dailyMinutes: 15,
    status: 'ACTIVE'
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStudent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient(`/admin/students/${studentId}`);
      setData(res);
      if (res?.student) {
        setEditForm({
          displayName: res.student.profile?.displayName || '',
          experienceLevel: res.student.profile?.experienceLevel || 'BEGINNER',
          dailyMinutes: res.student.profile?.dailyMinutes || 15,
          status: res.student.status || 'ACTIVE'
        });
      }
    } catch (err: any) {
      console.error('Failed to load student:', err);
      setError(err?.message || 'Failed to load student profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchStudent();
    }
  }, [studentId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateMsg(null);
    try {
      await apiClient(`/admin/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      setUpdateMsg({ type: 'success', text: 'Student profile updated and audit log recorded.' });
      fetchStudent();
    } catch (err: any) {
      setUpdateMsg({ type: 'error', text: err?.message || 'Failed to update student profile' });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-48" />
        <div className="h-32 bg-white dark:bg-slate-900 border border-[#E7E7E7] rounded-2xl" />
        <div className="h-64 bg-white dark:bg-slate-900 border border-[#E7E7E7] rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center bg-white dark:bg-slate-900 border-rose-200">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-[#171717] dark:text-white mb-1">Student Not Found</h2>
        <p className="text-xs text-[#626262] mb-4">{error || 'Could not locate student profile.'}</p>
        <Button onClick={() => router.push('/admin/students')} size="sm">Back to Students Directory</Button>
      </Card>
    );
  }

  const { student, skills, activeRoadmap, roadmapVersions, sessions, assessments, timeline } = data;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#626262] hover:text-[#171717] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Students Directory
        </Link>
      </div>

      {/* Student Profile Header Card */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#315EF7] text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
              {student.profile?.displayName ? student.profile.displayName.slice(0, 2).toUpperCase() : 'ST'}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#171717] dark:text-white">
                  {student.profile?.displayName || 'Learner'}
                </h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  student.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {student.status}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F3F6FF] text-[#315EF7] border border-[#E0E7FF]">
                  {student.profile?.experienceLevel || 'BEGINNER'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#626262] dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#8E8E8E]" />
                  {student.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#8E8E8E]" />
                  Joined {new Date(student.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#8E8E8E]" />
                  Pacing: {student.profile?.dailyMinutes || 15}m/day
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8E8E8E] block">
                Target Role
              </span>
              <span className="text-sm font-bold text-[#171717] dark:text-white block">
                {student.activeGoal?.targetRole?.name || student.activeGoal?.title || 'Undecided'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex border-b border-[#E7E7E7] dark:border-slate-800 space-x-6">
        {[
          { id: 'overview', label: 'Overview & Progress' },
          { id: 'roadmap', label: `Roadmap (${roadmapVersions.length} Versions)` },
          { id: 'assessments', label: `Assessments & Sessions (${assessments.length + sessions.length})` },
          { id: 'timeline', label: 'Activity Timeline' },
          { id: 'edit', label: 'Edit Profile' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-[#315EF7] text-[#315EF7]'
                : 'border-transparent text-[#626262] hover:text-[#171717]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {/* 1. Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800">
              <span className="text-xs text-[#8E8E8E] font-medium block mb-1">Learning Streak</span>
              <div className="flex items-center gap-1.5 text-xl font-bold text-[#171717] dark:text-white">
                <Flame className="w-5 h-5 text-[#F27405]" />
                {student.streak?.currentStreak || 0} Days
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800">
              <span className="text-xs text-[#8E8E8E] font-medium block mb-1">Roadmap Version</span>
              <div className="flex items-center gap-1.5 text-xl font-bold text-[#315EF7]">
                <GitFork className="w-5 h-5" />
                V{activeRoadmap?.version || 1}
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800">
              <span className="text-xs text-[#8E8E8E] font-medium block mb-1">Roadmap Progress</span>
              <div className="text-xl font-bold text-[#171717] dark:text-white">
                {activeRoadmap?.completionPercentage || 0}%
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800">
              <span className="text-xs text-[#8E8E8E] font-medium block mb-1">Completed Sessions</span>
              <div className="flex items-center gap-1.5 text-xl font-bold text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                {sessions.filter((s: any) => s.status === 'COMPLETED').length}
              </div>
            </Card>
          </div>

          {/* Mastered Skills Grid */}
          <Card className="p-5 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800">
            <h3 className="font-bold text-sm text-[#171717] dark:text-white mb-3">Target Skill Competencies</h3>
            {skills.length === 0 ? (
              <p className="text-xs text-[#8E8E8E] py-4 text-center">No skill assessments recorded yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {skills.map((s: any) => (
                  <div key={s.id} className="p-3 rounded-xl border border-[#F0F0F0] dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-950">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-[#171717] dark:text-white">{s.name}</span>
                      <span className="font-bold text-[#315EF7]">{Math.round(s.masteryScore)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                      <div className="h-full bg-[#315EF7] rounded-full" style={{ width: `${s.masteryScore}%` }} />
                    </div>
                    <span className="text-[10px] text-[#8E8E8E] mt-1 block capitalize">{s.category}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 2. Roadmap & Version History Tab */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base text-[#171717] dark:text-white">Roadmap Version History</h2>
              <p className="text-xs text-[#626262] mt-0.5">Every version preserved immutably to evaluate adaptation</p>
            </div>
            {roadmapVersions.length > 1 && (
              <Link
                href={`/admin/roadmaps?studentId=${student.id}&vA=1&vB=${activeRoadmap?.version || 2}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#315EF7] text-white hover:bg-[#244DE0] shadow-xs"
              >
                Compare V1 vs V{activeRoadmap?.version || 2} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {roadmapVersions.map((ver: any) => (
              <Card key={ver.id} className={`p-4 bg-white dark:bg-slate-900 border ${ver.status === 'ACTIVE' ? 'border-[#315EF7]/50 shadow-xs' : 'border-[#E7E7E7]'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#171717] dark:text-white">
                      Version {ver.version} — {ver.title}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      ver.status === 'ACTIVE' ? 'bg-[#F3F6FF] text-[#315EF7]' : 'bg-[#F5F5F5] text-[#8E8E8E]'
                    }`}>
                      {ver.status}
                    </span>
                  </div>
                  <span className="text-xs text-[#8E8E8E]">
                    {new Date(ver.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-[#626262] dark:text-slate-400 mb-2">
                  <strong>Trigger:</strong> {ver.triggerReason || 'Adaptive progression update'} ({ver.analysisType || 'INITIAL_AI_SYNTHESIS'})
                </p>
                <div className="flex items-center gap-4 text-xs text-[#8E8E8E]">
                  <span>{ver.itemCount} Milestones</span>
                  <span>{ver.completionPercentage}% Completion</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Active Roadmap Items */}
          {activeRoadmap && (
            <Card className="p-5 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800">
              <h3 className="font-bold text-sm text-[#171717] dark:text-white mb-3">Current Active Roadmap Milestones</h3>
              <div className="space-y-2">
                {activeRoadmap.items?.map((item: any, idx: number) => (
                  <div key={item.id} className="p-3 rounded-xl border border-[#F0F0F0] dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#F3F6FF] text-[#315EF7] font-bold text-[11px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-semibold text-[#171717] dark:text-white block">{item.title}</span>
                        <span className="text-[11px] text-[#8E8E8E] block">{item.targetOutcome || item.reason}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      item.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : item.status === 'IN_PROGRESS'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 3. Assessments & Sessions Tab */}
      {activeTab === 'assessments' && (
        <div className="space-y-6">
          <Card className="p-5 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800">
            <h3 className="font-bold text-sm text-[#171717] dark:text-white mb-3">Recent Learning Sessions</h3>
            {sessions.length === 0 ? (
              <p className="text-xs text-[#8E8E8E] py-4 text-center">No learning sessions recorded yet.</p>
            ) : (
              <div className="divide-y divide-[#F0F0F0] dark:divide-slate-800 text-xs">
                {sessions.map((s: any) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#171717] dark:text-white block">{s.lesson?.title || 'Learning Lesson'}</span>
                      <span className="text-[11px] text-[#8E8E8E]">
                        Started: {new Date(s.startedAt).toLocaleString()} | Duration: {Math.round((s.durationSeconds || 0) / 60)}m
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.quizAttempt && (
                        <span className="font-bold text-[#315EF7]">Quiz: {s.quizAttempt.score}%</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        s.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 4. Timeline Tab */}
      {activeTab === 'timeline' && (
        <Card className="p-5 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800">
          <h3 className="font-bold text-sm text-[#171717] dark:text-white mb-4">Event Stream Timeline</h3>
          <div className="relative pl-6 space-y-6 border-l-2 border-[#E7E7E7] dark:border-slate-800 ml-2">
            {timeline.map((ev: any) => (
              <div key={ev.id} className="relative group">
                <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-[#315EF7]" />
                <div className="text-xs">
                  <span className="font-bold text-[#171717] dark:text-white block">{ev.title}</span>
                  <span className="text-[11px] text-[#8E8E8E] block mb-1">
                    {new Date(ev.timestamp).toLocaleString()}
                  </span>
                  <p className="text-[#626262] dark:text-slate-300 leading-relaxed bg-[#FAFAFA] dark:bg-slate-950 p-2.5 rounded-xl border border-[#F0F0F0] dark:border-slate-800">
                    {ev.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 5. Edit Profile Tab */}
      {activeTab === 'edit' && (
        <Card className="max-w-lg p-6 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800">
          <h3 className="font-bold text-sm text-[#171717] dark:text-white mb-1">Edit Student Profile</h3>
          <p className="text-xs text-[#626262] mb-4">Changes are audited and logged with administrator identity</p>

          {updateMsg && (
            <div className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-center gap-2 ${
              updateMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
            }`}>
              {updateMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{updateMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">Display Name</label>
              <input
                type="text"
                required
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E7E7] focus:ring-2 focus:ring-[#315EF7] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Experience Track</label>
              <select
                value={editForm.experienceLevel}
                onChange={(e) => setEditForm({ ...editForm, experienceLevel: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E7E7] focus:ring-2 focus:ring-[#315EF7] focus:outline-none"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Daily Commitment (Minutes)</label>
              <input
                type="number"
                min="5"
                max="60"
                value={editForm.dailyMinutes}
                onChange={(e) => setEditForm({ ...editForm, dailyMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E7E7] focus:ring-2 focus:ring-[#315EF7] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Account Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E7E7] focus:ring-2 focus:ring-[#315EF7] focus:outline-none"
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="DEACTIVATED">Deactivated</option>
              </select>
            </div>

            <Button type="submit" size="sm" disabled={isUpdating} className="bg-[#315EF7] text-white">
              {isUpdating ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
