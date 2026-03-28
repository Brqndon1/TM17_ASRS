'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useAuthStore } from '@/lib/auth/use-auth-store';

/* -----------------------------------------------------------------------
 * SVG icon components — lightweight, no extra dependencies
 * ----------------------------------------------------------------------- */
function IconSurvey() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}
function IconInitiative() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V8.25a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}
function IconReporting() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
function IconGoals() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}
function IconLogin() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}
function IconDistribute() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}
function IconPerformance() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function IconAudit() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

const ICON_MAP = {
  '/survey': IconSurvey,
  '/initiative-creation': IconInitiative,
  '/reporting': IconReporting,
  '/historical-reports': IconReporting,
  '/goals': IconGoals,
  '/login': IconLogin,
  '/survey-distribution': IconDistribute,
  '/performance-dashboard': IconPerformance,
  '/admin/users': IconUsers,
  '/admin/audit': IconAudit,
};

/* -----------------------------------------------------------------------
 * Route definitions — one entry per card, no duplicates
 * ----------------------------------------------------------------------- */
const routes = [
  {
    href: '/survey',
    label: 'Take a Survey',
    description: 'Fill out and submit initiative surveys.',
    section: 'public',
  },
  {
    href: '/login',
    label: 'Sign In',
    description: 'Log in to access staff and admin tools.',
    section: 'public',
    showOnlyWhenLoggedOut: true,
  },
  {
    href: '/initiative-creation',
    label: 'Initiatives',
    description: 'Create, configure, and manage ASRS initiatives.',
    section: 'staff',
    requiresAuth: true,
  },
  {
    href: '/reporting',
    label: 'Reporting',
    description: 'View published reports and dashboards.',
    section: 'staff',
    requiresAuth: true,
  },
  {
    href: '/historical-reports',
    label: 'Historical Reports',
    description: 'Browse, filter, and compare past reports.',
    section: 'staff',
    requiresAuth: true,
  },
  {
    href: '/survey-distribution',
    label: 'Distribute Surveys',
    description: 'Send surveys to participants and track distribution.',
    section: 'staff',
    requiresAuth: true,
  },
  {
    href: '/goals',
    label: 'Goals & Scoring',
    description: 'Set target metrics and scoring criteria for initiatives.',
    section: 'staff',
    requiresAuth: true,
  },
  {
    href: '/performance-dashboard',
    label: 'Performance',
    description: 'Monitor initiative outcomes and key performance indicators.',
    section: 'staff',
    requiresAuth: true,
  },
  {
    href: '/admin/users',
    label: 'User Management',
    description: 'Manage staff accounts, roles, and permissions.',
    section: 'admin',
    requiresAuth: true,
    adminOnly: true,
  },
  {
    href: '/admin/audit',
    label: 'Audit Logs',
    description: 'View system audit trails and export change history.',
    section: 'admin',
    requiresAuth: true,
    adminOnly: true,
  },
];

/* -----------------------------------------------------------------------
 * Section metadata
 * ----------------------------------------------------------------------- */
const SECTIONS = {
  public: { title: 'Get Started', subtitle: 'Available to everyone' },
  staff: { title: 'Staff Tools', subtitle: 'For ASRS staff members' },
  admin: { title: 'Administration', subtitle: 'Admin-only features' },
};

/* -----------------------------------------------------------------------
 * NavigationCard component
 * ----------------------------------------------------------------------- */
function NavigationCard({ href, label, description, isSurvey, initiatives, selectedInitiative, setSelectedInitiative, router }) {
  const Icon = ICON_MAP[href];

  const inner = (
    <div className={`
      group relative flex flex-col h-full
      bg-white rounded-lg border border-[var(--color-bg-tertiary)]
      px-3.5 py-3 transition-all duration-200 ease-out
      ${isSurvey ? '' : 'hover:shadow-md hover:-translate-y-0.5 hover:border-[var(--color-asrs-orange)] cursor-pointer'}
    `}>
      {/* Accent top bar */}
      <div className={`
        absolute top-0 left-3 right-3 h-[2px] rounded-b-full
        bg-gradient-to-r from-[var(--color-asrs-red)] to-[var(--color-asrs-orange)]
        opacity-0 transition-opacity duration-200
        ${isSurvey ? '' : 'group-hover:opacity-100'}
      `} />

      {/* Icon + Title row */}
      <div className="flex items-start gap-2.5">
        {Icon && (
          <div className={`
            flex-shrink-0 p-1.5 rounded-md mt-0.5
            bg-[var(--color-bg-secondary)]
            text-[var(--color-asrs-dark)]
            transition-colors duration-200
            ${isSurvey ? '' : 'group-hover:bg-gradient-to-br group-hover:from-[var(--color-asrs-red)] group-hover:to-[var(--color-asrs-orange)] group-hover:text-white'}
          `}>
            <Icon />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] leading-snug">
              {label}
            </h3>
            {!isSurvey && (
              <svg className="w-3.5 h-3.5 flex-shrink-0 ml-1 text-[var(--color-text-light)] group-hover:text-[var(--color-asrs-orange)] transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-snug">
            {description}
          </p>
        </div>
      </div>

      {/* Survey-specific: initiative picker */}
      {isSurvey && (
        <div className="mt-2.5 pt-2.5 border-t border-[var(--color-bg-tertiary)]">
          <select
            value={selectedInitiative}
            onChange={(e) => setSelectedInitiative(e.target.value)}
            className="
              w-full px-2.5 py-1.5 text-xs rounded-md
              border border-[var(--color-bg-tertiary)]
              bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]
              focus:outline-none focus:ring-2 focus:ring-[var(--color-asrs-orange)] focus:border-transparent
              mb-1.5
            "
          >
            <option value="">— Choose an initiative —</option>
            {initiatives.map((init) => (
              <option key={init.id} value={init.id}>{init.name}</option>
            ))}
          </select>
          <button
            disabled={!selectedInitiative}
            onClick={() => {
              if (selectedInitiative) {
                router.push(`/survey?initiativeId=${selectedInitiative}`);
              }
            }}
            className={`
              w-full py-1.5 px-3 rounded-md text-xs font-semibold text-white
              transition-all duration-150
              ${selectedInitiative
                ? 'bg-gradient-to-r from-[var(--color-asrs-red)] to-[var(--color-asrs-orange)] hover:opacity-90 cursor-pointer shadow-sm'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-light)] cursor-not-allowed'}
            `}
          >
            Start Survey
          </button>
        </div>
      )}
    </div>
  );

  if (isSurvey) {
    return inner;
  }

  return (
    <Link href={href} className="no-underline block h-full">
      {inner}
    </Link>
  );
}

/* -----------------------------------------------------------------------
 * Home Page
 * ----------------------------------------------------------------------- */
export default function Home() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [initiatives, setInitiatives] = useState([]);
  const [selectedInitiative, setSelectedInitiative] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const isLoggedIn = Boolean(user);
  const isAdmin = isLoggedIn && user?.user_type === 'admin';
  const isStaff =
    isLoggedIn &&
    (user?.user_type === 'staff' || user?.user_type === 'admin');

  useEffect(() => {
    if (!isHydrated) return;

    fetch('/api/initiatives')
      .then((res) => res.json())
      .then((data) =>
        setInitiatives(
          Array.isArray(data.initiatives) ? data.initiatives : []
        )
      )
      .catch(() => setInitiatives([]));
  }, [isHydrated]);

  if (!isHydrated) return null;

  /* Filter routes by auth/role */
  const visibleRoutes = routes.filter((route) => {
    if (route.showOnlyWhenLoggedOut) return !isLoggedIn;
    if (route.adminOnly) return isLoggedIn && isAdmin;
    if (route.staffOnly) return isLoggedIn && isStaff;
    if (route.requiresAuth) return isLoggedIn;
    return true;
  });

  /* Group visible routes into sections, preserving order */
  const sectionOrder = ['public', 'staff', 'admin'];
  const grouped = sectionOrder
    .map((key) => ({
      key,
      ...SECTIONS[key],
      items: visibleRoutes.filter((r) => r.section === key),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      {/* ── Compact hero banner ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4A4A4A 0%, #2C2C2C 100%)' }}
      >
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-5 bg-white" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full opacity-5 bg-white" />

        <div className="relative max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            {/* Orange accent line */}
            <div
              className="w-1 h-10 rounded-full flex-shrink-0"
              style={{ background: 'linear-gradient(180deg, var(--color-asrs-red), var(--color-asrs-orange))' }}
            />
            <div>
              <h1 className="text-white text-lg md:text-xl font-bold tracking-tight leading-tight">
                ASRS Initiatives Reporting System
              </h1>
              <p className="text-white/60 text-sm leading-snug mt-0.5">
                {isLoggedIn
                  ? `Welcome back, ${user?.first_name || 'User'}.`
                  : 'Empowering communities through data-driven initiatives.'}
              </p>
            </div>
          </div>

          {/* Role badge */}
          {isLoggedIn && (
            <span className="
              px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase
              bg-white/10 text-white/70 border border-white/15 flex-shrink-0
            ">
              {user?.user_type === 'admin' ? 'Administrator' : 'Staff Member'}
            </span>
          )}
        </div>
      </section>

      {/* ── Unified card grid ── */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {grouped.map(({ key, title, subtitle, items }) => (
            <>
              {/* Section label — spans the full row */}
              <div key={`label-${key}`} className="col-span-full flex items-center gap-2 mt-1 first:mt-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-asrs-orange)]">
                  {title}
                </span>
                <span className="text-[10px] text-[var(--color-text-light)] font-medium">
                  {subtitle}
                </span>
                <div className="flex-1 h-px bg-[var(--color-bg-tertiary)]" />
              </div>

              {/* Cards flow naturally in the grid */}
              {items.map((route) => (
                <NavigationCard
                  key={route.href}
                  {...route}
                  isSurvey={route.href === '/survey'}
                  initiatives={initiatives}
                  selectedInitiative={selectedInitiative}
                  setSelectedInitiative={setSelectedInitiative}
                  router={router}
                />
              ))}
            </>
          ))}
        </div>
      </main>

      {/* ── Footer accent ── */}
      <div
        className="h-0.5 w-full mt-auto"
        style={{ background: 'linear-gradient(90deg, var(--color-asrs-red), var(--color-asrs-orange), var(--color-asrs-yellow))' }}
      />
    </div>
  );
}