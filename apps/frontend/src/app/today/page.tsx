'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TodayPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/problem');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background text-muted text-sm">
      Loading workspace...
    </div>
  );
}
