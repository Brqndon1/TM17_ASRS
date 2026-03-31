'use client';

import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'personnel',  label: 'Personnel',  color: '#3498DB' },
  { key: 'equipment',  label: 'Equipment',  color: '#9B59B6' },
  { key: 'operations', label: 'Operations', color: '#E67E22' },
  { key: 'travel',     label: 'Travel',     color: '#1ABC9C' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  if (!n) return '$0';
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Number(n).toFixed(2)}`;
}

// Proportional colour-segment bar showing category breakdown
function CategoryBar({ row }) {
  if (!row.total) return <span style={{ color: 'var(--color-text-light)', fontSize: '0.85rem' }}>No budget</span>;
  return (
    <div style={{ display: 'flex', width: '100%', minWidth: '120px', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
      {CATEGORIES.map((c) => {
        const w = (row[c.key] / row.total) * 100;
        if (!w) return null;
        return (
          <div
            key={c.key}
            title={`${c.label}: ${fmt(row[c.key])} (${Math.round(w)}%)`}
            style={{ width: `${w}%`, height: '100%', backgroundColor: c.color }}
          />
        );
      })}
    </div>
  );
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div style={{
      backgroundColor: 'white', border: '1px solid var(--color-bg-tertiary)',
      borderRadius: '8px', padding: '0.75rem 1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      <p style={{ margin: '0 0 0.5rem 0', fontWeight: '700', color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: entry.color, fontWeight: '600' }}>
          {entry.name}: {fmt(entry.value)}
        </p>
      ))}
      <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text-primary)', borderTop: '1px solid var(--color-bg-tertiary)', paddingTop: '0.4rem' }}>
        Total: {fmt(total)}
      </p>
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
        setLoading(true);
        const res = await apiFetch(`/api/performance/budget?initiativeId=${initiative.initiative_id}`);
        if (!res.ok) throw new Error();
        setDetail(await res.json());
      } catch {
        setError('Failed to load details.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [initiative.initiative_id]);

  const thStyle = {
    padding: '0.5rem 0.75rem',
    fontWeight: '700',
    color: 'var(--color-text-secondary)',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

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
              {/* Per-fiscal-year table */}
              {detail.budgets.length === 0 ? (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: detail.history.length ? '1rem' : 0 }}>
                  No budget entries found for this initiative.
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: detail.history.length ? '1.25rem' : 0 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                      {['Fiscal Year', 'Department', 'Personnel', 'Equipment', 'Operations', 'Travel', 'Total', 'Mix'].map((h, i) => (
                        <th key={h} style={{ ...thStyle, textAlign: i < 2 ? 'left' : 'center' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.budgets.map((b) => (
                      <tr key={b.budget_id} style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>{b.fiscal_year}</td>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--color-text-secondary)' }}>{b.department}</td>
                        {CATEGORIES.map((c) => (
                          <td key={c.key} style={{ padding: '0.6rem 0.75rem', textAlign: 'center', color: b[c.key] ? c.color : 'var(--color-text-light)', fontWeight: '600' }}>
                            {b.total ? fmt(b[c.key]) : '—'}
                          </td>
                        ))}
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                          {fmt(b.total)}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          <CategoryBar row={b} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Change history */}
              {detail.history.length > 0 && (
                <>
                  <p style={{ fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    Change History
                  </p>
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
                          <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                            {new Date(h.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', color: 'var(--color-text-primary)', fontWeight: '600' }}>{h.fiscal_year}</td>
                          {CATEGORIES.map((c) => (
                            <td key={c.key} style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: 'var(--color-text-primary)' }}>
                              {fmt(h[c.key])}
                            </td>
                          ))}
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                            {fmt(h.total)}
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                            {h.changed_by_name || '—'}
                          </td>
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
  const [user, setUser]     = useState(null);
  const [data, setData]     = useState({ fiscalYears: [], departments: [], initiatives: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]   = useState(null);

  // Filters — fiscal year + department re-fetch; initiative name is client-side only
  const [filterFiscalYear,  setFilterFiscalYear]  = useState('');
  const [filterDept,        setFilterDept]        = useState('');
  const [filterInitiative,  setFilterInitiative]  = useState('');

  // Table
  const [sortField,   setSortField]   = useState('total-desc');
  const [expandedId,  setExpandedId]  = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const parsed = JSON.parse(stored);
    if (parsed.user_type !== 'admin' && parsed.user_type !== 'staff') { router.push('/'); return; }
    setUser(parsed);
  }, [router]);

  // Re-fetch whenever server-side filters change
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

  // Client-side initiative name filter
  const filtered = useMemo(() => {
    if (!filterInitiative) return data.initiatives;
    const q = filterInitiative.toLowerCase();
    return data.initiatives.filter(i => i.initiative_name.toLowerCase().includes(q));
  }, [data.initiatives, filterInitiative]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortField === 'total-desc')      return b.total      - a.total;
      if (sortField === 'total-asc')       return a.total      - b.total;
      if (sortField === 'name-asc')        return a.initiative_name.localeCompare(b.initiative_name);
      if (sortField === 'name-desc')       return b.initiative_name.localeCompare(a.initiative_name);
      if (sortField === 'personnel-desc')  return b.personnel  - a.personnel;
      if (sortField === 'operations-desc') return b.operations - a.operations;
      return 0;
    });
  }, [filtered, sortField]);

  const SORT_CYCLE = ['total-desc', 'total-asc', 'name-asc', 'name-desc', 'personnel-desc', 'operations-desc'];
  const SORT_LABELS = {
    'total-desc':      '↓ Total (high→low)',
    'total-asc':       '↑ Total (low→high)',
    'name-asc':        'A→Z Name',
    'name-desc':       'Z→A Name',
    'personnel-desc':  '↓ Personnel',
    'operations-desc': '↓ Operations',
  };
  function cycleSortField() {
    setSortField(prev => SORT_CYCLE[(SORT_CYCLE.indexOf(prev) + 1) % SORT_CYCLE.length]);
  }

  // Summary stats — always across full (unfiltered-by-name) dataset
  const allInits     = data.initiatives;
  const grandTotal   = allInits.reduce((s, i) => s + i.total, 0);
  const noBudget     = allInits.filter(i => !i.total).length;
  const catTotals    = CATEGORIES.map(c => ({ ...c, total: allInits.reduce((s, i) => s + (i[c.key] || 0), 0) }));
  const topCategory  = [...catTotals].sort((a, b) => b.total - a.total)[0];
  const personnelPct = grandTotal ? Math.round((catTotals[0].total / grandTotal) * 100) : 0;

  // Stacked bar chart data (only initiatives that have a budget)
  const chartData = sorted
    .filter(i => i.total > 0)
    .map(i => ({
      name: i.initiative_name.length > 16 ? i.initiative_name.slice(0, 16) + '…' : i.initiative_name,
      Personnel:  i.personnel,
      Equipment:  i.equipment,
      Operations: i.operations,
      Travel:     i.travel,
    }));

  const TABLE_COLS = 7; // Initiative + 4 categories + Total + Breakdown

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <BackButton />

        {/* ── Page title ── */}
        <div className="asrs-card" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            Performance — Budget
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 0 }}>
            Track budget allocation across initiatives by fiscal year and category.
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
            {/* ── Summary stats ── */}
            {allInits.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="asrs-card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Total Allocated</div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-text-primary)' }}>{fmt(grandTotal)}</div>
                </div>
                <div className="asrs-card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Top Category</div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: topCategory?.color || 'var(--color-text-primary)' }}>
                    {topCategory?.label || '—'}
                  </div>
                </div>
                <div className="asrs-card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>With Budget Set</div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-text-primary)' }}>
                    {allInits.length - noBudget} / {allInits.length}
                  </div>
                </div>
                <div className="asrs-card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Personnel Share</div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: '#3498DB' }}>
                    {grandTotal ? `${personnelPct}%` : '—'}
                  </div>
                </div>
              </div>
            )}

            {/* ── Filters ── */}
            {allInits.length > 0 && (
              <div className="asrs-card" style={{ marginBottom: '2rem' }}>
                <p style={{ fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Filter</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 220px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Initiative</label>
                    <input
                      type="text"
                      placeholder="Search by name…"
                      value={filterInitiative}
                      onChange={(e) => setFilterInitiative(e.target.value)}
                      style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white', color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>

                  {data.fiscalYears.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 160px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Fiscal Year</label>
                      <select
                        value={filterFiscalYear}
                        onChange={(e) => setFilterFiscalYear(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white', color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="">All Years</option>
                        {data.fiscalYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  )}

                  {data.departments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 180px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>Department</label>
                      <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white', color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="">All Departments</option>
                        {data.departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  )}

                  {(filterFiscalYear || filterDept || filterInitiative) && (
                    <button
                      onClick={() => { setFilterFiscalYear(''); setFilterDept(''); setFilterInitiative(''); }}
                      style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white', color: 'var(--color-text-secondary)', fontSize: '0.9rem', cursor: 'pointer', alignSelf: 'flex-end' }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Stacked bar chart ── */}
            {chartData.length > 0 && (
              <div className="asrs-card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: '0 0 0.25rem 0' }}>
                  Budget Allocation by Initiative
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 1.25rem 0' }}>
                  Stacked by personnel, equipment, operations, and travel.
                </p>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bg-tertiary)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--color-bg-tertiary)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--color-bg-tertiary)' }} tickFormatter={(v) => fmt(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '0.85rem', paddingTop: '0.5rem' }} />
                    {CATEGORIES.map((c, idx) => (
                      <Bar
                        key={c.key}
                        dataKey={c.label}
                        stackId="a"
                        fill={c.color}
                        radius={idx === CATEGORIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
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

            {/* ── Table ── */}
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
                      {['Initiative', 'Personnel', 'Equipment', 'Operations', 'Travel', 'Total', 'Breakdown'].map((h, i) => (
                        <th key={h} style={{ padding: '1rem', textAlign: i === 0 ? 'left' : 'center', fontWeight: '700', color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((initiative, index) => {
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
                            {/* Name + chevron */}
                            <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <svg width="14" height="14" viewBox="0 0 12 12" fill="none"
                                  style={{ flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', opacity: 0.5 }}>
                                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {initiative.initiative_name}
                              </div>
                            </td>

                            {/* Category columns */}
                            {CATEGORIES.map((c) => (
                              <td key={c.key} style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: initiative[c.key] ? c.color : 'var(--color-text-light)', fontSize: '0.9rem' }}>
                                {initiative.total ? fmt(initiative[c.key]) : '—'}
                              </td>
                            ))}

                            {/* Total */}
                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '800', color: 'var(--color-text-primary)', fontSize: '1rem' }}>
                              {initiative.total
                                ? fmt(initiative.total)
                                : <span style={{ color: 'var(--color-text-light)', fontWeight: '400', fontSize: '0.9rem' }}>No budget</span>
                              }
                            </td>

                            {/* Proportional breakdown bar */}
                            <td style={{ padding: '1rem' }}>
                              <CategoryBar row={initiative} />
                            </td>
                          </tr>

                          {isExpanded && (
                            <DrillDownRow
                              key={`drill-${initiative.initiative_id}`}
                              initiative={initiative}
                              colCount={TABLE_COLS}
                            />
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