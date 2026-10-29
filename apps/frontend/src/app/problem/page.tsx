'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  ArrowRight,
  CheckCircle2,
  Activity,
  Search,
  RotateCcw,
  ShieldAlert,
  GitBranch,
  Terminal,
  Layers
} from 'lucide-react';

function ProblemWorkspaceContent() {
  const searchParams = useSearchParams();
  const goalParamFromUrl = searchParams.get('goalId');

  const [resolvedGoalId, setResolvedGoalId] = useState<string | null>(goalParamFromUrl);
  const [resolvedGoalName, setResolvedGoalName] = useState<string>('');
  const [problemData, setProblemData] = useState<any | null>(null);
  const [activeStage, setActiveStage] = useState<any | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string>('');
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<any | null>(null);
  const [activeMiniDrill, setActiveMiniDrill] = useState<any | null>(null);
  const [drillActionId, setDrillActionId] = useState<string>('');
  const [drillFeedback, setDrillFeedback] = useState<any | null>(null);

  // Resolve goal from URL param or from persisted user profile
  useEffect(() => {
    async function resolveGoal() {
      if (goalParamFromUrl) {
        setResolvedGoalId(goalParamFromUrl);
        return;
      }
      // No URL param — try to read user's persisted active goal
      try {
        const goalRes = await apiClient('/goals/current');
        if (goalRes?.goal) {
          // Use targetRole slug if available, else derive from title
          const rawSlug = goalRes.goal.targetRole?.slug || null;
          const slugMap: Record<string, string> = {
            'full-stack-developer': 'full-stack-development',
            'backend-developer': 'backend-development',
            'ai-engineer': 'ai-engineer',
            'system-design': 'system-design'
          };
          const resolved = rawSlug ? (slugMap[rawSlug] || rawSlug) : 'system-design';
          setResolvedGoalId(resolved);
          if (goalRes.goal.targetRole?.name) setResolvedGoalName(goalRes.goal.targetRole.name);
        } else {
          setResolvedGoalId('system-design');
        }
      } catch {
        setResolvedGoalId('system-design');
      }
    }
    resolveGoal();
  }, [goalParamFromUrl]);

  // Load Main Problem once goalId is resolved
  const loadProblem = useCallback(async () => {
    if (!resolvedGoalId) return;
    setIsLoading(true);
    try {
      const res = await apiClient(`/simulations/main-problem/${resolvedGoalId}`);
      if (res) {
        setProblemData(res);
        setActiveStage(res.currentStage);
        if (res.currentStage?.availableEvidence?.length > 0) {
          setActiveEvidenceTab(res.currentStage.availableEvidence[0].id);
        }
        if (res.miniSimulationBranch) {
          setActiveMiniDrill(res.miniSimulationBranch);
        }
        // Set display name from scenario goalId if not set from user profile
        if (!resolvedGoalName && res.scenario?.goalId) {
          const goalDisplayNames: Record<string, string> = {
            'system-design': 'System Design',
            'backend-development': 'Backend Development',
            'full-stack-development': 'Full-Stack Dev',
            'ai-engineer': 'AI Engineering',
          };
          setResolvedGoalName(goalDisplayNames[res.scenario.goalId] || res.scenario.goalId);
        }
      }
    } catch (err) {
      console.error('Failed to load main problem:', err);
    } finally {
      setIsLoading(false);
    }
  }, [resolvedGoalId, resolvedGoalName]);

  useEffect(() => {
    loadProblem();
  }, [loadProblem]);

  const handleSubmitAction = async () => {
    if (!problemData || !activeStage || !selectedActionId) return;
    setIsSubmitting(true);
    setActionFeedback(null);
    try {
      const scenarioId = problemData.scenario.scenarioId;
      const res = await apiClient(`/simulations/main-problem/${scenarioId}/action`, {
        method: 'POST',
        body: JSON.stringify({
          stageIndex: activeStage.stageIndex,
          actionId: selectedActionId,
          explanation
        })
      });

      if (res?.data) {
        setActionFeedback(res.data);
        if (res.data.recommendedBranch) {
          setActiveMiniDrill(res.data.recommendedBranch);
        } else if (res.data.isSuccess) {
          setTimeout(() => {
            loadProblem();
            setSelectedActionId('');
            setExplanation('');
          }, 1500);
        }
      }
    } catch (err) {
      console.error('Failed to submit action:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDrillAction = async () => {
    if (!activeMiniDrill || !drillActionId) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient(`/simulations/mini/${activeMiniDrill.scenarioId}/action`, {
        method: 'POST',
        body: JSON.stringify({ actionId: drillActionId })
      });
      if (res?.data) {
        setDrillFeedback(res.data);
      }
    } catch (err) {
      console.error('Failed to submit mini drill action:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnToMainProblem = async () => {
    try {
      await apiClient('/simulations/return-to-main', { method: 'POST' });
      setActiveMiniDrill(null);
      setDrillFeedback(null);
      setDrillActionId('');
      loadProblem();
    } catch (err) {
      console.error('Failed to return to main problem:', err);
    }
  };

  if (isLoading) {
    return (
      <DashboardShell title="Problem Workspace">
        <div className="flex-1 flex items-center justify-center min-h-[60vh] p-8">
          <div className="text-center text-[#686860]">
            <div className="animate-spin w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full mx-auto mb-3" />
            Loading evolving engineering simulation...
          </div>
        </div>
      </DashboardShell>
    );
  }

  const currentEvidence = (activeStage?.availableEvidence || []).find((e: any) => e.id === activeEvidenceTab);

  return (
    <DashboardShell title="Problem-First Track">
      <div className="flex-1 flex flex-col gap-4 max-w-7xl mx-auto w-full pb-8">
        {/* Workspace Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#131126] border border-[#d9d9d2] dark:border-white/5 rounded-[22px] p-4 sm:p-5 shadow-sm transition-colors">
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <span className="px-2.5 py-1 rounded-full bg-[#d8ff19]/20 border border-[#d8ff19]/50 text-[11px] font-bold text-[#111111] dark:text-white flex items-center">
                <Activity className="w-3 h-3 mr-1 text-[#15803d]" />
                Problem-First Track
              </span>
              {resolvedGoalName && (
                <span className="px-2.5 py-1 rounded-full bg-[#111111] text-[11px] font-bold text-[#d8ff19]">
                  {resolvedGoalName}
                </span>
              )}
              <span className="text-xs font-medium text-[#686860] dark:text-[#948BA5]">
                Stage {problemData?.session?.currentStageIndex || 1} of {problemData?.session?.totalStages || 3}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111111] dark:text-white mt-1.5 tracking-tight">
              {problemData?.scenario?.title || 'Evolving Engineering Problem'}
            </h1>
          </div>

          <div className="flex items-center space-x-2.5">
            <Link href="/my-learning">
              <button className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F1F1EC] dark:bg-[#161525] border border-[#d9d9d2] dark:border-white/10 hover:border-[#111111] text-[#111111] dark:text-[#C5BDD7] hover:text-black transition-all flex items-center shadow-sm">
                <Layers className="w-3.5 h-3.5 mr-1.5" />
                View Master Path
              </button>
            </Link>
            <button
              onClick={loadProblem}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F1F1EC] dark:bg-[#161525] border border-[#d9d9d2] dark:border-white/10 hover:border-[#111111] text-[#111111] dark:text-[#C5BDD7] hover:text-black transition-all flex items-center shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Sync State
            </button>
          </div>
        </div>

        {/* MINI-SIMULATION DRILL OVERLAY MODAL */}
        {activeMiniDrill && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-2xl w-full p-6 bg-white dark:bg-[#131126] border border-[#d9d9d2] shadow-2xl rounded-[24px] animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#d9d9d2] dark:border-white/10">
                <div className="flex items-center space-x-2">
                  <GitBranch className="w-5 h-5 text-[#15803d]" />
                  <span className="px-2.5 py-0.5 rounded-full bg-[#d8ff19]/25 border border-[#d8ff19]/50 text-xs font-bold text-[#111111]">
                    Remediation Branch Drill
                  </span>
                </div>
                <span className="text-xs text-[#686860] dark:text-[#948BA5]">Main Problem State Preserved</span>
              </div>

              <h3 className="text-lg font-bold text-[#111111] dark:text-white">{activeMiniDrill.title}</h3>
              <p className="text-xs text-[#686860] dark:text-[#C5BDD7] mt-1.5 leading-relaxed">{activeMiniDrill.description}</p>

              {/* Drill Actions */}
              <div className="my-5 space-y-2">
                <label className="block text-[11px] font-bold text-[#111111] dark:text-white uppercase tracking-wider mb-2">
                  Select Optimal Corrective Action:
                </label>
                {(activeMiniDrill.allowedActions || []).map((action: any) => {
                  const isSelected = drillActionId === action.id;
                  return (
                    <div
                      key={action.id}
                      onClick={() => setDrillActionId(action.id)}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#111111] bg-[#d8ff19]/20 font-bold text-[#111111] ring-1.5 ring-[#111111] shadow-xs'
                          : 'border-[#d9d9d2] dark:border-white/10 hover:border-[#111111] bg-white dark:bg-[#161525] text-[#111111] dark:text-[#C5BDD7]'
                      }`}
                    >
                      {action.label}
                    </div>
                  );
                })}
              </div>

              {drillFeedback && (
                <div className={`p-4 rounded-xl text-xs mb-4 border ${
                  drillFeedback.isSuccess 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300' 
                    : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-500/30 text-red-800 dark:text-red-300'
                }`}>
                  <div className="font-bold mb-1">{drillFeedback.isSuccess ? 'Verification Passed!' : 'Adjustment Required'}</div>
                  <div>{drillFeedback.feedback}</div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#d9d9d2] dark:border-white/10">
                {!drillFeedback?.isSuccess ? (
                  <button
                    onClick={handleSubmitDrillAction}
                    disabled={!drillActionId || isSubmitting}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#111111] hover:bg-black text-[#d8ff19] shadow-sm disabled:opacity-50"
                  >
                    Verify Drill Solution
                  </button>
                ) : (
                  <button
                    onClick={handleReturnToMainProblem}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#15803d] hover:bg-[#166534] text-white flex items-center shadow-md"
                  >
                    Resume Main Problem
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workspace Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Stage Details, State & Telemetry Panel (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-white dark:bg-[#131126] border border-[#d9d9d2] dark:border-white/5 rounded-[22px] p-5 shadow-sm transition-colors">
              <div className="flex items-center justify-between mb-2.5">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-500/30 text-[11px] font-bold text-orange-700 dark:text-orange-400">
                  Active Challenge Stage
                </span>
                <span className="text-[11px] text-[#686860] dark:text-[#948BA5]">Deterministic test suite enabled</span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-[#111111] dark:text-white tracking-tight">
                {activeStage?.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#686860] dark:text-[#C5BDD7] mt-1.5 leading-relaxed">
                {activeStage?.problemStatement}
              </p>

              {/* Observed System Metrics */}
              {activeStage?.state && (
                <div className="mt-4 p-3.5 rounded-xl bg-[#F8F8F4] dark:bg-[#161525] border border-[#d9d9d2] dark:border-white/5">
                  <div className="text-[11px] font-bold text-[#111111] dark:text-white uppercase tracking-wider mb-2">
                    Observed System Metrics
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(activeStage.state).map(([key, val]) => (
                      <div key={key} className="bg-white dark:bg-[#1E1A38] p-2.5 rounded-lg border border-[#d9d9d2] dark:border-white/5 shadow-sm">
                        <div className="text-[10px] text-[#686860] dark:text-[#948BA5] font-semibold uppercase">{key}</div>
                        <div className="text-sm font-bold text-[#111111] dark:text-white mt-0.5">{String(val)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Diagnostic Telemetry & Traces Terminal */}
            <div className="bg-white dark:bg-[#131126] border border-[#d9d9d2] dark:border-white/5 rounded-[22px] p-5 shadow-sm flex-1 flex flex-col transition-colors">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#d9d9d2] dark:border-white/5">
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-[#111111]" />
                  <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                    Diagnostic Telemetry & Traces
                  </h3>
                </div>
              </div>

              {/* Evidence Tabs */}
              <div className="flex flex-wrap gap-2 mb-3">
                {(activeStage?.availableEvidence || []).map((ev: any) => {
                  const isSelected = activeEvidenceTab === ev.id;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setActiveEvidenceTab(ev.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'border-[#111111] bg-[#d8ff19] text-[#111111] font-bold shadow-xs'
                          : 'border-[#d9d9d2] dark:border-white/10 bg-[#F8F8F4] dark:bg-[#161525] text-[#686860] dark:text-[#C5BDD7] hover:border-[#111111] hover:text-[#111111]'
                      }`}
                    >
                      {ev.title}
                    </button>
                  );
                })}
              </div>

              {currentEvidence && (
                <div className="rounded-xl border border-slate-800 bg-[#0A0915] p-4 font-mono text-xs text-slate-200 overflow-x-auto min-h-[160px] flex-1">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
                    <span className="flex items-center space-x-1.5">
                      <Terminal className="w-3.5 h-3.5 text-[#d8ff19]" />
                      <span>TYPE: {currentEvidence.type}</span>
                    </span>
                    <span>REF: {currentEvidence.id}</span>
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed text-slate-300">
                    {typeof currentEvidence.data === 'string'
                      ? currentEvidence.data
                      : JSON.stringify(currentEvidence.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Decision Controls & Verification Feedback (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white dark:bg-[#131126] border border-[#d9d9d2] dark:border-white/5 rounded-[22px] p-5 shadow-sm flex flex-col justify-between transition-colors">
              <div>
                <h3 className="text-xs font-bold text-[#111111] dark:text-white uppercase tracking-wider mb-3.5 pb-2 border-b border-[#d9d9d2] dark:border-white/5">
                  Architectural & Engineering Actions
                </h3>

                <div className="space-y-2.5 mb-5">
                  {(activeStage?.allowedActions || []).map((action: any) => {
                    const isSelected = selectedActionId === action.id;
                    return (
                      <div
                        key={action.id}
                        onClick={() => setSelectedActionId(action.id)}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#111111] bg-[#d8ff19]/20 text-[#111111] font-bold ring-1.5 ring-[#111111] shadow-xs'
                            : 'border-[#d9d9d2] dark:border-white/10 hover:border-[#111111] bg-[#F8F8F4] dark:bg-[#161525] text-[#111111] dark:text-[#C5BDD7]'
                        }`}
                      >
                        {action.label}
                      </div>
                    );
                  })}
                </div>

                {/* Verification Feedback Banner */}
                {actionFeedback && (
                  <div className={`p-4 rounded-xl text-xs mb-4 border ${
                    actionFeedback.isSuccess 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300' 
                      : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-500/30 text-red-800 dark:text-red-300'
                  }`}>
                    <div className="font-bold mb-1 flex items-center">
                      {actionFeedback.isSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mr-1.5" />
                          Verification Passed!
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 mr-1.5" />
                          Constraint Violated
                        </>
                      )}
                    </div>
                    <div>{actionFeedback.feedback}</div>
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmitAction}
                disabled={!selectedActionId || isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-bold bg-[#111111] hover:bg-black text-[#d8ff19] shadow-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Evaluating System State...' : 'Apply Decision & Run Verification'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function ProblemWorkspacePage() {
  return (
    <Suspense
      fallback={
        <DashboardShell title="Problem Workspace">
          <div className="flex-1 flex items-center justify-center min-h-[60vh] p-8">
            <div className="text-center text-[#686860]">
              <div className="animate-spin w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full mx-auto mb-3" />
              Loading problem workspace...
            </div>
          </div>
        </DashboardShell>
      }
    >
      <ProblemWorkspaceContent />
    </Suspense>
  );
}
