'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  ArrowRight,
  ArrowDown,
  Info,
  Code2,
  Server,
  Database,
  Cpu,
  Globe,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { ConceptVisualizer } from '@/components/visualizations/ConceptVisualizer';

interface ArchitectureRendererProps {
  conceptTitle: string;
  visualType?: string;
  diagram?: string;
  explanation?: string;
}

interface ParsedNode {
  id: string;
  title: string;
  subtitle?: string;
  role: string;
  iconType: 'client' | 'server' | 'database' | 'cpu' | 'service';
}

interface ParsedEdge {
  fromIndex: number;
  toIndex: number;
  label: string;
  isBidirectional?: boolean;
}

export function ArchitectureRenderer({
  conceptTitle,
  visualType = 'event-loop',
  diagram,
  explanation,
}: ArchitectureRendererProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('horizontal');

  // Check if this visualType is one of the 7 pre-built domain simulators
  const isPreBuilt = [
    'event-loop',
    'load-balancer',
    'b-tree-indexing',
    'idempotency-key',
    'cache-aside',
    'rag-pipeline',
    'closure-scope'
  ].includes(visualType);

  // Parse ASCII or text diagram into structured interactive nodes and edges
  const { nodes, edges } = useMemo(() => {
    if (!diagram) {
      // Default clean 3-tier distributed architecture
      const defaultNodes: ParsedNode[] = [
        { id: 'client', title: 'Client / Frontend', subtitle: 'Web & Mobile Apps', role: 'Initiator', iconType: 'client' },
        { id: 'gateway', title: 'API Gateway / Reverse Proxy', subtitle: 'Authentication & Rate Limiting', role: 'Router', iconType: 'server' },
        { id: 'service', title: 'Application Worker', subtitle: 'Core Domain Business Logic', role: 'Processor', iconType: 'cpu' },
        { id: 'storage', title: 'Distributed Storage / Cache', subtitle: 'PostgreSQL & Redis Cluster', role: 'State Store', iconType: 'database' }
      ];
      const defaultEdges: ParsedEdge[] = [
        { fromIndex: 0, toIndex: 1, label: 'HTTP / REST / gRPC' },
        { fromIndex: 1, toIndex: 2, label: 'TCP / RPC Dispatch' },
        { fromIndex: 2, toIndex: 3, label: 'ACID Queries / TTL Cache' }
      ];
      return { nodes: defaultNodes, edges: defaultEdges };
    }

    // Dynamic parsing of ASCII boxes e.g. | Node Name |
    const extractedNodes: ParsedNode[] = [];
    const lines = diagram.split('\n');

    // Extract text inside | ... |
    lines.forEach((line) => {
      const matches = line.match(/\|\s*([^|]+?)\s*\|/g);
      if (matches) {
        matches.forEach((m) => {
          const rawText = m.replace(/\|/g, '').trim();
          if (rawText && !rawText.match(/^[-+=*]+$/)) {
            // Check if it's already an existing node or subtitle
            const existing = extractedNodes[extractedNodes.length - 1];
            if (rawText.startsWith('(') && existing && !existing.subtitle) {
              existing.subtitle = rawText;
            } else if (!extractedNodes.some((n) => n.title.toLowerCase() === rawText.toLowerCase())) {
              const lower = rawText.toLowerCase();
              let iconType: ParsedNode['iconType'] = 'server';
              let role = 'Component';

              if (lower.includes('client') || lower.includes('user') || lower.includes('browser')) {
                iconType = 'client';
                role = 'Client Interface';
              } else if (lower.includes('db') || lower.includes('database') || lower.includes('store') || lower.includes('table') || lower.includes('cache')) {
                iconType = 'database';
                role = 'Data Layer';
              } else if (lower.includes('engine') || lower.includes('worker') || lower.includes('loop') || lower.includes('stack')) {
                iconType = 'cpu';
                role = 'Execution Core';
              } else if (lower.includes('gateway') || lower.includes('proxy') || lower.includes('lb') || lower.includes('router')) {
                iconType = 'service';
                role = 'Traffic Control';
              }

              extractedNodes.push({
                id: `node-${extractedNodes.length}`,
                title: rawText,
                role,
                iconType
              });
            }
          }
        });
      }
    });

    // Extract directional edges
    const extractedEdges: ParsedEdge[] = [];
    let edgeLabel = '';
    lines.forEach((line) => {
      if (line.includes('-->') || line.includes('---->')) {
        const isBidi = line.includes('<--');
        extractedEdges.push({
          fromIndex: Math.max(0, extractedNodes.length - 2),
          toIndex: Math.max(0, extractedNodes.length - 1),
          label: edgeLabel || 'Event / RPC',
          isBidirectional: isBidi
        });
        edgeLabel = '';
      } else {
        const words = line.replace(/[^A-Za-z0-9 /:_-]/g, '').trim();
        if (words && words.length > 2 && words.length < 35 && !words.includes('|')) {
          edgeLabel = words;
        }
      }
    });

    // Fallback if no edges found
    if (extractedNodes.length > 1 && extractedEdges.length === 0) {
      for (let i = 0; i < extractedNodes.length - 1; i++) {
        extractedEdges.push({
          fromIndex: i,
          toIndex: i + 1,
          label: 'Data Flow'
        });
      }
    }

    return {
      nodes: extractedNodes.length > 0 ? extractedNodes : ([
        { id: '1', title: conceptTitle || 'System Component', role: 'Primary System', iconType: 'server', subtitle: 'Architecture Node' }
      ] as ParsedNode[]),
      edges: extractedEdges
    };
  }, [diagram, conceptTitle]);

  const getNodeIcon = (type?: string) => {
    switch (type) {
      case 'client':
        return <Globe className="w-5 h-5 text-sky-500" />;
      case 'database':
        return <Database className="w-5 h-5 text-emerald-500" />;
      case 'cpu':
        return <Cpu className="w-5 h-5 text-amber-500" />;
      case 'service':
        return <Activity className="w-5 h-5 text-[#6D5EF7]" />;
      case 'server':
      default:
        return <Server className="w-5 h-5 text-[#5144E8]" />;
    }
  };

  // If this lesson is one of the domain simulators AND user hasn't explicitly toggled to dynamic schema
  if (isPreBuilt && !diagram) {
    return (
      <article className="flex flex-col gap-6 animate-fadeIn">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#17172A] dark:text-white tracking-tight">
            Interactive Architecture & State Flow
          </h2>
          <p className="text-xs sm:text-sm text-[#62647A] dark:text-slate-400 mt-1 leading-relaxed">
            Step through state transitions to observe data invariants and runtime mechanics.
          </p>
        </div>

        <ConceptVisualizer
          visualType={visualType}
          conceptTitle={conceptTitle}
          diagram={diagram}
          explanation={explanation}
        />
      </article>
    );
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  return (
    <article className="flex flex-col gap-6 animate-fadeIn">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#17172A] dark:text-white tracking-tight">
            Interactive Architecture Flow
          </h2>
          <p className="text-xs sm:text-sm text-[#62647A] dark:text-slate-400 mt-1 leading-relaxed">
            Click any node below to inspect its role, data inputs, and system boundaries.
          </p>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-lg border border-[#E3E7F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'visual'
                  ? 'bg-[#6D5EF7] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Visual</span>
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'code'
                  ? 'bg-[#6D5EF7] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Raw Schema</span>
            </button>
          </div>

          <button
            onClick={() => setLayoutMode(layoutMode === 'horizontal' ? 'vertical' : 'horizontal')}
            className="p-2 rounded-lg border border-[#E3E7F0] dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 text-xs font-medium"
            title="Toggle orientation"
          >
            {layoutMode === 'horizontal' ? 'Vertical Flow' : 'Horizontal Flow'}
          </button>
        </div>
      </div>

      {viewMode === 'visual' ? (
        <div className="flex flex-col gap-6">
          {/* Interactive Topology Graph Canvas */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#FAF9FF] to-white dark:from-slate-950 dark:to-slate-900 border border-[#E3E7F0] dark:border-slate-800 shadow-sm relative overflow-hidden">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#E3E7F0_1px,transparent_1px),linear-gradient(to_bottom,#E3E7F0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 pointer-events-none" />

            <div
              className={`relative z-10 flex ${
                layoutMode === 'horizontal'
                  ? 'flex-col md:flex-row items-center justify-around'
                  : 'flex-col items-center'
              } gap-6 md:gap-4`}
            >
              {nodes.map((node, index) => {
                const isSelected = selectedNodeId === node.id || (!selectedNodeId && index === 0);
                return (
                  <React.Fragment key={node.id}>
                    {/* Node Card */}
                    <div
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`group cursor-pointer p-4 sm:p-5 rounded-2xl border transition-all duration-300 w-full sm:w-64 max-w-xs shadow-sm hover:shadow-md ${
                        isSelected
                          ? 'border-[#6D5EF7] bg-white dark:bg-slate-900 ring-4 ring-[#6D5EF7]/15 scale-[1.03] shadow-lg'
                          : 'border-[#E3E7F0] dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 hover:border-[#6D5EF7]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="p-2 rounded-xl bg-[#F0EEFF] dark:bg-indigo-950/60 border border-[#6D5EF7]/20">
                          {getNodeIcon(node.iconType)}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {node.role}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-[#17172A] dark:text-white leading-tight">
                        {node.title}
                      </h4>

                      {node.subtitle && (
                        <p className="text-[11px] text-[#62647A] dark:text-slate-400 mt-1 font-mono">
                          {node.subtitle}
                        </p>
                      )}

                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="text-[#5144E8] dark:text-indigo-400 font-semibold group-hover:underline">
                          {isSelected ? 'Selected Node' : 'Click to inspect'}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#6D5EF7]" />}
                      </div>
                    </div>

                    {/* Directional Connector Arrow */}
                    {index < nodes.length - 1 && (
                      <div className="flex flex-col items-center justify-center py-2 px-2 shrink-0">
                        <div className="hidden md:block">
                          {layoutMode === 'horizontal' ? (
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-[#5144E8] dark:text-indigo-400 uppercase tracking-tight bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-[#E3E7F0] dark:border-slate-800 shadow-xs mb-1">
                                {edges[index]?.label || 'Data Flow'}
                              </span>
                              <div className="flex items-center">
                                <div className="w-12 h-0.5 bg-gradient-to-r from-[#6D5EF7] to-indigo-400" />
                                <ArrowRight className="w-4 h-4 text-[#6D5EF7] -ml-1.5" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center my-1">
                              <span className="text-[10px] font-bold text-[#5144E8] dark:text-indigo-400 uppercase tracking-tight bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-[#E3E7F0] dark:border-slate-800 shadow-xs mb-1">
                                {edges[index]?.label || 'Data Flow'}
                              </span>
                              <div className="h-8 w-0.5 bg-[#6D5EF7]" />
                              <ArrowDown className="w-4 h-4 text-[#6D5EF7] -mt-1" />
                            </div>
                          )}
                        </div>

                        {/* Mobile Connector */}
                        <div className="md:hidden flex flex-col items-center my-1">
                          <span className="text-[10px] font-bold text-[#5144E8] dark:text-indigo-400 uppercase tracking-tight bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-[#E3E7F0] dark:border-slate-800 shadow-xs mb-1">
                            {edges[index]?.label || 'Next Step'}
                          </span>
                          <ArrowDown className="w-4 h-4 text-[#6D5EF7]" />
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Contextual Node Inspector Panel */}
          {selectedNode && (
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#6D5EF7]/25 dark:border-indigo-800/40 shadow-sm flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#6D5EF7]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5144E8] dark:text-indigo-300">
                  Node Inspector: {selectedNode.title}
                </h3>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong className="text-[#17172A] dark:text-white font-semibold">{selectedNode.title}</strong> acts as the{' '}
                <span className="text-[#5144E8] dark:text-indigo-400 font-semibold">{selectedNode.role.toLowerCase()}</span> within this architectural pattern. It ensures data consistency and handles request lifecycles before delegating downstream.
              </p>
            </div>
          )}

          {/* Concise "How It Works" Section */}
          {explanation && (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#F0EEFF]/50 dark:bg-indigo-950/20 border border-[#6D5EF7]/20 dark:border-indigo-800/30">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5144E8] dark:text-indigo-300 block mb-1">
                How It Works in Production
              </span>
              <p className="text-sm text-[#17172A] dark:text-slate-200 leading-relaxed">
                {explanation}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Code/Raw Schema Fallback */
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs text-slate-400 font-mono">
            <span>Architecture Diagram Specification</span>
            <button
              onClick={() => setViewMode('visual')}
              className="text-sky-400 hover:text-sky-300 transition-colors"
            >
              Switch back to Visual Mode
            </button>
          </div>
          <pre className="text-xs sm:text-sm font-mono text-sky-300 overflow-x-auto leading-relaxed p-2">
            {diagram || 'No raw schema diagram string provided.'}
          </pre>
        </div>
      )}
    </article>
  );
}
