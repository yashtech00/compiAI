'use client';

import React, { useState } from 'react';
import { Lightbulb, AlertTriangle, Compass, CheckCircle2, ChevronRight } from 'lucide-react';

interface ExplanationRendererProps {
  analogy?: string;
  misconceptions?: string;
  intuition?: string;
  remediation?: string;
}

export function ExplanationRenderer({
  analogy,
  misconceptions,
  intuition,
  remediation,
}: ExplanationRendererProps) {
  const [reflectionAnswered, setReflectionAnswered] = useState(false);

  // Split misconceptions by semicolons or bullets if formatted as multiple
  const misconceptionList = misconceptions
    ? misconceptions.split(/;\s*|\n+/).filter(Boolean)
    : [];

  return (
    <article className="flex flex-col gap-6 animate-fadeIn">
      {/* Stage Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#17172A] dark:text-white tracking-tight">
          Understand It Simply
        </h2>
        <p className="text-xs sm:text-sm text-[#62647A] dark:text-slate-400 mt-1 leading-relaxed">
          Grounding abstract software architecture into an intuitive everyday mental model.
        </p>
      </div>

      {/* Relatable Analogy Card (Pale Blue / Lavender) */}
      {analogy && (
        <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-[#EFF8FF] via-[#F0EEFF] to-white dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-[#6D5EF7]/25 dark:border-indigo-800/40 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 text-[#5144E8] dark:text-indigo-400 border border-[#6D5EF7]/20 flex items-center justify-center shrink-0 shadow-sm">
              <Lightbulb className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5144E8] dark:text-indigo-400">
                  Relatable Analogy
                </span>
              </div>
              <p className="text-sm sm:text-base text-[#17172A] dark:text-slate-100 font-medium leading-relaxed">
                {analogy}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Intuition Deep Dive if present */}
      {intuition && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E3E7F0] dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Compass className="w-4 h-4 text-[#6D5EF7]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#62647A] dark:text-slate-400">
              Why This Mental Model Works
            </h3>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {intuition}
          </p>
        </div>
      )}

      {/* Common Misconceptions Card (Pale Amber) */}
      {misconceptionList.length > 0 && (
        <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7]/40 to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 border border-amber-300/60 dark:border-amber-800/40 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-amber-300/60 flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-2">
                Common Misconceptions to Avoid
              </span>
              <ul className="space-y-2.5">
                {misconceptionList.map((m, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#17172A] dark:text-slate-200">
                    <span className="text-amber-500 font-bold mt-0.5">•</span>
                    <span className="leading-relaxed">{m.trim()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Retention Tip if available */}
      {remediation && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
          <span className="font-semibold text-[#5144E8] dark:text-indigo-400">Memory Anchor:</span>
          <span>{remediation}</span>
        </div>
      )}

      {/* Interactive Quick Reflection */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E3E7F0] dark:border-slate-800 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#62647A] dark:text-slate-400 mb-2">
          Quick Mental Check
        </h3>
        <p className="text-xs sm:text-sm text-[#17172A] dark:text-slate-200 mb-3">
          Can you visualize the boundary between the caller and the runtime execution in your mind?
        </p>
        <button
          onClick={() => setReflectionAnswered(true)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            reflectionAnswered
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
              : 'bg-[#F0EEFF] dark:bg-indigo-950/40 text-[#5144E8] dark:text-indigo-300 hover:bg-[#6D5EF7] hover:text-white border border-[#6D5EF7]/30'
          }`}
        >
          {reflectionAnswered ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Mental Model Confirmed! You&apos;re ready for the architecture.</span>
            </>
          ) : (
            <>
              <span>Yes, I have the intuition</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </article>
  );
}
