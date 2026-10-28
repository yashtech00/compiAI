'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, isAdmin, signin } = useAuth();

  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('admin12345');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && isAdmin) {
      router.replace('/admin');
    }
  }, [user, isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signin({ email: email.trim(), password });
      router.replace('/admin');
    } catch (err: any) {
      setError(err?.message || 'Invalid administrator credentials. Please check your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] dark:bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle technical background grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(23, 23, 23, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(23, 23, 23, 0.05) 1px, transparent 1px)',
          backgroundSize: '36px 36px'
        }}
        aria-hidden="true"
      />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#315EF7]/10 text-[#315EF7] text-xs font-semibold mb-3 border border-[#315EF7]/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Learning Intelligence & Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] dark:text-white tracking-tight">
            Administrator Portal
          </h1>
          <p className="text-xs sm:text-sm text-[#626262] dark:text-slate-400 mt-1.5">
            Sign in to inspect learner progress, roadmaps, and platform telemetry
          </p>
        </div>

        <Card className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-[#E7E7E7] dark:border-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8E8E8E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E7E7E7] dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-950 text-xs sm:text-sm text-[#171717] dark:text-white placeholder-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#315EF7] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] dark:text-slate-200 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8E8E8E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E7E7E7] dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-950 text-xs sm:text-sm text-[#171717] dark:text-white placeholder-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#315EF7] focus:bg-white transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-[#315EF7] hover:bg-[#244DE0] text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In as Administrator'}
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          {/* Development Bootstrap Credentials Callout */}
          <div className="mt-6 pt-5 border-t border-[#F0F0F0] dark:border-slate-800/80">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F3F6FF] dark:bg-slate-800/60 border border-[#E0E7FF] dark:border-slate-700/60 text-xs text-[#2E4299] dark:text-indigo-300">
              <Sparkles className="w-4 h-4 shrink-0 text-[#315EF7] mt-0.5" />
              <div>
                <span className="font-semibold block">Bootstrap Development Credentials</span>
                <span className="text-[11px] opacity-80 block mt-0.5">
                  Email: <code className="font-mono font-bold">admin@gmail.com</code> | Password: <code className="font-mono font-bold">admin12345</code>
                </span>
              </div>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-[#8E8E8E] mt-6">
          <Link href="/today" className="hover:text-[#171717] dark:hover:text-white underline transition-colors">
            Return to learner experience
          </Link>
        </p>
      </div>
    </div>
  );
}
