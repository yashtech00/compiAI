'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SubscriptionPage() {
  const router = useRouter();

  useEffect(() => {
    // Hide subscription plan from learner side and redirect to main track
    router.replace('/problem');
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#111111] dark:border-[#d8ff19] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
