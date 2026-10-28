'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import {
  ArrowRight,
  CheckCircle2,
  Trophy,
  Activity,
  Search,
  ShieldAlert,
  Terminal
} from 'lucide-react';

function AssessmentContent() {
  const searchParams = useSearchParams();
  const goalParam = searchParams.get('goalId') || 'system-design';

  const [selectedGoal, setSelectedGoal] = useState(goalParam);
  const [scenario, setScenario] = useState<any | null>(null);
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<string>('');
  const [inspectedEvidence, setInspectedEvidence] = useState<Set<string>>(new Set());
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [explanation, setExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);

  // Load diagnostic simulation for the selected goal
  useEffect(() => {
    async function loadScenario() {
      setIsLoading(true);
      try {
        const res = await apiClient(`/simulations/diagnostic/${selectedGoal}`);
        if (res?.scenario) {
          setScenario(res.scenario);
          if (res.scenario.availableEvidence?.length > 0) {
            setActiveEvidenceTab(res.scenario.availableEvidence[0].id);
            setInspectedEvidence(new Set([res.scenario.availableEvidence[0].id]));
          }
        }
      } catch (err) {
        console.error('Failed to load simulation diagnostic:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadScenario();
  }, [selectedGoal]);

  const handleSelectEvidence = (evId: string) => {
    setActiveEvidenceTab(evId);
    setInspectedEvidence(prev => new Set([...Array.from(prev), evId]));
  };

  const handleToggleAction = (actionId: string, category: string) => {
    setSelectedActions(prev => {
      const next = new Set(prev);
      const categoryActions = (scenario?.allowedActions || [])
        .filter((a: any) => a.category === category)
        .map((a: any) => a.id);

      categoryActions.forEach((id: string) => next.delete(id));
      next.add(actionId);
      return next;
    });
  };

  const handleSubmitSimulation = async () => {
    if (!scenario) return;
    setIsSubmitting(true);
    try {
      const payload = {
        selectedActionIds: Array.from(selectedActions),
        evidenceInspected: Array.from(inspectedEvidence),
        explanation,
        hintsUsed: 0,
        idempotencyKey: `diag_sub_${selectedGoal}_${Date.now()}`
      };

      const res = await apiClient(`/simulations/diagnostic/${selectedGoal}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res?.data) {
        setSimulationResult(res.data);
      }
    } catch (err) {
      console.error('Failed to submit simulation diagnostic:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardShell title="Diagnostic Assessment">
        <div className="flex-1 flex items-center justify-center min-h-[60vh] p-8">
          <div className="text-center text-[#686860]">
            <div className="animate-spin w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full mx-auto mb-3" />
            Initializing diagnostic simulation environment...
          </div>
        </div>
      </DashboardShell>
    );
  }

  // SIMULATION RESULT VIEW
  if (simulationResult) {
    const { dimensionScores, isCriticalFailure, criticalFailureReasons, rationale } = simulationResult;

    return (
      <DashboardShell title="Diagnostic Results">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-3xl mx-auto w-full">
          <div className="w-full p-8 text-center bg-white dark:bg-[#131126] border border-[#d9d9d2] dark:border-white/5 rounded-[24px] shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#d8ff19]/25 border border-[#d8ff19]/50 flex items-center justify-center mx-auto text-[#111111] mb-4">
              <Trophy className="w-8 h-8 text-[#111111]" />
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-semibold mb-3 inline-block ${
              isCriticalFailure 
                ? 'bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400' 
                : 'bg-[#d8ff19]/25 border border-[#d8ff19]/50 text-[#111111] font-bold'
            }`}>
              {isCriticalFailure ? 'Critical Constraint Triggered' : 'Diagnostic Simulation Verified'}
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] dark:text-white tracking-tight">
              Baseline Assessment Verified
            </h1>
            <p className="text-xs sm:text-sm text-[#686860] dark:text-[#C5BDD7] mt-1.5 max-w-lg mx-auto">
              Your decisions were evaluated across 4 empirical dimensions. We mapped your personalized entry point into the versioned Master Path.
            </p>

            {/* CRITICAL FAILURE ALERT */}
            {isCriticalFailure && (
              <div className="my-5 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-left flex items-start space-x-3">
                <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-red-800 dark:text-red-300">Critical Failure Overrides High Score</h4>
                  <p className="text-[11px] text-red-700 dark:text-red-400/90 mt-0.5 leading-relaxed">
                    {criticalFailureReasons?.join('; ') || 'An architectural choice violated a fundamental safety constraint. Score is capped at 45%.'}
                  </p>
                </div>
              </div>
            )}

            {/* 4-DIMENSIONAL MASTERY BREAKDOWN */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
              <div className="p-4 bg-[#F1F1EC] dark:bg-[#161525] rounded-[18px] border border-[#d9d9d2] dark:border-white/5 text-center">
                <div className="text-[10px] font-semibold text-[#686860] dark:text-[#948BA5] uppercase tracking-wider">Diagnosis</div>
                <div className="text-2xl font-bold text-[#111111] dark:text-white mt-1">{dimensionScores?.diagnosis || 0}%</div>
                <div className="text-[10px] text-[#686860] dark:text-[#948BA5] mt-0.5">Weight: 30%</div>
              </div>
              <div className="p-4 bg-[#F1F1EC] dark:bg-[#161525] rounded-[18px] border border-[#d9d9d2] dark:border-white/5 text-center">
                <div className="text-[10px] font-semibold text-[#686860] dark:text-[#948BA5] uppercase tracking-wider">Investigation</div>
                <div className="text-2xl font-bold text-[#111111] dark:text-white mt-1">{dimensionScores?.investigation || 0}%</div>
                <div className="text-[10px] text-[#686860] dark:text-[#948BA5] mt-0.5">Weight: 25%</div>
              </div>
              <div className="p-4 bg-[#F1F1EC] dark:bg-[#161525] rounded-[18px] border border-[#d9d9d2] dark:border-white/5 text-center">
                <div className="text-[10px] font-semibold text-[#686860] dark:text-[#948BA5] uppercase tracking-wider">Implementation</div>
                <div className="text-2xl font-bold text-[#111111] dark:text-white mt-1">{dimensionScores?.implementation || 0}%</div>
                <div className="text-[10px] text-[#686860] dark:text-[#948BA5] mt-0.5">Weight: 25%</div>
              </div>
              <div className="p-4 bg-[#F1F1EC] dark:bg-[#161525] rounded-[18px] border border-[#d9d9d2] dark:border-white/5 text-center">
                <div className="text-[10px] font-semibold text-[#686860] dark:text-[#948BA5] uppercase tracking-wider">Verification</div>
                <div className="text-2xl font-bold text-[#111111] dark:text-white mt-1">{dimensionScores?.verification || 0}%</div>
                <div className="text-[10px] text-[#686860] dark:text-[#948BA5] mt-0.5">Weight: 20%</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F8F4] dark:bg-[#161525] border border-[#d9d9d2] dark:border-white/5 text-left mb-6">
              <div className="text-[10px] font-bold text-[#111111] uppercase tracking-wider mb-1">Evaluator Feedback</div>
              <p className="text-xs text-[#686860] dark:text-[#C5BDD7] leading-relaxed">{rationale}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href={`/problem?goalId=${selectedGoal}`} className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold bg-[#111111] hover:bg-black text-[#d8ff19] shadow-sm flex items-center justify-center gap-2">
                  <span>Launch Problem-First Learning Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/my-learning" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-semibold bg-[#F1F1EC] dark:bg-[#161525] border border-[#d9d9d2] dark:border-white/10 hover:border-[#111111] text-[#111111] dark:text-[#C5BDD7] hover:text-black transition-all">
                  View My Master Path
                </button>
              </Link>
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  // ACTIVE INTERACTIVE DIAGNOSTIC SIMULATION WORKSPACE
  const currentEvidence = (scenario?.availableEvidence || []).find((e: any) => e.id === activeEvidenceTab);

  return (
    <DashboardShell title="Diagnostic Simulation">
      <div className="flex-1 flex flex-col gap-4 max-w-7xl mx-auto w-full pb-8">
        {/* Top Header & Goal Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131126] border border-[#d9d9d2] dark:border-white/5 rounded-[22px] p-4 sm:p-5 shadow-sm">
          <div>
            <span className="px-2.5 py-1 rounded-full bg-[#d8ff19]/20 border border-[#d8ff19]/50 text-[11px] font-bold text-[#111111] dark:text-white flex items-center w-fit mb-2">
              <Activity className="w-3.5 h-3.5 mr-1 text-[#15803d]" />
              Interactive Diagnostic Simulation
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111111] dark:text-white tracking-tight">
              {scenario?.title || 'Diagnostic Scenario'}
            </h1>
            <p className="text-xs sm:text-sm text-[#686860] dark:text-[#C5BDD7] mt-1 max-w-2xl leading-relaxed">
              {scenario?.description}
            </p>
          </div>

          {/* Goal Selector Switch */}
          <div className="flex items-center space-x-1.5 bg-[#F1F1EC] dark:bg-[#161525] p-1.5 rounded-xl border border-[#d9d9d2] dark:border-white/5">
            {[
              { id: 'system-design', label: 'System Design' },
              { id: 'backend-development', label: 'Backend' },
              { id: 'full-stack-development', label: 'Full Stack' }
            ].map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGoal(g.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedGoal === g.id
                    ? 'bg-[#111111] text-[#d8ff19] shadow-sm font-bold'
                    : 'text-[#686860] dark:text-[#948BA5] hover:text-[#111111] dark:hover:text-white'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Interactive Evidence Inspection Panel (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-white dark:bg-[#131126] border border-[#d9d9d2] dark:border-white/5 rounded-[22px] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#d9d9d2] dark:border-white/5">
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-[#111111]" />
                  <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                    Available Evidence ({inspectedEvidence.size}/{(scenario?.availableEvidence || []).length} inspected)
                  </h3>
                </div>
                <span className="text-[11px] text-[#686860]">Inspect telemetry before deciding</span>
              </div>

              {/* Evidence Tabs */}
              <div className="flex flex-wrap gap-2 mb-3.5">
                {(scenario?.availableEvidence || []).map((ev: any) => {
                  const isSelected = activeEvidenceTab === ev.id;
                  const isInspected = inspectedEvidence.has(ev.id);
                  return (
                    <button
                      key={ev.id}
                      onClick={() => handleSelectEvidence(ev.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 border transition-all ${
                        isSelected
                          ? 'border-[#111111] bg-[#d8ff19] text-[#111111] shadow-sm font-bold'
                          : isInspected
                          ? 'border-[#d9d9d2] bg-[#F1F1EC] text-[#111111] hover:border-[#111111]'
                          : 'border-[#d9d9d2] bg-white text-[#686860] hover:text-[#111111]'
                      }`}
                    >
                      <span>{ev.title}</span>
                      {isInspected && <CheckCircle2 className="w-3.5 h-3.5 text-[#21865B]" />}
                    </button>
                  );
                })}
              </div>

              {/* Evidence Content Viewer */}
              {currentEvidence && (
                <div className="rounded-xl border border-[#3d3d36] bg-[#0A0915] p-4 font-mono text-xs text-slate-200 overflow-x-auto min-h-[220px]">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10 text-[11px] text-[#948BA5]">
                    <span className="flex items-center space-x-1.5">
                      <Terminal className="w-3.5 h-3.5 text-blue-400" />
                      <span>{currentEvidence.type} TELEMETRY TRACE</span>
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

            {/* Explanation Textarea */}
            <div className="bg-white dark:bg-[#131126] border border-[#d9d9d2] dark:border-white/5 rounded-[22px] p-5 shadow-sm">
              <h4 className="text-[11px] font-bold text-[#111111] dark:text-white uppercase tracking-wider mb-1">
                Engineering Rationale (Optional)
              </h4>
              <p className="text-xs text-[#686860] dark:text-[#948BA5] mb-2.5">
                Briefly explain why your selected actions address the root cause and avoid safety risks.
              </p>
              <textarea
                rows={3}
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                placeholder="e.g. Sequential scan on user_devices saturates connection pool. Adding compound index covers active device lookups..."
                className="w-full p-3 text-xs rounded-xl border border-[#d9d9d2] bg-[#F8F8F4] text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
              />
            </div>
          </div>

          {/* Right Column: Decision Controls (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white dark:bg-[#131126] border border-[#d9d9d2] dark:border-white/5 rounded-[22px] p-5 shadow-sm">
              <h3 className="text-xs font-bold text-[#111111] dark:text-white uppercase tracking-wider mb-4 pb-2.5 border-b border-[#d9d9d2] dark:border-white/5">
                Select Engineering Decisions
              </h3>

              {/* Category: DIAGNOSIS */}
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-[#111111] dark:text-[#d8ff19] uppercase tracking-wider mb-2">
                  1. Identify Root Cause (Diagnosis 30%)
                </label>
                <div className="space-y-2">
                  {(scenario?.allowedActions || [])
                    .filter((a: any) => a.category === 'DIAGNOSIS')
                    .map((action: any) => {
                      const isSelected = selectedActions.has(action.id);
                      return (
                        <div
                          key={action.id}
                          onClick={() => handleToggleAction(action.id, 'DIAGNOSIS')}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#111111] bg-[#d8ff19]/20 text-[#111111] font-bold shadow-xs ring-1.5 ring-[#111111]'
                              : 'border-[#d9d9d2] dark:border-white/10 hover:border-[#111111] bg-[#F8F8F4] dark:bg-[#161525] text-[#111111] dark:text-[#C5BDD7]'
                          }`}
                        >
                          {action.label}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Category: IMPLEMENTATION */}
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-[#111111] dark:text-white uppercase tracking-wider mb-2">
                  2. Implement Fix (Implementation 25%)
                </label>
                <div className="space-y-2">
                  {(scenario?.allowedActions || [])
                    .filter((a: any) => a.category === 'IMPLEMENTATION')
                    .map((action: any) => {
                      const isSelected = selectedActions.has(action.id);
                      return (
                        <div
                          key={action.id}
                          onClick={() => handleToggleAction(action.id, 'IMPLEMENTATION')}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#111111] bg-[#d8ff19]/20 text-[#111111] font-bold shadow-xs ring-1.5 ring-[#111111]'
                              : 'border-[#d9d9d2] dark:border-white/10 hover:border-[#111111] bg-[#F8F8F4] dark:bg-[#161525] text-[#111111] dark:text-[#C5BDD7]'
                          }`}
                        >
                          {action.label}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Category: VERIFICATION */}
              <div className="mb-5">
                <label className="block text-[11px] font-bold text-[#15803d] dark:text-[#d8ff19] uppercase tracking-wider mb-2">
                  3. Verify Fix (Verification 20%)
                </label>
                <div className="space-y-2">
                  {(scenario?.allowedActions || [])
                    .filter((a: any) => a.category === 'VERIFICATION')
                    .map((action: any) => {
                      const isSelected = selectedActions.has(action.id);
                      return (
                        <div
                          key={action.id}
                          onClick={() => handleToggleAction(action.id, 'VERIFICATION')}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#111111] bg-[#d8ff19]/20 text-[#111111] font-bold shadow-xs ring-1.5 ring-[#111111]'
                              : 'border-[#d9d9d2] dark:border-white/10 hover:border-[#111111] bg-[#F8F8F4] dark:bg-[#161525] text-[#111111] dark:text-[#C5BDD7]'
                          }`}
                        >
                          {action.label}
                        </div>
                      );
                    })}
                </div>
              </div>

              <button
                onClick={handleSubmitSimulation}
                disabled={isSubmitting || selectedActions.size === 0}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-bold bg-[#111111] hover:bg-black text-[#d8ff19] shadow-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Evaluating Empirical Evidence...' : 'Submit & Verify Architecture'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell title="Diagnostic Simulation">
          <div className="flex-1 flex items-center justify-center min-h-[60vh] p-8">
            <div className="text-center text-[#686860]">
              <div className="animate-spin w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full mx-auto mb-3" />
              Loading assessment environment...
            </div>
          </div>
        </DashboardShell>
      }
    >
      <AssessmentContent />
    </Suspense>
  );
}
