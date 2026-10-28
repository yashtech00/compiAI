'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Check, AlertCircle } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
}

interface CurrentSubscription {
  isPro: boolean;
  subscription: {
    plan: { code: string; name: string };
    status: string;
  } | null;
  entitlements: Record<string, boolean>;
}

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [plansRes, currRes] = await Promise.all([
          apiClient('/subscriptions/plans'),
          apiClient('/subscriptions/current')
        ]);
        if (plansRes?.plans) setPlans(plansRes.plans);
        if (currRes) setCurrent(currRes);
      } catch (err) {
        console.error('Failed to load subscription data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCheckout = async (planCode: string) => {
    setIsCheckingOut(true);
    setCheckoutNotice(null);
    try {
      const res = await apiClient('/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({ planCode })
      });

      if (res?.message) {
        setCheckoutNotice(res.message);
      } else if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    } catch (err: any) {
      setCheckoutNotice(err?.message || 'Checkout unavailable');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
          Loading plan entitlements...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 w-full text-center">
      <Badge variant="purple" className="mb-3">Membership & Plans</Badge>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
        Invest in Structured Mastery
      </h1>
      <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
        Choose the plan that fits your engineering timeline. Accelerate your career preparation with deep AI feedback.
      </p>

      {checkoutNotice && (
        <div className="my-6 p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs max-w-xl mx-auto flex items-start gap-3 text-left">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold block mb-1">Payment Provider Notice:</span>
            <span>{checkoutNotice}</span>
          </div>
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-10 text-left">
        {plans.map((plan) => {
          const isCurrentPlan = current?.subscription?.plan?.code === plan.code;
          const isPro = plan.code === 'PRO';

          return (
            <Card
              key={plan.id}
              className={`p-8 flex flex-col justify-between ${
                isPro
                  ? 'border-indigo-500/50 bg-gradient-to-b from-indigo-950/30 to-slate-900/90 shadow-xl shadow-indigo-950/50 relative'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              {isPro && (
                <div className="absolute -top-3 right-6">
                  <span className="bg-indigo-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                    Recommended
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  {isCurrentPlan && (
                    <Badge variant="success">Current Plan</Badge>
                  )}
                </div>

                <div className="my-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">
                    ${plan.monthlyPrice}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>

                <ul className="space-y-3 my-6">
                  {(Array.isArray(plan.features) ? plan.features : []).map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 border-t border-slate-800">
                {isCurrentPlan ? (
                  <Button variant="outline" disabled className="w-full">
                    Active Plan
                  </Button>
                ) : (
                  <Button
                    variant={isPro ? 'primary' : 'outline'}
                    isLoading={isCheckingOut}
                    onClick={() => handleCheckout(plan.code)}
                    className="w-full"
                  >
                    {isPro ? 'Upgrade to Pro' : 'Select Plan'}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
