# ASRS UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current beige top-nav layout with a modern CRM-style UI featuring a white sidebar, orange accents, fluid responsive layout, and full feature coverage of all backend APIs and components.

**Architecture:** Create a shared `PageLayout` wrapper component (sidebar + topbar) that replaces per-page `<Header />` imports. Update CSS custom properties for the new color system. Migrate each page incrementally — one page per task — so the app stays functional throughout. Add missing UI surfaces for features Codex identified (AI Insights, QR Manager, Export/Share panels, Roles & Permissions tab, report builder steps 2-6).

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Recharts, inline SVG charts, existing `apiFetch()` client, existing `useAuthStore()` hook.

**Design Reference:** HTML mockups at `~/.gstack/projects/Brqndon1-TM17_ASRS/designs/homepage-redesign-20260409/`

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `src/components/Sidebar.js` | White sidebar nav with ASRS logo, grouped nav items, user profile |
| `src/components/TopBar.js` | Sticky top bar with page title, search, notifications, avatar |
| `src/components/PageLayout.js` | Wrapper combining Sidebar + TopBar + content area |
| `src/components/AIInsightsPanel.js` | Already exists — will be integrated into reporting mockup |

### Modified Files
| File | Changes |
|------|---------|
| `src/app/globals.css` | New color system, sidebar styles, remove old header styles |
| `src/app/layout.js` | No changes needed (pages control own layout) |
| `src/app/page.js` | Replace Header with PageLayout, new dashboard cards |
| `src/app/login/page.js` | Centered card redesign, no sidebar |
| `src/app/signup/page.js` | Centered card redesign, no sidebar |
| `src/app/verify/page.js` | Centered card redesign, no sidebar |
| `src/app/survey/page.js` | Top-bar-only layout for public, sidebar for staff mode |
| `src/app/reporting/page.js` | PageLayout + reporting dashboard with charts |
| `src/app/historical-reports/page.js` | PageLayout + card grid |
| `src/app/report-creation/page.js` | PageLayout + 6-step wizard |
| `src/app/report-creation/[id]/page.js` | PageLayout + report detail view |
| `src/app/manage-reports/page.js` | PageLayout + report card list |
| `src/app/manage-surveys/page.js` | PageLayout + survey template grid |
| `src/app/initiative-creation/page.js` | PageLayout + initiatives table |
| `src/app/categories/page.js` | PageLayout + category cards |
| `src/app/goals/page.js` | PageLayout + scoring config |
| `src/app/performance/goals/page.js` | PageLayout + goal tracking |
| `src/app/performance/budget/page.js` | PageLayout + budget analysis |
| `src/app/performance-dashboard/page.js` | PageLayout + KPI dashboard |
| `src/app/survey-distribution/page.js` | PageLayout + distribution table |
| `src/app/form-creation/page.js` | PageLayout + form builder |
| `src/app/profile/page.js` | PageLayout + 3-tab profile |
| `src/app/history/reports/page.js` | PageLayout + timeline + comparison |
| `src/app/history/audit-log/page.js` | PageLayout + timeline view |
| `src/app/admin/users/page.js` | PageLayout + users table + roles tab |
| `src/app/admin/audit/page.js` | PageLayout + audit log table |
| `src/app/admin/budgets/page.js` | PageLayout + budget reporting |
| `src/app/admin/conflicts/page.js` | PageLayout + conflict cards |
| `src/app/admin/import/page.js` | PageLayout + import tool |
| `src/components/Header.js` | Keep for backward compat during migration, remove at end |

---

## Task 1: Update CSS Design System

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update CSS custom properties**

Replace the `:root` color variables in `globals.css` with the new design system. Keep all existing utility classes but update their colors.

```css
:root {
  /* New design system */
  --color-bg-primary: #F9FAFB;
  --color-bg-secondary: #FFFFFF;
  --color-bg-tertiary: #F3F4F6;

  --color-asrs-red: #C0392B;
  --color-asrs-orange: #E67E22;
  --color-asrs-orange-hover: #D35400;
  --color-asrs-yellow: #F39C12;
  --color-asrs-dark: #111827;

  --color-text-primary: #111827;
  --color-text-secondary: #6B7280;
  --color-text-light: #9CA3AF;

  --color-border: #E5E7EB;
  --color-border-hover: #D1D5DB;

  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;

  --color-sidebar-bg: #FFFFFF;
  --color-sidebar-active-bg: #FFF7ED;
  --color-sidebar-active-text: #E67E22;

  /* Keep existing chart colors */
  --color-chart-1: #E67E22;
  --color-chart-2: #C0392B;
  --color-chart-3: #F39C12;
  --color-chart-4: #F59E0B;
  --color-chart-5: #EF4444;
}
```

- [ ] **Step 2: Add sidebar and layout CSS classes**

Append these classes to the end of `globals.css` (before any media queries):

```css
/* ===== NEW LAYOUT SYSTEM ===== */
.page-layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg-primary);
}

.sidebar {
  width: 260px;
  min-height: 100vh;
  background: var(--color-sidebar-bg);
  border-right: 1px solid var(--color-border);
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 20px 20px;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-logo img {
  width: 44px;
  height: 44px;
  border-radius: 8px;
}

.sidebar-logo-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.sidebar-logo-sub {
  font-size: 12px;
  color: var(--color-text-light);
  font-weight: 400;
}

.nav-group-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--color-text-light);
  padding: 20px 20px 8px;
}

.sidebar .nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  color: var(--color-text-secondary);
  font-size: 14px;
  text-decoration: none;
  transition: all 150ms ease;
  border-left: 3px solid transparent;
  cursor: pointer;
}

.sidebar .nav-item:hover {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.sidebar .nav-item.active {
  border-left-color: var(--color-asrs-orange);
  background: var(--color-sidebar-active-bg);
  color: var(--color-sidebar-active-text);
  font-weight: 600;
}

.sidebar .nav-item svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.sidebar-user {
  margin-top: auto;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-asrs-orange), var(--color-asrs-red));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  position: relative;
}

.sidebar-user-name {
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 500;
}

.sidebar-user-role {
  color: var(--color-text-secondary);
  font-size: 11px;
}

.main-content {
  margin-left: 260px;
  flex: 1;
  width: calc(100% - 260px);
  min-height: 100vh;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #fff;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  padding: 0 32px;
  height: 64px;
  gap: 24px;
}

.topbar-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.topbar-search {
  flex: 1;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
}

.topbar-search input {
  width: 100%;
  padding: 8px 16px 8px 38px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  outline: none;
  transition: all 150ms ease;
}

.topbar-search input:focus {
  border-color: var(--color-asrs-orange);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(230,126,34,.1);
}

.content-area {
  padding: 32px;
  width: 100%;
}

/* Card system */
.card {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
  border: none;
  background: var(--color-asrs-orange);
  color: #fff;
  box-shadow: 0 1px 3px rgba(230,126,34,.3);
}

.btn-primary:hover {
  background: var(--color-asrs-orange-hover);
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
  background: #fff;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-hover);
}

.btn-outline:hover {
  background: var(--color-bg-primary);
  border-color: var(--color-text-light);
}

/* Status pills */
.pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
}

.pill-green { background: #ECFDF5; color: #059669; }
.pill-yellow { background: #FFFBEB; color: #D97706; }
.pill-red { background: #FEF2F2; color: #DC2626; }
.pill-gray { background: #F3F4F6; color: #6B7280; }
.pill-orange { background: #FFF7ED; color: #EA580C; }
.pill-blue { background: #EFF6FF; color: #2563EB; }

/* Stat cards */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  transition: all 150ms ease;
}

.stat-card:hover { border-color: var(--color-border-hover); }

.stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .8px;
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-top: 8px;
  line-height: 1;
}

/* Tables */
.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .8px;
  color: var(--color-text-secondary);
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.data-table tbody td {
  padding: 14px 16px;
  font-size: 13px;
  color: #374151;
  border-bottom: 1px solid #F3F4F6;
}

.data-table tbody tr {
  transition: background 150ms ease;
}

.data-table tbody tr:hover {
  background: var(--color-bg-primary);
}

/* Responsive sidebar */
@media (max-width: 1024px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 300ms ease;
    z-index: 200;
    box-shadow: 4px 0 24px rgba(0,0,0,.15);
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
    width: 100%;
  }

  .topbar {
    padding: 0 16px;
  }

  .content-area {
    padding: 16px;
  }
}
```

- [ ] **Step 3: Run the dev server and verify styles load**

Run: `cd /Users/ivanchen/Projects/TM17_ASRS && npm run dev`
Expected: Dev server starts, no CSS errors, existing pages still work (old styles not removed yet)

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add new design system CSS variables and layout classes"
```

---

## Task 2: Create Sidebar Component

**Files:**
- Create: `src/components/Sidebar.js`

- [ ] **Step 1: Create the Sidebar component**

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.js
git commit -m "feat: add Sidebar navigation component"
```

---

## Task 3: Create TopBar Component

**Files:**
- Create: `src/components/TopBar.js`

- [ ] **Step 1: Create the TopBar component**

```jsx
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
```

- [ ] **Step 2: Add CSS for mobile hamburger**

Append to `globals.css` inside the `@media (max-width: 1024px)` block:

```css
.topbar-hamburger {
  display: flex !important;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/TopBar.js src/app/globals.css
git commit -m "feat: add TopBar component with search, notifications, user menu"
```

---

## Task 4: Create PageLayout Wrapper

**Files:**
- Create: `src/components/PageLayout.js`

- [ ] **Step 1: Create the PageLayout wrapper**

```jsx
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
```

- [ ] **Step 2: Verify the component renders**

Temporarily modify `src/app/page.js` to test:
- Add `import PageLayout from '@/components/PageLayout';`
- Wrap content in `<PageLayout title="Dashboard">...</PageLayout>`
- Check browser — sidebar and topbar should render

- [ ] **Step 3: Revert the test change and commit**

```bash
git add src/components/PageLayout.js
git commit -m "feat: add PageLayout wrapper component (sidebar + topbar + content)"
```

---

## Task 5: Migrate Dashboard (Home Page)

**Files:**
- Modify: `src/app/page.js`

- [ ] **Step 1: Read the current page.js**

Read: `src/app/page.js` (all ~433 lines). Understand the current structure: auth check, navigation cards grouped by section, initiative selector.

- [ ] **Step 2: Rewrite with PageLayout**

Replace the current layout structure. Keep all existing functionality (auth check, role detection, card navigation) but:
- Replace `<Header />` with `<PageLayout title="Dashboard">`
- Remove the old beige background and header hero banner
- Add stat cards row (fetch counts from APIs: initiatives, surveys, reports)
- Keep the navigation card groups but restyle with new card classes
- Use the design reference from `variant-D.html`

Key changes:
- Remove `import Header from '@/components/Header'`
- Add `import PageLayout from '@/components/PageLayout'`
- Wrap return in `<PageLayout title="Dashboard">`
- Replace inline background styles with `className="content-area"`
- Add stats row with `className="stats-row"` and `className="stat-card"`
- Restyle navigation cards with `className="card"` + hover transitions

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Navigate to `http://localhost:3000`
Expected: New sidebar + topbar + dashboard with stat cards and navigation cards

- [ ] **Step 4: Commit**

```bash
git add src/app/page.js
git commit -m "feat: migrate dashboard to new sidebar layout"
```

---

## Task 6: Migrate Auth Pages (Login, Signup, Verify)

**Files:**
- Modify: `src/app/login/page.js`
- Modify: `src/app/signup/page.js`
- Modify: `src/app/verify/page.js`

These pages do NOT use PageLayout (no sidebar). They get the centered card treatment.

- [ ] **Step 1: Read and update login page**

Restyle `src/app/login/page.js`:
- Keep all auth logic unchanged
- Update background to `#F9FAFB`
- Center a card (max-width 420px) with ASRS logo, email/password fields
- Orange submit button
- Update input focus styles to orange ring
- Reference: `pages/login.html` mockup

- [ ] **Step 2: Read and update signup page**

Same treatment for `src/app/signup/page.js` — centered card, 4 fields, orange button.

- [ ] **Step 3: Read and update verify page**

Same treatment for `src/app/verify/page.js` — centered card with verification code inputs.

- [ ] **Step 4: Verify all 3 pages in browser**

Navigate to `/login`, `/signup`, `/verify` — each should show centered card on light gray bg.

- [ ] **Step 5: Commit**

```bash
git add src/app/login/page.js src/app/signup/page.js src/app/verify/page.js
git commit -m "feat: redesign auth pages with centered card layout"
```

---

## Task 7: Migrate Reporting Page

**Files:**
- Modify: `src/app/reporting/page.js`

This is the most complex page. It includes: initiative selector, download toolbar, stat cards, charts (ChartDisplay), data table (DataTable), filters (FilterPanel), sorting (SortPanel), export (ExportPanel), share (SharePanel), AI insights (AIInsightsPanel), and trend display (TrendDisplay).

- [ ] **Step 1: Read the full reporting page**

Read: `src/app/reporting/page.js` (likely 800+ lines). Map every feature and component usage.

- [ ] **Step 2: Rewrite with PageLayout**

Replace `<Header />` with `<PageLayout title="Reports">`. Keep ALL existing features:
- Initiative selector and tab bar at top
- Download/export toolbar (PDF Content, Both, PDF Layout, Side-by-side, PDF, CSV, XLSX, HTML, Create Shareable Link, Share)
- Stats row with `className="stats-row"`
- Charts/Table toggle with Recharts integration
- FilterPanel, SortPanel integration
- ExportPanel, SharePanel integration
- AIInsightsPanel at bottom
- TrendDisplay for trend analysis
- DataTable with all columns

Restyle with new CSS classes. Keep all `apiFetch` calls and state management unchanged.

- [ ] **Step 3: Verify in browser**

Navigate to `/reporting`, select an initiative, verify:
- Charts render
- Filters work
- Export panel opens
- AI Insights button works
- Table data displays

- [ ] **Step 4: Commit**

```bash
git add src/app/reporting/page.js
git commit -m "feat: migrate reporting page to new layout with all features"
```

---

## Task 8: Migrate Initiative Creation Page

**Files:**
- Modify: `src/app/initiative-creation/page.js`

- [ ] **Step 1: Read and rewrite with PageLayout**

Replace Header with PageLayout. Keep:
- Initiative CRUD (create, edit, archive)
- ReasonModal for confirmations
- Initiative table with status pills
- Category selector
- All apiFetch calls

Restyle with new table classes, card containers, and orange buttons.

- [ ] **Step 2: Verify and commit**

```bash
git add src/app/initiative-creation/page.js
git commit -m "feat: migrate initiative creation page to new layout"
```

---

## Task 9: Migrate Goals & Scoring Page

**Files:**
- Modify: `src/app/goals/page.js`

- [ ] **Step 1: Read and rewrite with PageLayout**

Replace Header with PageLayout. Keep:
- Initiative selector
- Scoring criteria table with weights
- Goal CRUD operations
- Conflict detection
- All apiFetch calls to /api/goals

Restyle with new card/table classes.

- [ ] **Step 2: Verify and commit**

```bash
git add src/app/goals/page.js
git commit -m "feat: migrate goals & scoring page to new layout"
```

---

## Task 10: Migrate Performance Pages

**Files:**
- Modify: `src/app/performance/goals/page.js`
- Modify: `src/app/performance/budget/page.js`
- Modify: `src/app/performance-dashboard/page.js`

- [ ] **Step 1: Read and rewrite performance/goals with PageLayout**

Keep: goal tracking, progress charts, goal-history line chart from /api/goals/history, expandable weighted breakdowns.

- [ ] **Step 2: Read and rewrite performance/budget with PageLayout**

Keep: budget utilization stats, drill-down detail, allocation change history from /api/performance/budget.

- [ ] **Step 3: Read and rewrite performance-dashboard with PageLayout**

This page redirects to /performance/goals — keep the redirect logic, just update the wrapper.

- [ ] **Step 4: Verify all 3 and commit**

```bash
git add src/app/performance/goals/page.js src/app/performance/budget/page.js src/app/performance-dashboard/page.js
git commit -m "feat: migrate performance pages to new layout"
```

---

## Task 11: Migrate Survey Pages

**Files:**
- Modify: `src/app/survey/page.js`
- Modify: `src/app/survey-distribution/page.js`
- Modify: `src/app/manage-surveys/page.js`

- [ ] **Step 1: Read and rewrite survey page**

This has dual mode (public + staff). For public: simple top bar with logo, no sidebar. For staff: PageLayout with full sidebar.
Keep: SurveyForm component, QRCodeManager, template management, initiative selector.

- [ ] **Step 2: Read and rewrite survey-distribution**

Keep: distribution CRUD via /api/surveys/distributions, email chip entry, QR code generation, status tracking.

- [ ] **Step 3: Read and rewrite manage-surveys**

Keep: template CRUD via /api/surveys/templates, preview, duplicate, status management.

- [ ] **Step 4: Verify all 3 and commit**

```bash
git add src/app/survey/page.js src/app/survey-distribution/page.js src/app/manage-surveys/page.js
git commit -m "feat: migrate survey pages to new layout"
```

---

## Task 12: Migrate Report Management Pages

**Files:**
- Modify: `src/app/report-creation/page.js`
- Modify: `src/app/report-creation/[id]/page.js`
- Modify: `src/app/manage-reports/page.js`
- Modify: `src/app/historical-reports/page.js`

- [ ] **Step 1: Read and rewrite report-creation**

Keep ALL 6 steps: StepConfig (with Include AI Analysis toggle), StepFilters, StepExpressions (AND/OR boolean), StepSorting, StepTrends (variable selection, thresholds), StepPreview (metrics, chart/table toggle, explainability). Keep StepIndicator.

- [ ] **Step 2: Read and rewrite report-creation/[id]**

Keep: report detail view, edit mode, ReportDashboard integration.

- [ ] **Step 3: Read and rewrite manage-reports**

Keep: report CRUD, ReasonModal for delete confirmation, status management, reorder via /api/reports/reorder.

- [ ] **Step 4: Read and rewrite historical-reports**

Keep: date/initiative filtering, side-by-side report comparison, CSV export of historical snapshots.

- [ ] **Step 5: Verify all and commit**

```bash
git add src/app/report-creation/page.js "src/app/report-creation/[id]/page.js" src/app/manage-reports/page.js src/app/historical-reports/page.js
git commit -m "feat: migrate report management pages to new layout"
```

---

## Task 13: Migrate History Pages

**Files:**
- Modify: `src/app/history/reports/page.js`
- Modify: `src/app/history/audit-log/page.js`

- [ ] **Step 1: Read and rewrite history/reports**

Keep: date/initiative filtering, report comparison mode (select 2 + compare side-by-side), CSV export, grouped-by-month display.

- [ ] **Step 2: Read and rewrite history/audit-log**

Keep: diff-style payload rendering, pagination, expandable rows, date/user/action filtering.

- [ ] **Step 3: Verify and commit**

```bash
git add src/app/history/reports/page.js src/app/history/audit-log/page.js
git commit -m "feat: migrate history pages to new layout"
```

---

## Task 14: Migrate Admin Pages

**Files:**
- Modify: `src/app/admin/users/page.js`
- Modify: `src/app/admin/audit/page.js`
- Modify: `src/app/admin/budgets/page.js`
- Modify: `src/app/admin/conflicts/page.js`
- Modify: `src/app/admin/import/page.js`

- [ ] **Step 1: Read and rewrite admin/users**

Keep BOTH tabs: Users table (CRUD, role assignment, ReasonModal) AND Roles & Permissions (role CRUD via /api/admin/roles, permission editing). This is the one Codex flagged — make sure the Roles tab is not lost.

- [ ] **Step 2: Read and rewrite admin/audit**

Keep: CSV export, raw payload modal, filter bar, all columns.

- [ ] **Step 3: Read and rewrite admin/budgets**

Keep: fiscal year selector, budget CRUD via /api/admin/budgets, utilization visualization.

- [ ] **Step 4: Read and rewrite admin/conflicts**

Keep: conflict resolution UI with Version A/B comparison, accept/merge/dismiss via /api/admin/goal-conflicts, ReasonModal.

- [ ] **Step 5: Read and rewrite admin/import**

Keep: file upload, column mapping, import history via /api/admin/import, field management via /api/admin/fields.

- [ ] **Step 6: Verify all 5 and commit**

```bash
git add src/app/admin/users/page.js src/app/admin/audit/page.js src/app/admin/budgets/page.js src/app/admin/conflicts/page.js src/app/admin/import/page.js
git commit -m "feat: migrate admin pages to new layout with roles & permissions tab"
```

---

## Task 15: Migrate Remaining Pages

**Files:**
- Modify: `src/app/categories/page.js`
- Modify: `src/app/form-creation/page.js`
- Modify: `src/app/profile/page.js`

- [ ] **Step 1: Read and rewrite categories**

Keep: category CRUD via /api/categories, linked-initiative visibility and unlink via /api/initiative-categories.

- [ ] **Step 2: Read and rewrite form-creation**

Keep: form builder with question types, admin field management via /api/admin/fields. Ensure the field catalog integration is not lost.

- [ ] **Step 3: Read and rewrite profile**

Keep all 3 tabs: view profile, edit profile (including picture/password), delete account. Keep /api/user/profile integration.

- [ ] **Step 4: Verify and commit**

```bash
git add src/app/categories/page.js src/app/form-creation/page.js src/app/profile/page.js
git commit -m "feat: migrate categories, form creation, and profile pages to new layout"
```

---

## Task 16: Remove Old Header and Clean Up

**Files:**
- Modify: `src/components/Header.js`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Verify no pages import Header**

```bash
grep -r "import Header" src/app/ --include="*.js"
```

Expected: No results (all pages now use PageLayout).

- [ ] **Step 2: Check if any component imports Header**

```bash
grep -r "import Header" src/components/ --include="*.js"
```

If Header is still imported somewhere, migrate that usage first.

- [ ] **Step 3: Remove old Header-specific CSS from globals.css**

Remove the old `.header-*`, `.header-hamburger`, and old navigation dropdown styles that are no longer used. Keep any CSS that might be shared.

- [ ] **Step 4: Mark Header.js as deprecated**

Add a comment at the top of Header.js:
```javascript
// DEPRECATED: This component is replaced by Sidebar.js + TopBar.js + PageLayout.js
// Keeping for reference during migration. Remove after all pages are migrated.
```

Or delete it entirely if grep confirms zero imports.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old Header component and clean up deprecated CSS"
```

---

## Task 17: Full Integration Test

- [ ] **Step 1: Run existing test suite**

```bash
cd /Users/ivanchen/Projects/TM17_ASRS && npm test
```

Expected: All API tests pass (UI changes should not affect API routes).

- [ ] **Step 2: Manual QA — verify every page**

Navigate to each page and verify:
1. `/` — Dashboard loads with sidebar, stat cards, navigation cards
2. `/login` — Centered card, no sidebar
3. `/signup` — Centered card, no sidebar
4. `/verify` — Centered card, no sidebar
5. `/survey` — Public mode works, staff mode shows sidebar
6. `/initiative-creation` — Table, create form, ReasonModal
7. `/categories` — Category cards, linked initiatives
8. `/reporting` — Full dashboard with charts, filters, export, AI insights, share
9. `/historical-reports` — Card grid, filters, comparison mode
10. `/report-creation` — All 6 steps of wizard work
11. `/manage-reports` — Report list, actions, ReasonModal
12. `/manage-surveys` — Template grid, actions
13. `/goals` — Scoring table, CRUD
14. `/performance/goals` — Goal tracking, progress rings
15. `/performance/budget` — Budget stats, charts
16. `/survey-distribution` — Distribution table, QR generation
17. `/form-creation` — Form builder, field management
18. `/profile` — 3-tab view/edit/delete
19. `/history/reports` — Timeline, comparison
20. `/history/audit-log` — Timeline, expandable rows
21. `/admin/users` — Users tab + Roles & Permissions tab
22. `/admin/audit` — Log table, CSV export
23. `/admin/budgets` — Budget reporting
24. `/admin/conflicts` — Conflict cards, resolution
25. `/admin/import` — Upload, mapping, history

- [ ] **Step 3: Test responsive**

Resize browser to 1024px width — sidebar should collapse. Test hamburger menu toggle.
Resize to 768px — content should stack, tables should adapt.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "test: verify full UI redesign integration"
```
