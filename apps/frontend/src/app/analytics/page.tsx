'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AnalyticsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/progress');
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center p-8 text-slate-500 dark:text-slate-400 text-sm">
      Loading learning progress telemetry...
    </div>
  );
}
