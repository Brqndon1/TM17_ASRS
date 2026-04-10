'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { apiFetch } from '@/lib/api/client';

export default function TopBar({ title }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { user, clearUser } = useAuthStore();

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  async function handleLogout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) { /* ignore */ }
    clearUser();
    localStorage.removeItem('user');
    router.push('/login');
  }

  return (
    <div className="topbar">
      {/* Mobile hamburger */}
      <button
        onClick={() => {
          const sidebar = document.querySelector('.sidebar');
          sidebar?.classList.toggle('open');
        }}
        style={{
          display: 'none', background: 'none', border: 'none', cursor: 'pointer',
          padding: 4, color: '#6B7280',
        }}
        className="topbar-hamburger"
      >
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>

      <div className="topbar-title">{title}</div>

      <div className="topbar-search">
        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9CA3AF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input type="text" placeholder="Search initiatives, reports..." />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', cursor: 'pointer', color: '#6B7280', display: 'flex' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </div>

        <div style={{ position: 'relative' }}>
          <div
            className="sidebar-user-avatar"
            style={{ width: 32, height: 32, fontSize: 12, cursor: 'pointer' }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {userInitials}
          </div>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,.1)', minWidth: 160, zIndex: 200,
              padding: '4px 0',
            }}>
              <a href="/profile" style={{ display: 'block', padding: '8px 16px', fontSize: 13, color: '#374151', textDecoration: 'none' }}>Profile</a>
              <div style={{ borderTop: '1px solid #F3F4F6', margin: '4px 0' }} />
              <button onClick={handleLogout} style={{ display: 'block', width: '100%', padding: '8px 16px', fontSize: 13, color: '#EF4444', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>Sign Out</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
