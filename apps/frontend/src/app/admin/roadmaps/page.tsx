'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  GitFork,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  MoveVertical,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles
} from 'lucide-react';

export default function AdminRoadmapsPage() {
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get('studentId') || '';
  const initialVA = searchParams.get('vA') || '1';
  const initialVB = searchParams.get('vB') || '2';

  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
  const [studentHistory, setStudentHistory] = useState<any | null>(null);
  const [versionA, setVersionA] = useState(initialVA);
  const [versionB, setVersionB] = useState(initialVB);
  const [comparison, setComparison] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load students for selector
  useEffect(() => {
    async function loadStudents() {
      try {
        const res = await apiClient('/admin/students?limit=50');
        setStudents(res.students || []);
        if (!selectedStudentId && res.students?.length > 0) {
          // Default to first student who has a roadmap
          const withRoadmap = res.students.find((s: any) => s.currentRoadmapVersion > 0) || res.students[0];
          setSelectedStudentId(withRoadmap.id);
        }
      } catch (err) {
        console.error('Failed to load students list:', err);
      }
    }
    loadStudents();
  }, [selectedStudentId]);

  // Load selected student history
  useEffect(() => {
    if (!selectedStudentId) return;

    async function loadHistory() {
      setIsLoading(true);
      setError(null);
      setComparison(null);
      try {
        const res = await apiClient(`/admin/students/${selectedStudentId}/roadmaps`);
        setStudentHistory(res);

        const versions = res.versions || [];
        if (versions.length >= 2) {
          setVersionA(String(versions[versions.length - 1].versionNumber));
          setVersionB(String(versions[0].versionNumber));
        } else if (versions.length === 1) {
          setVersionA('1');
          setVersionB('1');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load student roadmaps');
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [selectedStudentId]);

  // Run side-by-side comparison
  const runComparison = async () => {
    if (!selectedStudentId || !versionA || !versionB) return;
    setIsComparing(true);
    setError(null);
    try {
      const res = await apiClient(`/admin/students/${selectedStudentId}/roadmaps/compare?versionA=${versionA}&versionB=${versionB}`);
      setComparison(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to calculate comparison');
    } finally {
      setIsComparing(false);
    }
  };

  useEffect(() => {
    if (studentHistory?.versions?.length >= 2) {
      runComparison();
    }
  }, [studentHistory, versionA, versionB]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-[#315EF7] tracking-wide uppercase">Version Intelligence</span>
            <span className="text-xs text-[#8E8E8E]">•</span>
            <span className="text-xs text-[#8E8E8E]">Adaptive Pathway Auditing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white tracking-tight">
            Roadmap Version Comparison
          </h1>
        </div>
      </div>

      {/* Student & Version Selector Bar */}
      <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div>
            <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1.5">
              Select Student
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E7E7E7] dark:border-slate-800 bg-[#FAFAFA] text-xs font-medium focus:ring-2 focus:ring-[#315EF7] focus:outline-none"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName} ({s.email}) — V{s.currentRoadmapVersion}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1.5">
              Baseline Version (V1)
            </label>
            <select
              value={versionA}
              onChange={(e) => setVersionA(e.target.value)}
              disabled={!studentHistory?.versions?.length}
              className="w-full px-3 py-2 rounded-xl border border-[#E7E7E7] dark:border-slate-800 bg-[#FAFAFA] text-xs font-medium focus:ring-2 focus:ring-[#315EF7] focus:outline-none"
            >
              {studentHistory?.versions?.map((v: any) => (
                <option key={v.versionNumber} value={v.versionNumber}>
                  Version {v.versionNumber} ({v.status}) — {new Date(v.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1.5">
              Compared Version (V2+)
            </label>
            <div className="flex gap-2">
              <select
                value={versionB}
                onChange={(e) => setVersionB(e.target.value)}
                disabled={!studentHistory?.versions?.length}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E7E7] dark:border-slate-800 bg-[#FAFAFA] text-xs font-medium focus:ring-2 focus:ring-[#315EF7] focus:outline-none"
              >
                {studentHistory?.versions?.map((v: any) => (
                  <option key={v.versionNumber} value={v.versionNumber}>
                    Version {v.versionNumber} ({v.status}) — {new Date(v.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={runComparison} disabled={isComparing} className="bg-[#315EF7] text-white shrink-0">
                {isComparing ? 'Comparing...' : 'Compare'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Comparison Diff Results */}
      {comparison && (
        <div className="space-y-6">
          {/* Summary Delta Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] shadow-xs">
              <span className="text-xs text-[#8E8E8E] block mb-1">Topics Added</span>
              <div className="flex items-center gap-2 text-xl font-bold text-emerald-600">
                <PlusCircle className="w-5 h-5" />
                +{comparison.diffSummary.addedCount}
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] shadow-xs">
              <span className="text-xs text-[#8E8E8E] block mb-1">Topics Removed</span>
              <div className="flex items-center gap-2 text-xl font-bold text-rose-600">
                <MinusCircle className="w-5 h-5" />
                -{comparison.diffSummary.removedCount}
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] shadow-xs">
              <span className="text-xs text-[#8E8E8E] block mb-1">Sequence Shifts</span>
              <div className="flex items-center gap-2 text-xl font-bold text-[#315EF7]">
                <MoveVertical className="w-5 h-5" />
                {comparison.diffSummary.reorderedCount}
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border-[#E7E7E7] shadow-xs">
              <span className="text-xs text-[#8E8E8E] block mb-1">Difficulty Changes</span>
              <div className="flex items-center gap-2 text-xl font-bold text-amber-600">
                <Sliders className="w-5 h-5" />
                {comparison.diffSummary.difficultyChangesCount}
              </div>
            </Card>
          </div>

          {/* Side-by-Side Comparison Matrix */}
          <Card className="bg-white dark:bg-slate-900 border-[#E7E7E7] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#F0F0F0] bg-[#FAFAFA] flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs font-bold text-[#171717]">
                <span>Version {comparison.versionA.versionNumber} ({comparison.versionA.itemCount} Topics)</span>
                <ArrowRight className="w-4 h-4 text-[#8E8E8E]" />
                <span className="text-[#315EF7]">Version {comparison.versionB.versionNumber} ({comparison.versionB.itemCount} Topics)</span>
              </div>
              <span className="text-[11px] text-[#8E8E8E]">
                Recorded Reason: {comparison.versionB.changeReason}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#F0F0F0] text-[11px] font-bold text-[#626262] uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-12">#</th>
                    <th className="py-2.5 px-4">Topic / Milestone</th>
                    <th className="py-2.5 px-4">Target Outcome</th>
                    <th className="py-2.5 px-4">Change Type</th>
                    <th className="py-2.5 px-4">Recorded Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {/* Added Topics */}
                  {comparison.diffSummary.addedTopics.map((item: any, i: number) => (
                    <tr key={`add_${i}`} className="bg-emerald-50/40 hover:bg-emerald-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-emerald-700">{item.newPosition}</td>
                      <td className="py-2.5 px-4 font-semibold text-emerald-900">{item.title}</td>
                      <td className="py-2.5 px-4 text-emerald-800">{item.targetOutcome}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ADDED
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-emerald-700 text-[11px]">{item.reason || 'Inserted for remediation'}</td>
                    </tr>
                  ))}

                  {/* Reordered Topics */}
                  {comparison.diffSummary.reorderedTopics.map((item: any, i: number) => (
                    <tr key={`reorder_${i}`} className="bg-blue-50/40 hover:bg-blue-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-blue-700">
                        {item.oldPosition} → {item.newPosition}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-blue-900">{item.title}</td>
                      <td className="py-2.5 px-4 text-blue-800">Shifted {item.shift > 0 ? `+${item.shift}` : item.shift} positions</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          REORDERED
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-blue-700 text-[11px]">Topologically recalibrated to optimize prerequisite learning</td>
                    </tr>
                  ))}

                  {/* Difficulty Changes */}
                  {comparison.diffSummary.difficultyChanges.map((item: any, i: number) => (
                    <tr key={`diff_${i}`} className="bg-amber-50/40 hover:bg-amber-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-amber-700">•</td>
                      <td className="py-2.5 px-4 font-semibold text-amber-900">{item.title}</td>
                      <td className="py-2.5 px-4 text-amber-800">{item.fromDifficulty} → {item.toDifficulty}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          DIFFICULTY
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-amber-700 text-[11px]">Adjusted based on diagnostic score</td>
                    </tr>
                  ))}

                  {/* Removed Topics */}
                  {comparison.diffSummary.removedTopics.map((item: any, i: number) => (
                    <tr key={`rem_${i}`} className="bg-rose-50/40 hover:bg-rose-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-rose-700">{item.oldPosition}</td>
                      <td className="py-2.5 px-4 font-semibold text-rose-900 line-through">{item.title}</td>
                      <td className="py-2.5 px-4 text-rose-800">Removed from revised roadmap</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          REMOVED
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-rose-700 text-[11px]">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
