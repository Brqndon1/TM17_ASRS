'use client';

// Moved from src/app/performance-dashboard/page.js
// Content is identical

import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ─── Weighted score helpers ───────────────────────────────────────────────────

/**
 * Normalizes raw weights against their sum, matching the server's computeOverallScore.
 * e.g. weights [2, 1] → 66.7% and 33.3%.
 * Returns { totalWeight, weightError, breakdown }.
 */
function calcWeightedScore(goals) {
  if (!goals?.length) return { totalWeight: 100, weightError: false, breakdown: [] };

  const totalWeightRaw = goals.reduce((s, g) => s + (g.weight ?? 0), 0);
  const weightError = totalWeightRaw === 0;

  const breakdown = goals.map((g) => {
    const w = g.weight ?? 0;
    const normalizedWeight = totalWeightRaw > 0 ? w / totalWeightRaw : 0;
    const progress = (g.score ?? 0) / 100;
    return { ...g, decimalWeight: normalizedWeight, displayWeight: parseFloat((normalizedWeight * 100).toFixed(1)), contribution: progress * normalizedWeight };
  });

  return { totalWeight: 100, weightError, breakdown };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PerformanceGoals() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [initiatives, setInitiatives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('descending');
  const [expandedId, setExpandedId] = useState(null);

  // Chart state
  const [selectedInitiativeId, setSelectedInitiativeId] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartInitiative, setChartInitiative] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);

  // Check admin / staff access
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) { router.push('/login'); return; }
    const parsed = JSON.parse(storedUser);
    if (parsed.user_type !== 'admin' && parsed.user_type !== 'staff') { router.push('/'); return; }
    setUser(parsed);
  }, [router]);

  useEffect(() => { if (user) fetchInitiativesWithScores(); }, [user]);

  useEffect(() => {
    if (selectedInitiativeId) {
      fetchChartData(selectedInitiativeId);
    } else {
      setChartData([]);
      setChartInitiative(null);
      setChartError(null);
    }
  }, [selectedInitiativeId]);

  async function fetchInitiativesWithScores() {
    try {
      setIsLoading(true);
      setError(null);

      const initiativesRes = await apiFetch('/api/goals/initiatives');
      if (!initiativesRes.ok) throw new Error('Failed to fetch initiatives');
      const initiativesData = await initiativesRes.json();
      const allInitiatives = initiativesData.initiatives || [];

      const initiativesWithScores = await Promise.all(
        allInitiatives.map(async (init) => {
          try {
            const goalsRes = await apiFetch(`/api/goals?initiativeId=${init.initiative_id}`);
            if (goalsRes.ok) {
              const goalsData = await goalsRes.json();
              const goals = goalsData.goals || [];

              // ── use server-computed score; calcWeightedScore is for breakdown display only ──
              const { totalWeight, weightError, breakdown } = calcWeightedScore(goals);
              const score = goalsData.overallScore ?? 0;

              const today = new Date();
              today.setHours(0, 0, 0, 0);

              let nearestDeadline = null;
              let daysUntilNearest = null;

              for (const goal of goals) {
                if (goal.deadline) {
                  const deadlineDate = new Date(goal.deadline);
                  deadlineDate.setHours(0, 0, 0, 0);
                  const daysUntil = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
                  if (daysUntilNearest === null || daysUntil < daysUntilNearest) {
                    nearestDeadline = goal.deadline;
                    daysUntilNearest = daysUntil;
                  }
                }
              }

              return {
                ...init,
                overallScore: score,
                goalsCount: goals.length,
                totalWeight,
                weightError,
                breakdown,
                nearestDeadline,
                daysUntilNearest,
              };
            }
            return {
              ...init,
              overallScore: 0,
              goalsCount: 0,
              totalWeight: 0,
              weightError: false,
              breakdown: [],
              nearestDeadline: null,
              daysUntilNearest: null,
            };
          } catch (err) {
            console.error(`Error fetching goals for initiative ${init.initiative_id}:`, err);
            return {
              ...init,
              overallScore: 0,
              goalsCount: 0,
              totalWeight: 0,
              weightError: false,
              breakdown: [],
              nearestDeadline: null,
              daysUntilNearest: null,
            };
          }
        })
      );

      setInitiatives(initiativesWithScores);
    } catch (err) {
      console.error(err);
      setError('Failed to load performance data');
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchChartData(initiativeId) {
    try {
      setChartLoading(true);
      setChartError(null);

      const res = await apiFetch(`/api/goals/history?initiativeId=${initiativeId}`);
      if (!res.ok) throw new Error('Failed to fetch history');

      const data = await res.json();
      setChartInitiative(data.initiative);

      if (data.timeline && data.timeline.length > 0) {
        setChartData(
          data.timeline.map((entry) => ({
            date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            rawDate: entry.date,
            'Current Performance': entry.overallScore,
            'Goal Target': entry.targetScore,
          }))
        );
      } else {
        setChartData([]);
      }
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setChartError('Failed to load progress history');
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }

  function getScoreColor(score) {
    if (score >= 80) return '#27AE60';
    if (score >= 50) return '#F39C12';
    return '#C0392B';
  }

  function getSortedInitiatives() {
    return [...initiatives].sort((a, b) => {
      if (sortOrder === 'ascending') return a.overallScore - b.overallScore;
      if (sortOrder === 'descending') return b.overallScore - a.overallScore;
      // 'deadline' — soonest first, nulls last
      const aDays = a.daysUntilNearest !== null ? a.daysUntilNearest : Infinity;
      const bDays = b.daysUntilNearest !== null ? b.daysUntilNearest : Infinity;
      return aDays - bDays;
    });
  }

  function toggleSortOrder() {
    setSortOrder((prev) =>
      prev === 'ascending' ? 'descending' : prev === 'descending' ? 'deadline' : 'ascending'
    );
  }

  function handleRowClick(initiative) {
    const sid = String(initiative.initiative_id);
    setSelectedInitiativeId(sid);
    setExpandedId((prev) => (prev === sid ? null : sid));
  }

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
            {entry.name}: {entry.value}%
          </p>
        ))}
      </div>
    );
  }

  /** Expandable per-goal weight breakdown, rendered as an extra <tr> below the initiative row. */
  function WeightBreakdownPanel({ breakdown, totalWeight, weightError }) {
    if (!breakdown?.length) return null;

    return (
      <tr>
        <td colSpan={6} style={{ padding: '0', borderBottom: '1px solid var(--color-bg-tertiary)' }}>
          <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--color-bg-secondary)' }}>

            {/* Weight-error banner */}
            {weightError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
                padding: '0.6rem 0.9rem',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                color: '#856404',
                fontSize: '0.85rem',
                fontWeight: '600',
              }}>
                <span>⚠️</span>
                <span>
                  Goal weights sum to <strong>{totalWeight}%</strong> — they must total exactly <strong>100%</strong>.
                  Performance score cannot be calculated until weights are corrected.
                </span>
              </div>
            )}

            {/* Formula legend */}
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: '0 0 0.75rem 0', fontStyle: 'italic' }}>
              Performance % = Σ (Current ÷ Target) × Weight &nbsp;|&nbsp; Weights must sum to 100%
            </p>

            {/* Goals breakdown table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ color: 'var(--color-text-secondary)', fontWeight: '700' }}>
                  {['Goal', 'Current', 'Target', 'Weight', 'Progress', 'Contribution'].map((h, i) => (
                    <th key={h} style={{
                      padding: '0.4rem 0.6rem',
                      textAlign: i >= 1 ? 'center' : 'left',
                      borderBottom: '1px solid var(--color-bg-tertiary)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {breakdown.map((g, idx) => {
                  const pct = g.score ?? 0; // server-computed score, already 0-100
                  const contrib = (g.contribution * 100).toFixed(2);
                  return (
                    <tr key={g.goal_id ?? idx} style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                      <td style={{ padding: '0.5rem 0.6rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                        {g.goal_name ?? `Goal ${idx + 1}`}
                      </td>
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>{g.current_value ?? 0}</td>
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>{g.target_value ?? 0}</td>

                      {/* Weight — displayed as %, stored/calculated as decimal */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          backgroundColor: weightError ? '#fff3cd' : '#e8f5e9',
                          color: weightError ? '#856404' : '#2e7d32',
                          fontWeight: '700',
                        }}>
                          {g.displayWeight}%
                        </span>
                      </td>

                      {/* Progress bar */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', minWidth: '120px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', backgroundColor: getScoreColor(pct), borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--color-text-secondary)', minWidth: '36px' }}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>

                      {/* Weighted contribution */}
                      <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', fontWeight: '700', color: weightError ? 'var(--color-text-secondary)' : getScoreColor(parseFloat(contrib)) }}>
                        {weightError ? '—' : `${contrib}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Weight total footer */}
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--color-bg-tertiary)', fontWeight: '700' }}>
                  <td style={{ padding: '0.5rem 0.6rem', color: 'var(--color-text-secondary)' }} colSpan={3}>Totals</td>
                  <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      backgroundColor: weightError ? '#ffebee' : '#e8f5e9',
                      color: weightError ? '#c62828' : '#2e7d32',
                      fontWeight: '800',
                    }}>
                      {totalWeight}%
                    </span>
                  </td>
                  <td />
                  <td style={{
                    padding: '0.5rem 0.6rem',
                    textAlign: 'center',
                    fontSize: '1rem',
                    color: weightError ? '#c62828' : getScoreColor(breakdown.reduce((s, b) => s + b.contribution, 0) * 100),
                  }}>
                    {weightError
                      ? '⚠️ Invalid'
                      : `${(breakdown.reduce((s, b) => s + b.contribution, 0) * 100).toFixed(2)}%`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </td>
      </tr>
    );
  }

  if (!user) return null;

  const sortedInitiatives = getSortedInitiatives();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <BackButton />

        <div className="asrs-card" style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            Performance — Goals
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 0 }}>
            Weighted initiative scores. Click any row to expand individual goal weights and contributions.
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '8px', color: '#c62828', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
            Loading performance data...
          </div>
        )}

        {!isLoading && (
          <>
            {/* ── Chart Section ── */}
            {initiatives.length > 0 && (
              <div className="asrs-card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: '0 0 0.25rem 0' }}>
                      Goal Progress Over Time
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                      Select an initiative to view its weighted performance history against its goal target.
                    </p>
                  </div>

                  <select
                    value={selectedInitiativeId || ''}
                    onChange={(e) => setSelectedInitiativeId(e.target.value || null)}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '8px',
                      border: '1px solid var(--color-bg-tertiary)', backgroundColor: 'white',
                      color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: '500',
                      cursor: 'pointer', minWidth: '220px', outline: 'none',
                    }}
                  >
                    <option value="">Choose an initiative...</option>
                    {initiatives.map((init) => (
                      <option key={init.initiative_id} value={init.initiative_id}>
                        {init.initiative_name} ({init.weightError ? '⚠️ weight error' : `${init.overallScore}%`})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chart states */}
                {!selectedInitiativeId && (
                  <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '8px', border: '1px dashed var(--color-bg-tertiary)' }}>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>Select an initiative above to view its progress chart.</p>
                  </div>
                )}

                {selectedInitiativeId && chartLoading && (
                  <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>Loading chart data...</p>
                  </div>
                )}

                {selectedInitiativeId && chartError && (
                  <div style={{ padding: '0.75rem', backgroundColor: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '8px', color: '#c62828', fontSize: '0.9rem' }}>
                    {chartError}
                  </div>
                )}

                {selectedInitiativeId && !chartLoading && !chartError && chartData.length === 0 && (
                  <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '8px', border: '1px dashed var(--color-bg-tertiary)', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', fontWeight: '600', margin: 0 }}>No progress history yet</p>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: 0 }}>History is recorded each time a goal&apos;s progress is updated.</p>
                  </div>
                )}

                {selectedInitiativeId && !chartLoading && !chartError && chartData.length > 0 && (
                  <div>
                    {chartInitiative && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                          {chartInitiative.initiative_name}
                        </span>
                        {(() => {
                          const cur = chartData[chartData.length - 1]['Current Performance'];
                          return (
                            <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', backgroundColor: getScoreColor(cur) + '18', color: getScoreColor(cur) }}>
                              Currently: {cur}%
                            </span>
                          );
                        })()}
                      </div>
                    )}

                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bg-tertiary)" />
                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--color-bg-tertiary)' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} tickLine={false} axisLine={{ stroke: 'var(--color-bg-tertiary)' }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '0.85rem', paddingTop: '0.5rem' }} />
                        <Line type="monotone" dataKey="Goal Target" stroke="#27AE60" strokeWidth={2} strokeDasharray="8 4" dot={false} activeDot={false} />
                        <Line type="monotone" dataKey="Current Performance" stroke="#C0392B" strokeWidth={3}
                          dot={{ r: 5, fill: '#C0392B', stroke: 'white', strokeWidth: 2 }}
                          activeDot={{ r: 7, fill: '#C0392B', stroke: 'white', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>

                    <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '24px', height: '3px', backgroundColor: '#C0392B', borderRadius: '2px' }} />
                        <span>Weighted score across all goals</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '24px', height: '3px', backgroundColor: '#27AE60', borderRadius: '2px', backgroundImage: 'repeating-linear-gradient(90deg, #27AE60 0px, #27AE60 6px, transparent 6px, transparent 10px)' }} />
                        <span>Target (100%)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Summary Stats ── */}
            {initiatives.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  {
                    label: 'Average Score',
                    value: `${(initiatives.reduce((s, i) => s + i.overallScore, 0) / initiatives.length).toFixed(2)}%`,
                    color: getScoreColor(initiatives.reduce((s, i) => s + i.overallScore, 0) / initiatives.length),
                  },
                  {
                    label: 'Highest Score',
                    value: `${Math.max(...initiatives.map((i) => i.overallScore))}%`,
                    color: getScoreColor(Math.max(...initiatives.map((i) => i.overallScore))),
                  },
                  {
                    label: 'Lowest Score',
                    value: `${Math.min(...initiatives.map((i) => i.overallScore))}%`,
                    color: getScoreColor(Math.min(...initiatives.map((i) => i.overallScore))),
                  },
                  {
                    label: 'Total Goals',
                    value: initiatives.reduce((s, i) => s + i.goalsCount, 0),
                    color: 'var(--color-text-primary)',
                  },
                  {
                    label: 'Weight Errors',
                    value: initiatives.filter((i) => i.weightError).length,
                    color: initiatives.filter((i) => i.weightError).length ? '#C0392B' : '#27AE60',
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} className="asrs-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>{label}</div>
                    <div style={{ fontSize: '2rem', fontWeight: '800', color }}>{value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Sort Controls ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>
                Total Initiatives: <strong>{initiatives.length}</strong>
                <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  Click a row to expand goal weights
                </span>
              </div>
              <button onClick={toggleSortOrder} className="asrs-btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Sort: {sortOrder === 'ascending' ? '↑ Ascending Score' : sortOrder === 'descending' ? '↓ Descending Score' : '⏰ Upcoming Deadline'}
              </button>
            </div>

            {/* ── Table ── */}
            {initiatives.length === 0 ? (
              <div className="asrs-card" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
                No initiatives found. Create initiatives to see performance data.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '2px solid var(--color-bg-tertiary)' }}>
                      {['Initiative Name', 'Description', 'Goals', 'Overall Score', 'Nearest Deadline', 'Progress'].map((h, i) => (
                        <th key={h} style={{ padding: '1rem', textAlign: i >= 2 ? 'center' : 'left', fontWeight: '700', color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                    {sortedInitiatives.map((initiative, index) => {
                      const sid = String(initiative.initiative_id);
                      const isExpanded = expandedId === sid;

                      return (
                        <tbody key={initiative.initiative_id}>
                          <tr
                            style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--color-bg-tertiary)', backgroundColor: index % 2 === 0 ? 'white' : 'var(--color-bg-secondary)', transition: 'background-color 0.2s ease', cursor: 'pointer' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : 'var(--color-bg-secondary)')}
                            onClick={() => handleRowClick(initiative)}
                          >
                            <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
                              <span style={{ marginRight: '0.4rem', fontSize: '0.7rem', display: 'inline-block', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                              {initiative.initiative_name}
                              {String(initiative.initiative_id) === selectedInitiativeId && (
                                <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', fontWeight: '500' }}>
                                  viewing chart
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {initiative.description || '—'}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-primary)', fontSize: '0.9rem', fontWeight: '600' }}>
                              {initiative.goalsCount}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              {initiative.weightError ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', borderRadius: '8px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', fontSize: '0.85rem', fontWeight: '700', color: '#856404' }}>
                                  <span>⚠️</span>
                                  <span>Weight Error<br /><span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{initiative.totalWeight}% ≠ 100%</span></span>
                                </div>
                              ) : (
                                <div style={{ display: 'inline-block', minWidth: '80px', padding: '0.5rem 0.75rem', borderRadius: '8px', backgroundColor: getScoreColor(initiative.overallScore) + '18', fontSize: '1.1rem', fontWeight: '800', color: getScoreColor(initiative.overallScore) }}>
                                  {initiative.overallScore}%
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>
                              {initiative.nearestDeadline ? (
                                <div>
                                  <div style={{ fontWeight: '600' }}>{new Date(initiative.nearestDeadline).toLocaleDateString()}</div>
                                  <div style={{ fontSize: '0.8rem', color: initiative.daysUntilNearest <= 7 ? '#C0392B' : initiative.daysUntilNearest <= 30 ? '#F39C12' : '#27AE60' }}>
                                    {initiative.daysUntilNearest <= 0 ? 'Overdue' : initiative.daysUntilNearest === 1 ? 'Tomorrow' : `${initiative.daysUntilNearest} days`}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--color-text-light)' }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <div style={{ width: '100%', minWidth: '150px', height: '8px', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(initiative.overallScore, 100)}%`, height: '100%', backgroundColor: initiative.weightError ? '#ffc107' : getScoreColor(initiative.overallScore), borderRadius: '4px', transition: 'width 0.5s ease' }} />
                              </div>
                            </td>
                          </tr>

                          {/* Expanded weight breakdown panel */}
                          {isExpanded && (
                            <WeightBreakdownPanel
                              breakdown={initiative.breakdown}
                              totalWeight={initiative.totalWeight}
                              weightError={initiative.weightError}
                            />
                          )}
                        </tbody>
                      );
                    })}
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}