'use client';

import React, { useState } from 'react';
import { RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';

interface ConceptVisualizerProps {
  visualType?: string;
  conceptTitle?: string;
}

export function ConceptVisualizer({ visualType = 'event-loop' }: ConceptVisualizerProps) {
  const [step, setStep] = useState(0);

  // Render specific interactive diagram based on visualType
  switch (visualType) {
    case 'event-loop':
      return <EventLoopVisualizer step={step} setStep={setStep} />;
    case 'load-balancer':
      return <LoadBalancerVisualizer step={step} setStep={setStep} />;
    case 'b-tree-indexing':
      return <BTreeVisualizer step={step} setStep={setStep} />;
    case 'idempotency-key':
    case 'cache-aside':
      return <CacheIdempotencyVisualizer step={step} setStep={setStep} />;
    case 'rag-pipeline':
      return <RagPipelineVisualizer step={step} setStep={setStep} />;
    case 'closure-scope':
    default:
      return <ClosureScopeVisualizer step={step} setStep={setStep} />;
  }
}

// 1. EVENT LOOP VISUALIZER
function EventLoopVisualizer({ step, setStep }: { step: number; setStep: (s: number | ((prev: number) => number)) => void }) {
  const steps = [
    {
      title: '1. Call Stack Execution',
      desc: 'Synchronous `console.log("1: Sync")` executes immediately on the single-threaded Call Stack and pops off.',
      stack: ['console.log("1: Sync")'],
      microtasks: [],
      macrotasks: [],
      output: ['1: Sync']
    },
    {
      title: '2. Handing Off Asynchronous Work',
      desc: '`setTimeout(..., 0)` hands its timer off to the background C++/libuv runtime; `Promise.resolve()` registers a microtask.',
      stack: ['setTimeout(...)', 'Promise.resolve(...)'],
      microtasks: ['Promise callback'],
      macrotasks: ['setTimeout callback'],
      output: ['1: Sync', '2: Sync']
    },
    {
      title: '3. Microtask Queue Priority Drainage',
      desc: 'Call stack is empty! The Event Loop immediately drains the Microtask Queue BEFORE touching macrotasks.',
      stack: ['Promise Callback'],
      microtasks: ['[DRAINING]'],
      macrotasks: ['setTimeout callback'],
      output: ['1: Sync', '2: Sync', '3: Microtask (Promise)']
    },
    {
      title: '4. Macrotask Execution',
      desc: 'Microtasks are completely empty. The Event Loop now dequeues the first pending Macrotask to the Call Stack.',
      stack: ['setTimeout Callback'],
      microtasks: [],
      macrotasks: [],
      output: ['1: Sync', '2: Sync', '3: Microtask (Promise)', '4: Macrotask (setTimeout)']
    }
  ];

  const current = steps[step];

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Interactive Runtime Visualizer</span>
          <h3 className="text-lg font-bold text-white mt-0.5">{current.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep((s: number) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
            title="Previous step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400 font-medium">Step {step + 1} of {steps.length}</span>
          <button
            onClick={() => setStep((s: number) => Math.min(steps.length - 1, s + 1))}
            disabled={step === steps.length - 1}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
            title="Next step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setStep(0)}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Replay sequence"
          >
            <RotateCcw className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800">
        {current.desc}
      </p>

      {/* SVG Diagram Canvas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Call Stack */}
        <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 flex flex-col items-center">
          <span className="text-xs font-bold text-indigo-400 mb-2 uppercase tracking-wide">Call Stack (Single Thread)</span>
          <div className="w-full flex-1 min-h-[100px] border-2 border-dashed border-indigo-900/60 rounded-lg p-2 flex flex-col justify-end gap-1.5">
            {current.stack.map((item, i) => (
              <div key={i} className="p-2 rounded bg-indigo-600/30 border border-indigo-500 text-xs font-mono text-indigo-200 text-center animate-pulse">
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Queues */}
        <div className="flex flex-col gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide block mb-1">
              Microtask Queue (VIP Priority)
            </span>
            <div className="min-h-[36px] p-1.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 flex items-center justify-center">
              {current.microtasks.length > 0 ? current.microtasks.join(', ') : <span className="text-slate-600">Empty</span>}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide block mb-1">
              Macrotask Queue (Timers & I/O)
            </span>
            <div className="min-h-[36px] p-1.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-amber-300 flex items-center justify-center">
              {current.macrotasks.length > 0 ? current.macrotasks.join(', ') : <span className="text-slate-600">Empty</span>}
            </div>
          </div>
        </div>

        {/* Output Console */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wide">Terminal Output</span>
          <div className="font-mono text-xs text-emerald-400 space-y-1">
            {current.output.map((line, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-slate-600">&gt;</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. LOAD BALANCER VISUALIZER
function LoadBalancerVisualizer({ step, setStep }: { step: number; setStep: (s: number | ((prev: number) => number)) => void }) {
  const steps = [
    { title: '1. Incoming Requests', desc: 'Clients worldwide issue HTTP requests to a single domain IP address (Layer 7 Load Balancer).', targetServer: -1 },
    { title: '2. Health Checks & Metrics', desc: 'The balancer continuously monitors instance health, memory capacity, and active TCP connections.', targetServer: -1 },
    { title: '3. Least-Connections Routing', desc: 'Request #42 is routed to Server B because it has the lowest active connection count (4 conn vs 12 conn).', targetServer: 1 },
    { title: '4. High-Availability Failover', desc: 'If Server A fails its health check, traffic seamlessly re-routes to Server B & C with zero downtime.', targetServer: 2 }
  ];

  const current = steps[step];

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">System Architecture Visualizer</span>
          <h3 className="text-lg font-bold text-white mt-0.5">{current.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep((s: number) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400 font-medium">Step {step + 1} of {steps.length}</span>
          <button
            onClick={() => setStep((s: number) => Math.min(steps.length - 1, s + 1))}
            disabled={step === steps.length - 1}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setStep(0)} className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700">
            <RotateCcw className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800">
        {current.desc}
      </p>

      {/* Visual Topology Diagram */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 p-6 rounded-xl bg-slate-950 border border-slate-800">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-center">
          <span className="text-xs font-bold text-slate-300">10,000+ Clients</span>
          <div className="text-[10px] text-slate-500 mt-1">Incoming Web Traffic</div>
        </div>

        <div className="w-12 h-1 bg-indigo-500/50 hidden sm:block" />

        <div className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-500 text-center shadow-lg shadow-indigo-900/30">
          <span className="text-xs font-bold text-indigo-300 block">Layer 7 Load Balancer</span>
          <span className="text-[10px] text-indigo-400">Least-Connections Algorithm</span>
        </div>

        <div className="w-12 h-1 bg-indigo-500/50 hidden sm:block" />

        <div className="space-y-2 w-full sm:w-48">
          {['Server A (Stateless)', 'Server B (Stateless)', 'Server C (Stateless)'].map((srv, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                current.targetServer === idx
                  ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 shadow-lg shadow-emerald-900/30 font-bold'
                  : 'border-slate-800 bg-slate-900 text-slate-300'
              }`}
            >
              {srv}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 3. B-TREE VISUALIZER
function BTreeVisualizer({ step, setStep }: { step: number; setStep: (s: number | ((prev: number) => number)) => void }) {
  const steps = [
    { title: '1. Sequential Scan Without Index: O(N)', desc: 'Without an index, the database reads all 1,000,000 table pages from disk sequentially. Very slow for point lookups.' },
    { title: '2. B-Tree Root Node Navigation', desc: 'With a B-Tree index, the lookup starts at the Root Node. Value 42 is between [30, 50], traversing the middle branch.' },
    { title: '3. Internal & Leaf Node Lookup: O(log N)', desc: 'Leaf node points directly to the row disk offset (TID). Total lookups: 3 page reads instead of 1,000,000!' },
    { title: '4. Leftmost Prefix Constraint', desc: 'On composite (tenant_id, created_at), queries MUST provide tenant_id to traverse the root nodes.' }
  ];

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Database Indexing Mechanics</span>
          <h3 className="text-lg font-bold text-white mt-0.5">{steps[step].title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep((s: number) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400">Step {step + 1} of {steps.length}</span>
          <button
            onClick={() => setStep((s: number) => Math.min(steps.length - 1, s + 1))}
            disabled={step === steps.length - 1}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setStep(0)} className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700">
            <RotateCcw className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800">
        {steps[step].desc}
      </p>

      <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center gap-4">
        <div className="p-3 rounded-lg bg-indigo-950/70 border border-indigo-500 text-xs font-mono text-indigo-300">
          Root Node [20 | 50 | 80]
        </div>
        <div className="w-32 h-0.5 bg-slate-700" />
        <div className="flex gap-4">
          <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">[1..19]</div>
          <div className="p-2.5 rounded bg-emerald-950 border border-emerald-500 text-xs text-emerald-300 font-mono font-bold animate-pulse">
            Target Leaf [30..49] &rarr; Row #42 Found!
          </div>
          <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">[51..79]</div>
        </div>
      </div>
    </div>
  );
}

// 4. CACHE & IDEMPOTENCY VISUALIZER
function CacheIdempotencyVisualizer({ step, setStep }: { step: number; setStep: (s: number | ((prev: number) => number)) => void }) {
  const steps = [
    { title: '1. Incoming Request with Idempotency-Key', desc: 'Client includes `Idempotency-Key: uuid-8899` header to guard against network timeouts.' },
    { title: '2. In-Memory Key Lookup', desc: 'Server checks cache/Redis for key `idemp:uuid-8899`. If exists, cached response is returned immediately.' },
    { title: '3. Execute Business Mutation Once', desc: 'If key is new, process payment transaction in DB and store result in cache with 24h TTL.' }
  ];

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Network Idempotency Protocol</span>
          <h3 className="text-lg font-bold text-white mt-0.5">{steps[step].title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setStep((s: number) => Math.max(0, s - 1))} disabled={step === 0} className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400">Step {step + 1} of {steps.length}</span>
          <button onClick={() => setStep((s: number) => Math.min(steps.length - 1, s + 1))} disabled={step === steps.length - 1} className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800">{steps[step].desc}</p>
    </div>
  );
}

// 5. RAG PIPELINE VISUALIZER
function RagPipelineVisualizer({ step, setStep }: { step: number; setStep: (s: number | ((prev: number) => number)) => void }) {
  const steps = [
    { title: '1. User Query & Embedding', desc: 'Query is converted into a 1536-dimensional semantic vector embedding.' },
    { title: '2. Vector Cosine Similarity Search', desc: 'Vector database identifies top-K document chunks matching semantic intent.' },
    { title: '3. Grounded Context Generation', desc: 'Retrieved text chunks are injected into LLM prompt constraints, eliminating hallucinations.' }
  ];

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">RAG Semantic Pipeline</span>
          <h3 className="text-lg font-bold text-white mt-0.5">{steps[step].title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setStep((s: number) => Math.max(0, s - 1))} disabled={step === 0} className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400">Step {step + 1} of {steps.length}</span>
          <button onClick={() => setStep((s: number) => Math.min(steps.length - 1, s + 1))} disabled={step === steps.length - 1} className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800">{steps[step].desc}</p>
    </div>
  );
}

// 6. CLOSURE SCOPE VISUALIZER
function ClosureScopeVisualizer({ step, setStep }: { step: number; setStep: (s: number | ((prev: number) => number)) => void }) {
  const currentStep = step % 2;
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Lexical Environment Boundary</span>
        <button
          onClick={() => setStep((prev: number) => (prev + 1) % 2)}
          className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          {currentStep === 0 ? 'Next: Return Function ➔' : 'Reset: Initial Scope ↺'}
        </button>
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
        {currentStep === 0 ? 'Phase 1: Outer Execution Stack' : 'Phase 2: Lexical Scope Backpack'}
      </h3>
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        {currentStep === 0
          ? 'createCounter() allocates count = 0 in its local activation record on the call stack.'
          : 'When createCounter() finishes running and pops off the call stack, the returned inner function retains a live reference binding to let count = 0 inside its closure backpack.'}
      </p>
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-indigo-500/30 font-mono text-xs text-indigo-700 dark:text-indigo-300 text-center">
        {currentStep === 0
          ? 'Stack Frame: [createCounter() -> local: { count: 0 }]'
          : 'Closure Environment: { count: 1, lexicalParent: Global }'}
      </div>
    </div>
  );
}
