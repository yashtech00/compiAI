'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
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
    skill?: { name: string } | null;
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
      <DashboardShell title="Spaced Recall">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-[#686860]">
            <div className="animate-spin w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full mx-auto mb-3" />
            Loading your active recall queue...
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (dueItems.length === 0) {
    return (
      <DashboardShell title="Spaced Recall">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-xl mx-auto w-full text-center">
          <div className="w-full p-8 sm:p-10 rounded-[28px] bg-white border border-[#d9d9d2] shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#d8ff19]/25 border border-[#111111]/20 flex items-center justify-center mx-auto text-[#111111] mb-4">
              <CheckCircle2 className="w-7 h-7 text-[#15803d]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#111111] mb-2 tracking-tight">
              {completedCount > 0 ? 'Review Complete!' : 'Recall Queue Clear!'}
            </h1>
            <p className="text-xs sm:text-sm text-[#686860] mb-6 leading-relaxed">
              {completedCount > 0
                ? `You reviewed ${completedCount} concept${completedCount > 1 ? 's' : ''} today. Next intervals have been updated in your adaptive retention model.`
                : 'You have no pending spaced repetition reviews right now. Your retention is currently in optimal health.'}
            </p>
            <Link href="/today">
              <button className="px-6 py-2.5 rounded-full bg-[#111111] hover:bg-black text-[#d8ff19] text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2">
                <span>Back to Overview</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const current = dueItems[currentIndex];

  return (
    <DashboardShell title="Spaced Recall">
      <div className="max-w-2xl mx-auto px-2 py-4 sm:py-6 w-full flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between text-xs text-[#686860] mb-3">
          <span className="flex items-center gap-1.5 font-bold text-[#111111]">
            <Repeat className="w-3.5 h-3.5 text-[#111111]" />
            Spaced Recall {currentIndex + 1} of {dueItems.length}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#d8ff19]/30 text-[#111111] text-[11px] font-bold border border-[#111111]/20">
            Interval: {current.intervalDays} days
          </span>
        </div>

        <div className="p-6 sm:p-8 rounded-[28px] bg-white border border-[#d9d9d2] shadow-sm text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-[#111111] text-[#d8ff19] text-xs font-bold mb-3">
            {current.concept.skill?.name || 'Milestone'}
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-[#111111] mb-3 tracking-tight">
            {current.concept.name}
          </h2>

          {!showAnswer ? (
            <div>
              <p className="text-xs sm:text-sm text-[#686860] mb-6 max-w-md mx-auto leading-relaxed">
                Recall the core principles, trade-offs, and implementation patterns of this concept before revealing the summary.
              </p>
              <button
                onClick={() => setShowAnswer(true)}
                className="px-6 py-2.5 rounded-full bg-[#111111] hover:bg-black text-[#d8ff19] text-xs font-bold shadow-sm hover:scale-105 active:scale-95 transition-all"
              >
                Reveal Concept Summary
              </button>
            </div>
          ) : (
            <div className="text-left mt-3">
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F8F4] border border-[#d9d9d2] text-xs sm:text-sm text-[#111111] leading-relaxed mb-6 font-medium">
                {current.concept.description}
              </div>

              <div className="text-center mb-3">
                <span className="text-[11px] font-bold text-[#686860] uppercase tracking-wider">
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
                    className={`p-2.5 sm:p-3 rounded-xl border text-center transition-all ${
                      rating >= 4
                        ? 'border-[#111111] bg-[#d8ff19] text-[#111111] font-bold hover:brightness-95 shadow-sm'
                        : rating === 3
                        ? 'border-[#d9d9d2] bg-[#F1F1EC] text-[#111111] font-semibold hover:bg-[#d8ff19]/30'
                        : 'border-[#d9d9d2] bg-white text-[#686860] hover:text-[#111111] hover:border-[#111111]'
                    }`}
                  >
                    <div className="text-sm sm:text-base font-bold">{rating}</div>
                    <div className="text-[9px] uppercase tracking-wider">{label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
