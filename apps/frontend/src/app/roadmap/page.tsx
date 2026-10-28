'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RoadmapRedirect() {
  const router = useRouter();

  useEffect(() => {
    // In Companion.ai, future roadmap remains hidden. Redirect to My Learning.
    router.replace('/my-learning');
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center p-8 text-slate-500 dark:text-slate-400 text-sm">
      Loading your learning records...
    </div>
  );
}
