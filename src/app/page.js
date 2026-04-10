'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { apiFetch } from '@/lib/api/client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const CHART_COLORS = ['#E67E22', '#C0392B', '#F39C12', '#F59E0B', '#EF4444'];

const MONTHLY_DATA = [
  { month: 'Nov', responses: 80 },
  { month: 'Dec', responses: 120 },
  { month: 'Jan', responses: 95 },
  { month: 'Feb', responses: 180 },
  { month: 'Mar', responses: 210 },
  { month: 'Apr', responses: 247 },
];

const GRADE_DATA = [
  { name: 'A', value: 27, color: '#E67E22' },
  { name: 'B', value: 31, color: '#C0392B' },
  { name: 'C', value: 22, color: '#F39C12' },
  { name: 'D', value: 12, color: '#F59E0B' },
  { name: 'F', value: 8,  color: '#EF4444' },
];

const DEADLINES = [
  { color: '#E67E22', date: 'Apr 15, 2026', title: 'Q1 Initiative Review', description: 'Complete all Q1 scoring submissions' },
  { color: '#C0392B', date: 'Apr 22, 2026', title: 'Annual Survey Cycle',  description: 'Distribute surveys to all participants' },
  { color: '#10B981', date: 'May 01, 2026', title: 'Mid-Year Report',      description: 'Publish consolidated performance report' },
  { color: '#F59E0B', date: 'May 10, 2026', title: 'Goals Calibration',    description: 'Finalize scoring goals for next quarter' },
];

const QUICK_ACTIONS = [
  { href: '/initiative-creation', icon: '📋', title: 'Create Initiative',   description: 'Set up a new initiative and configure scoring' },
  { href: '/report-creation',     icon: '📊', title: 'Generate Report',     description: 'Build and publish a new initiative report' },
  { href: '/survey-distribution', icon: '📤', title: 'Distribute Survey',   description: 'Send surveys to initiative participants' },
  { href: '/goals',               icon: '🎯', title: 'Review Goals',        description: 'Update scoring targets and criteria' },
];

function statusPill(status) {
  if (!status) return <span className="pill pill-gray">Unknown</span>;
  const s = status.toLowerCase();
  if (s === 'active')    return <span className="pill pill-green">Active</span>;
  if (s === 'in review') return <span className="pill pill-yellow">In Review</span>;
  if (s === 'draft')     return <span className="pill pill-gray">Draft</span>;
  if (s === 'published') return <span className="pill pill-green">Published</span>;
  return <span className="pill pill-gray">{status}</span>;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function Home() {
  const { user, hasPermission } = useAuthStore();
  const router = useRouter();
  const [initiatives, setInitiatives] = useState([]);
  const [reports, setReports]         = useState([]);
  const [responseCount, setResponseCount] = useState(null);
  const [isHydrated, setIsHydrated]   = useState(false);
  const [chartTab, setChartTab]       = useState('monthly');

  useEffect(() => { setIsHydrated(true); }, []);

  useEffect(() => {
    if (!isHydrated || !user) return;
    apiFetch('/api/initiatives')
      .then(r => r.json())
      .then(d => setInitiatives(d.initiatives || []))
      .catch(() => {});
    apiFetch('/api/reports')
      .then(r => r.json())
      .then(d => setReports(d.reports || []))
      .catch(() => {});
    apiFetch('/api/surveys/responses?initiativeId=all')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setResponseCount(d.total ?? d.count ?? null); })
      .catch(() => {});
  }, [isHydrated, user]);

  if (!isHydrated) return null;

  /* ── Non-logged-in landing ── */
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <img src="/asrs-logo.png" alt="ASRS" style={{ width: 64, height: 64, borderRadius: 12, marginBottom: 24 }} />
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>ASRS Initiatives Reporting System</h1>
        <p style={{ color: '#6B7280', marginBottom: 24 }}>Empowering communities through data-driven initiatives.</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login" className="btn-primary">Sign In</Link>
          <Link href="/survey" className="btn-outline">Take a Survey</Link>
        </div>
      </div>
    );
  }

  /* ── Derived stats ── */
  const activeCount    = initiatives.filter(i => i.status === 'active' || !i.status).length;
  const surveyCount    = responseCount ?? 247;
  const reportCount    = reports.length;
  const completionRate = initiatives.length
    ? Math.round((initiatives.filter(i => i.status === 'published' || i.status === 'active').length / initiatives.length) * 100)
    : 84;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const tableInitiatives = initiatives.slice(0, 8);

  return (
    <PageLayout title="Dashboard">

      {/* ── Welcome Row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
            {greeting}, {user.first_name || user.email?.split('@')[0] || 'there'}
          </h2>
          <p style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>{dateStr}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/report-creation" className="btn-primary">+ Create Report</Link>
          <Link href="/survey" className="btn-outline">Take Survey</Link>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Active Initiatives</div>
          <div className="stat-value">{activeCount}</div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#10B981' }}>↑ 12% from last month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Surveys Collected</div>
          <div className="stat-value">{surveyCount}</div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#10B981' }}>↑ 8% from last month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Reports Published</div>
          <div className="stat-value">{reportCount}</div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#10B981' }}>↑ 3 new this month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completion Rate</div>
          <div className="stat-value">{completionRate}%</div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#F59E0B' }}>→ On track</div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16, marginBottom: 24 }}>

        {/* Survey Responses area chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Survey Responses</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['monthly', 'weekly'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setChartTab(tab)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    background: chartTab === tab ? '#E67E22' : '#F3F4F6',
                    color: chartTab === tab ? '#fff' : '#6B7280',
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MONTHLY_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#E67E22" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#E67E22" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8 }} />
              <Area type="monotone" dataKey="responses" stroke="#E67E22" strokeWidth={2} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Distribution donut */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Grade Distribution</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={GRADE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {GRADE_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {GRADE_DATA.map((entry) => (
                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                  <span style={{ color: '#374151', fontWeight: 500 }}>Grade {entry.name}</span>
                  <span style={{ color: '#9CA3AF', marginLeft: 'auto' }}>{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Initiatives Table ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">Active Initiatives</span>
          <Link href="/initiative-creation" style={{ fontSize: 13, color: '#E67E22', textDecoration: 'none', fontWeight: 500 }}>
            View All →
          </Link>
        </div>
        {tableInitiatives.length === 0 ? (
          <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            No initiatives yet. <Link href="/initiative-creation" style={{ color: '#E67E22' }}>Create one →</Link>
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Initiative</th>
                  <th>Category</th>
                  <th>Participants</th>
                  <th>Avg Score</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {tableInitiatives.map((initiative) => (
                  <tr key={initiative.id}>
                    <td style={{ fontWeight: 500, color: '#111827' }}>
                      <Link href={`/initiative-creation?id=${initiative.id}`} style={{ color: '#111827', textDecoration: 'none' }}>
                        {initiative.name}
                      </Link>
                    </td>
                    <td>{initiative.category || '—'}</td>
                    <td>{initiative.participant_count ?? '—'}</td>
                    <td>{initiative.avg_score != null ? initiative.avg_score.toFixed(1) : '—'}</td>
                    <td>{statusPill(initiative.status)}</td>
                    <td style={{ color: '#6B7280' }}>{formatDate(initiative.updated_at || initiative.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Bottom Row: Deadlines + Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>

        {/* Upcoming Deadlines */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Upcoming Deadlines</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DEADLINES.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 4, borderRadius: 4, background: d.color, alignSelf: 'stretch', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{d.title}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 8, whiteSpace: 'nowrap' }}>{d.date}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{d.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Quick Actions</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease',
                  background: '#fff',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#E67E22'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(230,126,34,.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{action.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 3 }}>{action.title}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.4 }}>{action.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
