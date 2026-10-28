'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Sparkles, ArrowRight, Compass, Brain, Repeat, Zap } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Hero Section */}
      <section className="w-full max-w-6xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>The Anti-Course Learning Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl leading-[1.15]">
          Tell me what you want to become.{' '}
          <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 dark:from-indigo-400 dark:via-sky-300 dark:to-emerald-400 bg-clip-text text-transparent">
            I’ll decide what you learn today.
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
          Traditional platforms dump 50-hour courses on you. We continuously diagnose your software engineering skill gaps, sequence prerequisites, and deliver focused 10–15 minute daily sessions.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          {user ? (
            <Link href="/today">
              <Button size="lg" className="w-full sm:w-auto text-base gap-2">
                Continue Today&apos;s Learning
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto text-base gap-2">
                  Take Diagnostic Assessment
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/signin">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base">
                  Sign in
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Value Metrics */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl text-left">
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">10–15 min</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Daily microlearning session</div>
          </div>
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">13+ Skills</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">From Node & SQL to System Design</div>
          </div>
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Deterministic</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Topological prerequisite graph</div>
          </div>
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">Spaced Recall</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Fights the forgetting curve</div>
          </div>
        </div>
      </section>

      {/* Core Loop Architecture Section */}
      <section className="w-full bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800/80 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              The Continuous Learner Loop
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-2 max-w-xl mx-auto">
              How our learning engine keeps you moving toward your dream engineering role without burnout.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card hoverEffect className="flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 mb-4">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                1. Graph-Driven Roadmap
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Concepts are mapped with strict prerequisites. We never let you get confused by Redis Streams before you understand Cache Invalidation and Key-Value TTLs.
              </p>
            </Card>

            <Card hoverEffect className="flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-4">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                2. Socratic AI & Explain-Back
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Instead of spoon-feeding answers, our AI tutor guides your thinking. Explain concepts in your own words to prove deep conceptual understanding.
              </p>
            </Card>

            <Card hoverEffect className="flex flex-col">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400 mb-4">
                <Repeat className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                3. Adaptive Spaced Repetition
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Every quiz result schedules future micro-recalls. If you struggle with B-Tree indexes, they reappear automatically before knowledge decays.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Target Engineering Roles */}
      <section className="w-full max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <Badge variant="purple" className="mb-3">Engineering Tracks</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Curated Tracks for Real Production Roles
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              role: 'Backend Developer',
              skills: ['Node.js', 'PostgreSQL', 'Redis', 'REST APIs', 'System Design'],
              desc: 'Architect resilient APIs, optimize relational queries, and design scalable caching pipelines.'
            },
            {
              role: 'Full Stack Developer',
              skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
              desc: 'Build cohesive full-stack web products with modern UI components and robust server logic.'
            },
            {
              role: 'AI Engineer',
              skills: ['Prompt Engineering', 'Vector Search', 'RAG Pipelines', 'APIs'],
              desc: 'Integrate LLMs, implement semantic document search, and build production AI workflows.'
            }
          ].map((track, i) => (
            <Card key={i} className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{track.role}</h3>
                  <Zap className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{track.desc}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                {track.skills.map((s, idx) => (
                  <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full max-w-4xl mx-auto px-4 py-14 text-center">
        <div className="bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950/40 dark:to-slate-900/60 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-8 sm:p-12 shadow-sm">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Ready to stop wandering through random tutorials?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-3 max-w-lg mx-auto">
            Take the 5-minute diagnostic assessment to map your current software engineering knowledge.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Start Free Today
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
