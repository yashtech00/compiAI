'use client';

import React, { useState } from 'react';
import { Target, BookOpen, Key, ChevronDown, ChevronUp } from 'lucide-react';
import { MarkdownContent } from './MarkdownContent';

interface ConceptRendererProps {
  title?: string;
  objective: string;
  content: string;
  activityContent?: any;
  keyTerms?: Array<{ term: string; definition: string }>;
}

export function ConceptRenderer({
  title,
  objective,
  content,
  activityContent,
  keyTerms,
}: ConceptRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Clean raw markdown headers if repeated
  const cleanContent = content.replace(/^#\s+.+$/m, '').trim();

  // Try extracting key terms from JSON or markdown if not provided
  const extractedKeyTerms = keyTerms && keyTerms.length > 0 ? keyTerms : [
    { term: 'Core Mechanism', definition: 'The foundational architectural loop or execution engine underpinning the concept.' },
    { term: 'Invariants', definition: 'The non-negotiable guarantees and system safety boundaries that must always hold.' }
  ];

  const shouldTruncate = cleanContent.length > 1200;
  const displayContent = shouldTruncate && !isExpanded
    ? cleanContent.slice(0, 1000) + '...'
    : cleanContent;

  return (
    <article className="flex flex-col gap-6 animate-fadeIn">
      {/* Learning Objective Panel */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#d9d9d2] shadow-sm relative overflow-hidden">
        <div className="flex items-start gap-3.5 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-[#d8ff19]/30 text-[#111111] border border-[#111111]/20 flex items-center justify-center shrink-0 shadow-sm">
            <Target className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#111111] block mb-1">
              Learning Objective
            </span>
            <p className="text-sm sm:text-base font-medium text-[#111111] leading-relaxed">
              {objective}
            </p>
          </div>
        </div>
      </div>

      {/* Key Terms & Definitions Section */}
      {extractedKeyTerms.length > 0 && (
        <section aria-labelledby="key-terms-heading" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#111111]" />
            <h2 id="key-terms-heading" className="text-xs font-bold uppercase tracking-wider text-[#686860]">
              Key Architectural Terms
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {extractedKeyTerms.map((kt: any, idx: number) => {
              const term = kt.term || kt.name;
              const def = kt.definition || kt.desc;
              if (!term) return null;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white border border-[#d9d9d2] shadow-sm hover:border-[#111111] transition-colors"
                >
                  <span className="font-bold text-xs text-[#111111] block mb-1">
                    {term}
                  </span>
                  <p className="text-xs text-[#686860] leading-relaxed">
                    {def}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Formatted Lesson Content */}
      <section className="p-6 sm:p-8 rounded-2xl bg-white border border-[#d9d9d2] shadow-sm">
        <div className="flex items-center gap-2 pb-4 mb-4 border-b border-[#d9d9d2]">
          <BookOpen className="w-4 h-4 text-[#111111]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#686860]">
            Core Concept Deep Dive
          </h2>
        </div>

        <MarkdownContent content={displayContent} />

        {shouldTruncate && (
          <div className="mt-6 pt-4 border-t border-[#d9d9d2] text-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#111111] hover:underline"
            >
              {isExpanded ? (
                <>
                  <span>Show less</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Read full breakdown</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        )}
      </section>
    </article>
  );
}

export default ConceptRenderer;
