'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

export default function PageLayout({ title, children, requireAuth = true, requireRole = null }) {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (requireAuth) {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        router.push('/login');
        return;
      }
      if (requireRole) {
        const parsed = JSON.parse(storedUser);
        if (parsed.user_type !== requireRole) {
          router.push('/');
        }
      }
    }
  }, [requireAuth, requireRole, router]);

  if (requireAuth && !user) return null;

  return (
    <div className="page-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title={title} />
        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  );
}
