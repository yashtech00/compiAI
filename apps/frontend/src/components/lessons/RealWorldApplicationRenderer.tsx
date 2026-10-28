'use client';

import React from 'react';
import { Briefcase, Scale, AlertOctagon } from 'lucide-react';

interface RealWorldApplicationRendererProps {
  scenario?: string;
  tradeoffs?: string[] | string;
  failureMode?: string;
}

export function RealWorldApplicationRenderer({
  scenario,
  tradeoffs,
  failureMode,
}: RealWorldApplicationRendererProps) {
  // Normalize tradeoffs to string[]
  const tradeoffList: string[] = Array.isArray(tradeoffs)
    ? tradeoffs
    : typeof tradeoffs === 'string'
    ? tradeoffs.split('\n').filter(Boolean)
    : [
        'Latency vs Memory Overhead: In-memory queues increase performance at the expense of footprint.',
        'Throughput vs Guarantee: Event-driven loops favor non-blocking throughput over CPU-bound intensive threads.'
      ];

  return (
    <article className="flex flex-col gap-6 animate-fadeIn">
      {/* Section Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
          Production Mechanics &amp; Real-World Trade-Offs
        </h2>
        <p className="text-xs sm:text-sm text-[#686860] mt-1 leading-relaxed">
          How production teams apply this architecture under real traffic, concurrency, and failure constraints.
        </p>
      </div>

      {/* Production Scenario Card */}
      {scenario && (
        <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#d9d9d2] shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#d8ff19]/30 text-[#111111] border border-[#111111]/20 flex items-center justify-center shrink-0 shadow-sm">
              <Briefcase className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#111111] block mb-1.5">
                Production Engineering Scenario
              </span>
              <p className="text-sm sm:text-base text-[#111111] font-medium leading-relaxed">
                {scenario}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trade-Offs Matrix Card */}
      {tradeoffList.length > 0 && (
        <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#d9d9d2] shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <Scale className="w-5 h-5 text-[#111111]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#686860]">
              Architectural Trade-Off Analysis
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {tradeoffList.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#F8F8F4] border border-[#d9d9d2] flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-[#111111] text-[#d8ff19] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                  {idx + 1}
                </div>
                <p className="text-xs sm:text-sm text-[#111111] leading-relaxed font-medium">
                  {item.trim()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks & Failure Mode Callout */}
      {failureMode && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#F8F8F4] border border-[#111111] shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white text-[#111111] border border-[#111111] flex items-center justify-center shrink-0 shadow-sm">
              <AlertOctagon className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#111111] block mb-1">
                Potential Failure Mode & Scale Bottleneck
              </span>
              <p className="text-xs sm:text-sm text-[#111111] leading-relaxed font-medium">
                {failureMode}
              </p>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default RealWorldApplicationRenderer;
