'use client';

// Redirect shim — keeps old bookmarks and any hard-coded links working.
// The canonical URL is now /performance/goals.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PerformanceDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/performance/goals');
  }, [router]);
  return null;
}