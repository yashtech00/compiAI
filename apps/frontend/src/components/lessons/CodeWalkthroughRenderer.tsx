'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal, Bot, BookOpen } from 'lucide-react';

interface CodeWalkthroughRendererProps {
  language?: string;
  code: string;
  explanation?: string;
  onAskTutor?: () => void;
}

export function CodeWalkthroughRenderer({
  language = 'typescript',
  code,
  explanation,
  onAskTutor,
}: CodeWalkthroughRendererProps) {
  const [copied, setCopied] = useState(false);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const cleanCode = code ? code.trim() : '// Technical implementation code';
  const lines = cleanCode.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <article className="flex flex-col gap-6 animate-fadeIn">
      {/* Stage Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#17172A] dark:text-white tracking-tight">
          Technical Walkthrough & Code Mechanics
        </h2>
        <p className="text-xs sm:text-sm text-[#62647A] dark:text-slate-400 mt-1 leading-relaxed">
          Inspect how this concept executes in actual production code line by line.
        </p>
      </div>

      {/* Code Editor Frame */}
      <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl flex flex-col">
        {/* Editor Top Bar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-slate-900/90 border-b border-slate-800 text-xs select-none">
          <div className="flex items-center gap-2.5">
            {/* Window Controls */}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="h-4 w-px bg-slate-800 mx-1" />
            <div className="flex items-center gap-1.5 text-slate-300 font-mono font-medium">
              <Terminal className="w-3.5 h-3.5 text-[#6D5EF7]" />
              <span>solution.{language === 'javascript' ? 'js' : language === 'python' ? 'py' : language === 'sql' ? 'sql' : 'ts'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase font-semibold bg-slate-800 text-slate-300">
              {language}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-medium"
              title="Copy code to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Content with Line Numbers */}
        <div className="p-4 sm:p-5 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed text-slate-200">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((lineText, idx) => {
                const lineNum = idx + 1;
                const isSelected = selectedLine === lineNum;
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedLine(isSelected ? null : lineNum)}
                    className={`transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-[#6D5EF7]/20 border-l-2 border-[#6D5EF7]'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <td className="w-8 sm:w-10 pr-3 sm:pr-4 text-right text-slate-600 select-none group-hover:text-slate-400">
                      {lineNum}
                    </td>
                    <td className="pl-2 whitespace-pre text-sky-200 group-hover:text-white">
                      {lineText || ' '}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Action bar below code */}
        {onAskTutor && (
          <div className="px-4 sm:px-5 py-2.5 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              Click any line to highlight and discuss with tutor.
            </span>
            <button
              onClick={onAskTutor}
              className="inline-flex items-center gap-1.5 text-xs text-[#6D5EF7] hover:text-indigo-400 font-semibold"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Ask Tutor to Explain Line</span>
            </button>
          </div>
        )}
      </div>

      {/* Explanatory Walkthrough Section */}
      {explanation && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E3E7F0] dark:border-slate-800 shadow-sm flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#6D5EF7]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#62647A] dark:text-slate-400">
              Code Mechanics Explanation
            </h3>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {explanation}
          </p>
        </div>
      )}
    </article>
  );
}
