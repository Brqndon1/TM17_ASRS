'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect from the old /historical-reports path to the new /history/reports path.
 * This keeps any bookmarks or shared links working.
 */
export default function HistoricalReportsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/history/reports');
  }, [router]);

  return null;
}
