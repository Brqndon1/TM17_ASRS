'use client';

import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function pct(spent, total) {
  if (!total) return 0;
  return Math.min(Math.round((spent / total) * 100), 999);
}

function utilizationColor(p) {
  if (p > 100) return '#C0392B';   // over budget — red
  if (p >= 80)  return '#F39C12';  // nearing limit — amber
  return '#27AE60';                // on track — green
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid var(--color-bg-tertiary)',
      borderRadius: '8px',
      padding: '0.75rem 1rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      <p style={{ margin: '0 0 0.5rem 0', fontWeight: '700', color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>
        {label}
      </p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: entry.color, fontWeight: '600' }}>
          {entry.name}: {fmt(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerformanceBudget() {
  const router = useRouter();
  const [user, setUser]             = useState(null);
  const [initiatives, setInitiatives] = useState([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState(null);
  const [sortOrder, setSortOrder]   = useState('utilization-desc');

  // Check admin / staff access
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    const parsed = JSON.parse(stored);
    if (parsed.user_type !== 'admin' && parsed.user_type !== 'staff') { router.push('/'); return; }
    setUser(parsed);
  }, [router]);

  useEffect(() => { if (user) fetchBudgetData(); }, [user]);

  async function fetchBudgetData() {
    try {
      setIsLoading(true);
      setError(null);

      const res = await apiFetch('/api/goals/initiatives');
      if (!res.ok) throw new Error('Failed to fetch initiatives');
      const { initiatives: all = [] } = await res.json();

      // For each initiative, fetch its goals to derive budget figures.
      // Replace this with a dedicated /api/performance/budget endpoint if one exists.
      const withBudget = await Promise.all(
        all.map(async (init) => {
          try {
            const gRes = await apiFetch(`/api/goals?initiativeId=${init.initiative_id}`);
            if (!gRes.ok) throw new Error();
            const { goals = [] } = await gRes.json();

            const totalBudget = goals.reduce((s, g) => s + (Number(g.budget)        || 0), 0);
            const totalSpent  = goals.reduce((s, g) => s + (Number(g.budget_spent)  || 0), 0);
            const utilization = pct(totalSpent, totalBudget);

            return { ...init, totalBudget, totalSpent, utilization, goalsCount: goals.length };
          } catch {
            return { ...init, totalBudget: 0, totalSpent: 0, utilization: 0, goalsCount: 0 };
          }
        })
      );

      setInitiatives(withBudget);
    } catch (err) {
      console.error(err);
      setError('Failed to load budget data');
    } finally {
      setIsLoading(false);
    }
  }

  function getSorted() {
    return [...initiatives].sort((a, b) => {
      if (sortOrder === 'utilization-desc') return b.utilization - a.utilization;
      if (sortOrder === 'utilization-asc')  return a.utilization - b.utilization;
      if (sortOrder === 'budget-desc')      return b.totalBudget - a.totalBudget;
      if (sortOrder === 'budget-asc')       return a.totalBudget - b.totalBudget;
      return 0;
    });
  }

  function cycleSortOrder() {
    const cycle = ['utilization-desc', 'utilization-asc', 'budget-desc', 'budget-asc'];
    setSortOrder((prev) => cycle[(cycle.indexOf(prev) + 1) % cycle.length]);
  }

  const sortLabel = {
    'utilization-desc': '↓ Utilization (high→low)',
    'utilization-asc':  '↑ Utilization (low→high)',
    'budget-desc':      '↓ Total Budget (high→low)',
    'budget-asc':       '↑ Total Budget (low→high)',
  }[sortOrder];

  if (!user) return null;

  const sorted       = getSorted();
  const chartData    = sorted.map((i) => ({
    name:    i.initiative_name.length > 18 ? i.initiative_name.slice(0, 18) + '…' : i.initiative_name,
    Budget:  i.totalBudget,
    Spent:   i.totalSpent,
  }));

  const totalBudget  = initiatives.reduce((s, i) => s + i.totalBudget, 0);
  const totalSpent   = initiatives.reduce((s, i) => s + i.totalSpent,  0);
  const overBudget   = initiatives.filter((i) => i.utilization > 100).length;
  const avgUtil      = initiatives.length
    ? Math.round(initiatives.reduce((s, i) => s + i.utilization, 0) / initiatives.length)
    : 0;

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
            Track budget allocation and spending across all initiatives.
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
            {initiatives.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { label: 'Total Budget',      value: fmt(totalBudget),  color: 'var(--color-text-primary)' },
                  { label: 'Total Spent',        value: fmt(totalSpent),   color: utilizationColor(pct(totalSpent, totalBudget)) },
                  { label: 'Avg. Utilization',   value: `${avgUtil}%`,     color: utilizationColor(avgUtil) },
                  { label: 'Over-Budget Items',  value: overBudget,        color: overBudget > 0 ? '#C0392B' : '#27AE60' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="asrs-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>{label}</div>
                    <div style={{ fontSize: '2rem', fontWeight: '800', color }}>{value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Bar chart ── */}
            {initiatives.length > 0 && chartData.some((d) => d.Budget > 0 || d.Spent > 0) && (
              <div className="asrs-card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: '0 0 0.25rem 0' }}>
                  Budget vs. Spent by Initiative
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 1.25rem 0' }}>
                  Green bars = allocated budget · Red bars = amount spent
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

            {/* ── Sort control ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>
                Total Initiatives: <strong>{initiatives.length}</strong>
              </div>
              <button onClick={cycleSortOrder} className="asrs-btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                Sort: {sortLabel}
              </button>
            </div>

            {/* ── Table ── */}
            {initiatives.length === 0 ? (
              <div className="asrs-card" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
                No initiatives found. Create initiatives to see budget data.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '2px solid var(--color-bg-tertiary)' }}>
                      {['Initiative', 'Goals', 'Total Budget', 'Spent', 'Remaining', 'Utilization', 'Progress'].map((h, i) => (
                        <th key={h} style={{ padding: '1rem', textAlign: i === 0 ? 'left' : 'center', fontWeight: '700', color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((initiative, index) => {
                      const remaining = initiative.totalBudget - initiative.totalSpent;
                      const color     = utilizationColor(initiative.utilization);
                      return (
                        <tr
                          key={initiative.initiative_id}
                          style={{ borderBottom: '1px solid var(--color-bg-tertiary)', backgroundColor: index % 2 === 0 ? 'white' : 'var(--color-bg-secondary)', transition: 'background-color 0.2s ease' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : 'var(--color-bg-secondary)')}
                        >
                          <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
                            {initiative.initiative_name}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>
                            {initiative.goalsCount}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>
                            {fmt(initiative.totalBudget)}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color, fontSize: '0.9rem' }}>
                            {fmt(initiative.totalSpent)}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: remaining < 0 ? '#C0392B' : 'var(--color-text-primary)', fontSize: '0.9rem' }}>
                            {fmt(remaining)}
                          </td>
                          {/* Utilization badge */}
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ display: 'inline-block', minWidth: '72px', padding: '0.4rem 0.65rem', borderRadius: '8px', backgroundColor: color + '18', fontSize: '1rem', fontWeight: '800', color }}>
                              {initiative.utilization}%
                            </div>
                          </td>
                          {/* Progress bar — capped at 100 % visually but colour shows over-budget */}
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ width: '100%', minWidth: '130px', height: '8px', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(initiative.utilization, 100)}%`, height: '100%', backgroundColor: color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                            </div>
                          </td>
                        </tr>
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