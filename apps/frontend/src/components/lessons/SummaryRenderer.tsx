'use client';

import React from 'react';
import { CheckCircle2, BookmarkCheck, Calendar } from 'lucide-react';

interface SummaryRendererProps {
  summary?: string;
  takeaways?: string[] | string;
  remediation?: string;
  conceptName: string;
}

export function SummaryRenderer({
  summary,
  takeaways,
  remediation,
  conceptName,
}: SummaryRendererProps) {
  const takeawayList: string[] = Array.isArray(takeaways)
    ? takeaways
    : typeof takeaways === 'string'
    ? takeaways.split(/;\s*|\n+/).filter(Boolean)
    : [];

  return (
    <article className="flex flex-col gap-6 animate-fadeIn">
      {/* Stage Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#17172A] dark:text-white tracking-tight">
          Session Synthesis & Key Takeaways
        </h2>
        <p className="text-xs sm:text-sm text-[#62647A] dark:text-slate-400 mt-1 leading-relaxed">
          Review the core mental models before committing this milestone to your permanent knowledge graph.
        </p>
      </div>

      {/* Synthesis Overview Card */}
      <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-[#F0EEFF] via-white to-white dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 border border-[#6D5EF7]/25 dark:border-indigo-800/40 shadow-sm relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 text-[#5144E8] dark:text-indigo-400 border border-[#6D5EF7]/20 flex items-center justify-center shrink-0 shadow-sm">
            <BookmarkCheck className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5144E8] dark:text-indigo-400 block mb-1">
              Core Architectural Synthesis
            </span>
            <p className="text-sm sm:text-base text-[#17172A] dark:text-slate-100 font-medium leading-relaxed">
              {summary || `You have synthesized the fundamentals, mechanics, and trade-offs of ${conceptName}.`}
            </p>
          </div>
        </div>
      </div>

      {/* Key Takeaways Checklist */}
      {takeawayList.length > 0 && (
        <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-[#E3E7F0] dark:border-slate-800 shadow-sm flex flex-col gap-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#62647A] dark:text-slate-400">
            What You Mastered Today
          </h3>
          <div className="space-y-2.5">
            {takeawayList.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-start gap-3"
              >
                <CheckCircle2 className="w-4 h-4 text-[#6D5EF7] shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {item.trim()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retention Tip / Spaced Recall Notice */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#EFF8FF] dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 shadow-xs flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-200 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 block mb-0.5">
            Retention & Spaced Retrieval Anchor
          </span>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {remediation ||
              `A 2-minute micro-recall will automatically appear in your Daily Queue in 3 days to fight the Ebbinghaus forgetting curve.`}
          </p>
        </div>
      </div>
    </article>
  );
}
