'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowRight, AlertCircle } from 'lucide-react';

export default function SigninPage() {
  const router = useRouter();
  const { user, isAdmin, signin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      if (isAdmin || user.role === 'ADMIN') {
        router.replace('/admin');
      } else {
        router.replace('/today');
      }
    }
  }, [user, isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide your email and password.');
      return;
    }

    try {
      setIsLoading(true);
      const authenticatedUser = await signin({ email: email.trim(), password });
      if (authenticatedUser?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/problem');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8 sm:p-10 bg-white border border-[#d9d9d2] shadow-sm rounded-3xl">
        <div className="text-center mb-8">
          <div className="w-11 h-11 rounded-2xl bg-[#111111] flex items-center justify-center mx-auto text-[#d8ff19] shadow-sm mb-3.5">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs sm:text-sm text-[#686860] mt-1 font-medium">
            Pick up your personal learning journey where you left off
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-[#C74747] text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#C74747]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F8F4] border border-[#d9d9d2] text-[#111111] placeholder-[#686860]/60 text-sm focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F8F4] border border-[#d9d9d2] text-[#111111] placeholder-[#686860]/60 text-sm focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-colors"
            />
          </div>

          <Button type="submit" isLoading={isLoading} className="w-full mt-6 gap-2 bg-[#111111] hover:bg-black text-[#d8ff19] font-bold shadow-sm">
            Sign In
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#d9d9d2] text-center text-xs text-[#686860]">
          Don&apos;t have an account yet?{' '}
          <Link href="/signup" className="text-[#15803d] hover:underline font-bold">
            Create an account
          </Link>
        </div>
      </Card>
    </div>
  );
}
