'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  if (!n) return '$0';
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Number(n).toFixed(2)}`;
}

function pct(spent, total) {
  if (!total) return 0;
  return Math.round((spent / total) * 100);
}

function getStatus(utilization) {
  if (utilization > 100) return { label: 'Over Budget', color: '#C0392B', bg: '#C0392B18' };
  if (utilization >= 80)  return { label: 'At Risk',    color: '#F39C12', bg: '#F39C1218' };
  return                         { label: 'On Track',   color: '#27AE60', bg: '#27AE6018' };
}

const CATEGORIES = [
  { key: 'personnel',  spentKey: 'personnel_spent',  label: 'Personnel',  color: '#3498DB' },
  { key: 'equipment',  spentKey: 'equipment_spent',  label: 'Equipment',  color: '#9B59B6' },
  { key: 'operations', spentKey: 'operations_spent', label: 'Operations', color: '#E67E22' },
  { key: 'travel',     spentKey: 'travel_spent',     label: 'Travel',     color: '#1ABC9C' },
];

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: 'white', border: '1px solid var(--color-bg-tertiary)', borderRadius: '8px', padding: '0.75rem 1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <p style={{ margin: '0 0 0.5rem 0', fontWeight: '700', color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: entry.color, fontWeight: '600' }}>
          {entry.name}: {fmt(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Drill-down row ───────────────────────────────────────────────────────────

function DrillDownRow({ initiative, colCount }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(`/api/performance/budget?initiativeId=${initiative.initiative_id}`);
        if (!res.ok) throw new Error();
        setDetail(await res.json());
      } catch { setError('Failed to load details.'); }
      finally  { setLoading(false); }
    }
    load();
  }, [initiative.initiative_id]);

  const thStyle = { padding: '0.5rem 0.75rem', fontWeight: '700', color: 'var(--color-text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' };

  return (
    <tr>
      <td colSpan={colCount} style={{ padding: 0, backgroundColor: 'var(--color-bg-secondary)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '2px solid var(--color-bg-tertiary)', borderBottom: '2px solid var(--color-bg-tertiary)' }}>
          <p style={{ fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
            Budget Breakdown — {initiative.initiative_name}
          </p>

          {loading && <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Loading...</p>}
          {error   && <p style={{ color: '#c62828', fontSize: '0.9rem' }}>{error}</p>}

          {!loading && !error && detail && (
            <>
              {detail.budgets.length === 0 ? (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>No budget entries found.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: detail.history.length ? '1.25rem' : 0 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                      {['Fiscal Year', 'Category', 'Budget', 'Spent', 'Remaining', 'Utilization', 'Status'].map((h, i) => (
                        <th key={h} style={{ ...thStyle, textAlign: i < 2 ? 'left' : 'center' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.budgets.flatMap((b) =>
                      CATEGORIES.map((c, ci) => {
                        const budget    = b[c.key]      || 0;
                        const spent     = b[c.spentKey] || 0;
                        const remaining = budget - spent;
                        const util      = pct(spent, budget);
                        const status    = getStatus(util);
                        return (
                          <tr key={`${b.budget_id}-${c.key}`} style={{ borderBottom: '1px solid var(--color-bg-tertiary)', backgroundColor: ci === 0 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                            <td style={{ padding: '0.6rem 0.75rem', fontWeight: ci === 0 ? '700' : '400', color: 'var(--color-text-primary)' }}>
                              {ci === 0 ? b.fiscal_year : ''}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', fontWeight: '600', color: c.color }}>{c.label}</td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', color: 'var(--color-text-primary)' }}>{fmt(budget)}</td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', color: status.color, fontWeight: '600' }}>{fmt(spent)}</td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', color: remaining < 0 ? '#C0392B' : 'var(--color-text-primary)' }}>{fmt(remaining)}</td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: '700', color: budget ? status.color : 'var(--color-text-light)' }}>
                              {budget ? `${util}%` : '—'}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                              {budget ? (
                                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', backgroundColor: status.bg, color: status.color }}>
                                  {status.label}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {detail.history.length > 0 && (
                <>
                  <p style={{ fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Change History</p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                        {['Date', 'Fiscal Year', 'Personnel', 'Equipment', 'Operations', 'Travel', 'Total', 'Changed By'].map((h, i) => (
                          <th key={h} style={{ ...thStyle, fontSize: '0.72rem', textAlign: i < 2 ? 'left' : 'center' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.history.map((h) => (
                        <tr key={h.history_id} style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                          <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-secondary)' }}>{new Date(h.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '0.5rem 0.75rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>{h.fiscal_year}</td>
                          {CATEGORIES.map((c) => (
                            <td key={c.key} style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: 'var(--color-text-primary)' }}>{fmt(h[c.key])}</td>
                          ))}
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: '700', color: 'var(--color-text-primary)' }}>{fmt(h.total)}</td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>{h.changed_by_name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerformanceBudget() {
  const router = useRouter();
  const [user, setUser]           = useState(null);
  const [data, setData]           = useState({ fiscalYears: [], departments: [], initiatives: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  const [filterFiscalYear, setFilterFiscalYear] = useState('');
  const [filterDept,       setFilterDept]       = useState('');
  const [filterInitiative, setFilterInitiative] = useState('');
  const [filterStatus,     setFilterStatus]     = useState('');

  const [sortField,  setSortField]  = useState('utilization-desc');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const parsed = JSON.parse(stored);
    if (parsed.user_type !== 'admin' && parsed.user_type !== 'staff') { router.push('/'); return; }
    setUser(parsed);
  }, [router]);

  useEffect(() => { if (user) fetchData(); }, [user, filterFiscalYear, filterDept]);

  async function fetchData() {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filterFiscalYear) params.set('fiscalYear', filterFiscalYear);
      if (filterDept)       params.set('department', filterDept);
      const res = await apiFetch(`/api/performance/budget?${params}`);
      if (!res.ok) throw new Error('Failed to fetch budget data');
      setData(await res.json());
    } catch (err) {
      console.error(err);
      setError('Failed to load budget data');
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return data.initiatives.filter((i) => {
      if (filterInitiative && !i.initiative_name.toLowerCase().includes(filterInitiative.toLowerCase())) return false;
      if (filterStatus) {
        const util   = pct(i.total_spent, i.total);
        const status = getStatus(util);
        if (status.label !== filterStatus) return false;
      }
      return true;
    });
  }, [data.initiatives, filterInitiative, filterStatus]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aUtil = pct(a.total_spent, a.total);
      const bUtil = pct(b.total_spent, b.total);
      if (sortField === 'utilization-desc') return bUtil  - aUtil;
      if (sortField === 'utilization-asc')  return aUtil  - bUtil;
      if (sortField === 'budget-desc')      return b.total - a.total;
      if (sortField === 'budget-asc')       return a.total - b.total;
      if (sortField === 'spent-desc')       return b.total_spent - a.total_spent;
      if (sortField === 'name-asc')         return a.initiative_name.localeCompare(b.initiative_name);
      return 0;
    });
  }, [filtered, sortField]);

  const SORT_CYCLE   = ['utilization-desc', 'utilization-asc', 'budget-desc', 'budget-asc', 'spent-desc', 'name-asc'];
  const SORT_LABELS  = {
    'utilization-desc': '↓ Utilization (high→low)',
    'utilization-asc':  '↑ Utilization (low→high)',
    'budget-desc':      '↓ Budget (high→low)',
    'budget-asc':       '↑ Budget (low→high)',
    'spent-desc':       '↓ Spent (high→low)',
    'name-asc':         'A→Z Name',
  };
  function cycleSortField() {
    setSortField(prev => SORT_CYCLE[(SORT_CYCLE.indexOf(prev) + 1) % SORT_CYCLE.length]);
  }

  const allInits = data.initiatives;
  const visibleInitiatives = sorted;

  const grandBudget  = visibleInitiatives.reduce((s, i) => s + i.total,       0);
  const grandSpent   = visibleInitiatives.reduce((s, i) => s + i.total_spent, 0);
  const overBudget   = visibleInitiatives.filter((i) => pct(i.total_spent, i.total) > 100).length;
  const avgUtil      = visibleInitiatives.length
    ? Math.round(visibleInitiatives.reduce((s, i) => s + pct(i.total_spent, i.total), 0) / visibleInitiatives.length)
    : 0;

  // Grouped bar chart data (budget vs spent per initiative)
  const chartData = visibleInitiatives
    .filter(i => i.total > 0 || i.total_spent > 0)
    .map(i => ({
      name:   i.initiative_name.length > 16 ? i.initiative_name.slice(0, 16) + '…' : i.initiative_name,
      Budget: i.total,
      Spent:  i.total_spent,
    }));

  const TABLE_COLS = 7;

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <BackButton />

        <div className="asrs-card" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            Performance — Budget
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 0 }}>
            Track budget allocation vs. actual spending across all initiatives.
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '8px', color: '#c62828', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
            Loading budget data...
          </div>
        )}

        {!isLoading && (
          <>
            {/* ── (1) Summary stats ── */}
            {allInits.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { label: 'Total Budget',     value: fmt(grandBudget), color: 'var(--color-text-primary)' },
                  { label: 'Total Spent',       value: fmt(grandSpent),  color: getStatus(pct(grandSpent, grandBudget)).color },
                  { label: 'Avg. Utilization',  value: `${avgUtil}%`,    color: getStatus(avgUtil).color },
                  { label: 'Over-Budget Items', value: overBudget,       color: overBudget > 0 ? '#C0392B' : '#27AE60' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="asrs-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>{label}</div>
                    <div style={{ fontSize: '2rem', fontWeight: '800', color }}>{value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── (2) Filters ── */}
            {allInits.length > 0 && (
              <div className="asrs-card" style={{ marginBottom: '2rem' }}>
                <p style={{ fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Filters</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 220px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Initiative</label>
                    <input
                      type="text" placeholder="Search by name…" value={filterInitiative}
                      onChange={(e) => setFilterInitiative(e.target.value)}
                      style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white', color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>

                  {data.fiscalYears.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 160px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Fiscal Year</label>
                      <select value={filterFiscalYear} onChange={(e) => setFilterFiscalYear(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white', color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}>
                        <option value="">All Years</option>
                        {data.fiscalYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  )}

                  {data.departments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 180px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Department</label>
                      <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white', color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}>
                        <option value="">All Departments</option>
                        {data.departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 160px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Status</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                      style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white', color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}>
                      <option value="">All Statuses</option>
                      <option value="On Track">On Track</option>
                      <option value="At Risk">At Risk</option>
                      <option value="Over Budget">Over Budget</option>
                    </select>
                  </div>

                  {(filterFiscalYear || filterDept || filterInitiative || filterStatus) && (
                    <button onClick={() => { setFilterFiscalYear(''); setFilterDept(''); setFilterInitiative(''); setFilterStatus(''); }}
                      style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white', color: 'var(--color-text-secondary)', fontSize: '0.9rem', cursor: 'pointer', alignSelf: 'flex-end' }}>
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── (1) Grouped bar chart: Budget vs Spent ── */}
            {chartData.length > 0 && (
              <div className="asrs-card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: '0 0 0.25rem 0' }}>
                  Budget vs. Actual Spend
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 1.25rem 0' }}>
                  Green = allocated budget · Red = actual spend
                </p>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bg-tertiary)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--color-bg-tertiary)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--color-bg-tertiary)' }} tickFormatter={(v) => fmt(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '0.85rem', paddingTop: '0.5rem' }} />
                    <Bar dataKey="Budget" fill="#27AE60" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Spent"  fill="#C0392B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Sort + count ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>
                Showing <strong>{sorted.length}</strong> of <strong>{allInits.length}</strong> initiatives
              </div>
              <button onClick={cycleSortField} className="asrs-btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                Sort: {SORT_LABELS[sortField]}
              </button>
            </div>

            {/* ── (1 + 3 + 4) Table ── */}
            {allInits.length === 0 ? (
              <div className="asrs-card" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
                No budget data found. Add budgets to initiatives to see data here.
              </div>
            ) : sorted.length === 0 ? (
              <div className="asrs-card" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
                No initiatives match the current filters.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '2px solid var(--color-bg-tertiary)' }}>
                      {['Initiative', 'Total Budget', 'Total Spent', 'Remaining', 'Utilization', 'Status', 'Progress'].map((h, i) => (
                        <th key={h} style={{ padding: '1rem', textAlign: i === 0 ? 'left' : 'center', fontWeight: '700', color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((initiative, index) => {
                      const util      = pct(initiative.total_spent, initiative.total);
                      const status    = getStatus(util);
                      const remaining = initiative.total - initiative.total_spent;
                      const isExpanded = expandedId === initiative.initiative_id;

                      return (
                        <React.Fragment key={initiative.initiative_id}>
                          <tr
                            onClick={() => setExpandedId(prev => prev === initiative.initiative_id ? null : initiative.initiative_id)}
                            style={{
                              borderBottom: isExpanded ? 'none' : '1px solid var(--color-bg-tertiary)',
                              backgroundColor: isExpanded ? 'var(--color-bg-tertiary)' : index % 2 === 0 ? 'white' : 'var(--color-bg-secondary)',
                              transition: 'background-color 0.2s ease',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                            onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : 'var(--color-bg-secondary)'; }}
                          >
                            {/* Initiative name + chevron */}
                            <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <svg width="14" height="14" viewBox="0 0 12 12" fill="none"
                                  style={{ flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', opacity: 0.5 }}>
                                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {initiative.initiative_name}
                              </div>
                            </td>

                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>
                              {initiative.total ? fmt(initiative.total) : <span style={{ color: 'var(--color-text-light)' }}>No budget</span>}
                            </td>

                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: status.color, fontSize: '0.9rem' }}>
                              {fmt(initiative.total_spent)}
                            </td>

                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: remaining < 0 ? '#C0392B' : 'var(--color-text-primary)', fontSize: '0.9rem' }}>
                              {initiative.total ? fmt(remaining) : '—'}
                            </td>

                            {/* (3) Utilization badge */}
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <div style={{ display: 'inline-block', minWidth: '72px', padding: '0.4rem 0.65rem', borderRadius: '8px', backgroundColor: status.bg, fontSize: '1rem', fontWeight: '800', color: status.color }}>
                                {initiative.total ? `${util}%` : '—'}
                              </div>
                            </td>

                            {/* (3) Status badge */}
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              {initiative.total ? (
                                <span style={{ padding: '0.3rem 0.7rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700', backgroundColor: status.bg, color: status.color, whiteSpace: 'nowrap' }}>
                                  {status.label}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-text-light)', fontSize: '0.85rem' }}>No budget set</span>
                              )}
                            </td>

                            {/* Progress bar */}
                            <td style={{ padding: '1rem' }}>
                              <div style={{ width: '100%', minWidth: '120px', height: '8px', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(util, 100)}%`, height: '100%', backgroundColor: status.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                              </div>
                            </td>
                          </tr>

                          {/* (4) Drill-down */}
                          {isExpanded && (
                            <DrillDownRow initiative={initiative} colCount={TABLE_COLS} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}