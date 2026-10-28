'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Repeat, ArrowRight, CheckCircle2 } from 'lucide-react';

interface DueItem {
  id: string;
  conceptId: string;
  intervalDays: number;
  scheduledAt: string;
  concept: {
    id: string;
    name: string;
    description: string;
    skill: { name: string };
    lessons?: Array<{ slug: string }>;
  };
}

export default function RecallPage() {
  const [dueItems, setDueItems] = useState<DueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  async function loadDueItems() {
    try {
      const data = await apiClient('/recall/due');
      if (data?.dueItems) {
        setDueItems(data.dueItems);
      }
    } catch (err) {
      console.error('Failed to load recall queue:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDueItems();
  }, []);

  const handleRate = async (rating: number) => {
    if (dueItems.length === 0) return;
    const current = dueItems[currentIndex];
    setIsSubmitting(true);

    try {
      await apiClient('/recall/submit', {
        method: 'POST',
        body: JSON.stringify({
          conceptId: current.conceptId,
          rating,
          recalled: rating >= 3
        })
      });

      setShowAnswer(false);
      setCompletedCount(prev => prev + 1);

      if (currentIndex < dueItems.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Queue finished
        setDueItems([]);
      }
    } catch (err) {
      console.error('Failed to submit recall rating:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
          Loading your active recall queue...
        </div>
      </div>
    );
  }

  if (dueItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-xl mx-auto w-full text-center">
        <Card className="w-full p-8 bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500 dark:text-emerald-400 mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {completedCount > 0 ? 'Review Complete!' : 'Recall Queue Clear!'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            {completedCount > 0
              ? `You reviewed ${completedCount} concept${completedCount > 1 ? 's' : ''} today. Next intervals have been updated in your learner model.`
              : 'You have no pending spaced repetition reviews right now. Knowledge retention is currently optimized.'}
          </p>
          <Link href="/today">
            <Button size="md" className="gap-2">
              Back to Today&apos;s Learning
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const current = dueItems[currentIndex];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 w-full flex-1 flex flex-col justify-center">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4">
        <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
          <Repeat className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
          Spaced Recall {currentIndex + 1} of {dueItems.length}
        </span>
        <span>Interval: {current.intervalDays} days</span>
      </div>

      <Card className="p-8 bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-sm text-center">
        <Badge variant="purple" className="mb-3">
          {current.concept.skill.name}
        </Badge>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          {current.concept.name}
        </h2>

        {!showAnswer ? (
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
              Recall the core principles, architecture tradeoffs, and implementation patterns of this concept before revealing the summary.
            </p>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowAnswer(true)}
              className="w-full max-w-xs mx-auto"
            >
              Reveal Concept Summary
            </Button>
          </div>
        ) : (
          <div className="text-left mt-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-300 leading-relaxed mb-8">
              {current.concept.description}
            </div>

            <div className="text-center mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                How accurately did you recall this concept?
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[
                { rating: 1, label: 'Blackout' },
                { rating: 2, label: 'Struggled' },
                { rating: 3, label: 'Effort' },
                { rating: 4, label: 'Good' },
                { rating: 5, label: 'Perfect' }
              ].map(({ rating, label }) => (
                <button
                  key={rating}
                  disabled={isSubmitting}
                  onClick={() => handleRate(rating)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    rating >= 4
                      ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : rating === 3
                      ? 'border-indigo-300 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <div className="text-base font-bold">{rating}</div>
                  <div className="text-[10px] opacity-80">{label}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
