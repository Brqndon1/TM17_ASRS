'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth/use-auth-store';

const navGroups = [
  {
    label: 'Main',
    items: [
      { href: '/', label: 'Dashboard', icon: 'home', permission: null },
      { href: '/initiative-creation', label: 'Initiatives', icon: 'briefcase', permission: 'initiatives.view' },
      { href: '/reporting', label: 'Reports', icon: 'bar-chart', permission: 'reporting.view' },
      { href: '/survey', label: 'Surveys', icon: 'clipboard', permission: 'surveys.take' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { href: '/goals', label: 'Goals & Scoring', icon: 'target', permission: 'goals.view' },
      { href: '/performance/goals', label: 'Performance', icon: 'trending-up', permission: 'reporting.view' },
      { href: '/historical-reports', label: 'Historical', icon: 'clock', permission: 'reporting.view' },
    ],
  },
  {
    label: 'Admin',
    requireRole: 'admin',
    items: [
      { href: '/admin/users', label: 'User Management', icon: 'users', permission: 'admin.users' },
      { href: '/admin/audit', label: 'Audit Logs', icon: 'file-text', permission: 'admin.audit' },
      { href: '/admin/budgets', label: 'Budgets', icon: 'dollar-sign', permission: 'admin.budgets' },
    ],
  },
];

const icons = {
  home: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"/></svg>,
  briefcase: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>,
  'bar-chart': <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  clipboard: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>,
  target: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  'trending-up': <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
  clock: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  users: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
  'file-text': <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  'dollar-sign': <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuthStore();

  if (!user) return null;

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const userInitials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/asrs-logo.png" alt="ASRS" />
        <div>
          <div className="sidebar-logo-title">ASRS Initiatives</div>
          <div className="sidebar-logo-sub">Reporting System</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {navGroups.map((group) => {
          if (group.requireRole && user.user_type !== group.requireRole) return null;

          const visibleItems = group.items.filter(
            (item) => !item.permission || hasPermission(item.permission)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                >
                  {icons[item.icon]}
                  {item.label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {userInitials}
        </div>
        <div>
          <div className="sidebar-user-name">{user.name || 'User'}</div>
          <div className="sidebar-user-role">{user.user_type || 'Staff'}</div>
        </div>
      </div>
    </aside>
  );
}
