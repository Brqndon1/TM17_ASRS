'use client';

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
  ReferenceLine,
} from 'recharts';

export default function PerformanceDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [initiatives, setInitiatives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('descending');

  // Chart state
  const [selectedInitiativeId, setSelectedInitiativeId] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartInitiative, setChartInitiative] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);

  // Check admin access
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(storedUser);
    if (parsed.user_type !== 'admin' && parsed.user_type !== 'staff') {
      router.push('/');
      return;
    }
    setUser(parsed);
  }, [router]);

  // Fetch initiatives and their overall scores
  useEffect(() => {
    if (user) {
      fetchInitiativesWithScores();
    }
  }, [user]);

  // Fetch chart data when an initiative is selected
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
                overallScore: goalsData.overallScore || 0,
                goalsCount: goals.length,
                nearestDeadline,
                daysUntilNearest,
              };
            }
            return {
              ...init,
              overallScore: 0,
              goalsCount: 0,
              nearestDeadline: null,
              daysUntilNearest: null,
            };
          } catch (err) {
            console.error(`Error fetching goals for initiative ${init.initiative_id}:`, err);
            return {
              ...init,
              overallScore: 0,
              goalsCount: 0,
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
        const formatted = data.timeline.map((entry) => ({
          date: new Date(entry.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          rawDate: entry.date,
          'Current Performance': entry.overallScore,
          'Goal Target': entry.targetScore,
        }));
        setChartData(formatted);
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
    const sorted = [...initiatives].sort((a, b) => {
      if (sortOrder === 'ascending') {
        return a.overallScore - b.overallScore;
      } else if (sortOrder === 'descending') {
        return b.overallScore - a.overallScore;
      } else if (sortOrder === 'deadline') {
        const aDays = a.daysUntilNearest !== null ? a.daysUntilNearest : Infinity;
        const bDays = b.daysUntilNearest !== null ? b.daysUntilNearest : Infinity;
        return aDays - bDays;
      }
    });
    return sorted;
  }

  function toggleSortOrder() {
    if (sortOrder === 'ascending') {
      setSortOrder('descending');
    } else if (sortOrder === 'descending') {
      setSortOrder('deadline');
    } else {
      setSortOrder('ascending');
    }
  }

  // Custom tooltip for the chart
  function CustomTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid var(--color-bg-tertiary)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          <p style={{
            margin: '0 0 0.5rem 0',
            fontWeight: '700',
            color: 'var(--color-text-primary)',
            fontSize: '0.85rem',
          }}>
            {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{
              margin: '0.2rem 0',
              fontSize: '0.85rem',
              color: entry.color,
              fontWeight: '600',
            }}>
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
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
            Performance Scoring Dashboard
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 0 }}>
            View overall initiative scores and track performance across all initiatives.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: '#ffebee',
            border: '1px solid #ffcdd2',
            borderRadius: '8px',
            color: '#c62828',
            fontSize: '0.9rem',
          }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
            Loading performance data...
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && (
          <>
            {/* ===== PERFORMANCE CHART SECTION ===== */}
            {initiatives.length > 0 && (
              <div className="asrs-card" style={{ marginBottom: '2rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}>
                  <div>
                    <h2 style={{
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: 'var(--color-text-primary)',
                      margin: '0 0 0.25rem 0',
                    }}>
                      Goal Progress Over Time
                    </h2>
                    <p style={{
                      fontSize: '0.85rem',
                      color: 'var(--color-text-secondary)',
                      margin: 0,
                    }}>
                      Select an initiative to view its performance history against its goal target.
                    </p>
                  </div>

                  {/* Initiative Selector */}
                  <select
                    value={selectedInitiativeId || ''}
                    onChange={(e) => setSelectedInitiativeId(e.target.value || null)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-bg-tertiary)',
                      backgroundColor: 'white',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      minWidth: '220px',
                      outline: 'none',
                    }}
                  >
                    <option value="">Choose an initiative...</option>
                    {initiatives.map((init) => (
                      <option key={init.initiative_id} value={init.initiative_id}>
                        {init.initiative_name} ({init.overallScore}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chart Area */}
                {!selectedInitiativeId && (
                  <div style={{
                    height: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: '8px',
                    border: '1px dashed var(--color-bg-tertiary)',
                  }}>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                      Select an initiative above to view its progress chart.
                    </p>
                  </div>
                )}

                {selectedInitiativeId && chartLoading && (
                  <div style={{
                    height: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                      Loading chart data...
                    </p>
                  </div>
                )}

                {selectedInitiativeId && chartError && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#ffebee',
                    border: '1px solid #ffcdd2',
                    borderRadius: '8px',
                    color: '#c62828',
                    fontSize: '0.9rem',
                  }}>
                    {chartError}
                  </div>
                )}

                {selectedInitiativeId && !chartLoading && !chartError && chartData.length === 0 && (
                  <div style={{
                    height: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: '8px',
                    border: '1px dashed var(--color-bg-tertiary)',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', fontWeight: '600', margin: 0 }}>
                      No progress history yet
                    </p>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                      History is recorded each time a goal&apos;s progress is updated.
                    </p>
                  </div>
                )}

                {selectedInitiativeId && !chartLoading && !chartError && chartData.length > 0 && (
                  <div>
                    {/* Initiative name + current score badge */}
                    {chartInitiative && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '1rem',
                      }}>
                        <span style={{
                          fontSize: '1rem',
                          fontWeight: '700',
                          color: 'var(--color-text-primary)',
                        }}>
                          {chartInitiative.initiative_name}
                        </span>
                        {(() => {
                          const currentScore = chartData[chartData.length - 1]['Current Performance'];
                          return (
                            <span style={{
                              padding: '0.25rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              backgroundColor: getScoreColor(currentScore) + '18',
                              color: getScoreColor(currentScore),
                            }}>
                              Currently: {currentScore}%
                            </span>
                          );
                        })()}
                      </div>
                    )}

                    {/* The Line Chart */}
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bg-tertiary)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                          tickLine={false}
                          axisLine={{ stroke: 'var(--color-bg-tertiary)' }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                          tickLine={false}
                          axisLine={{ stroke: 'var(--color-bg-tertiary)' }}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: '0.85rem', paddingTop: '0.5rem' }}
                        />
                        {/* Goal Target line (green, dashed) */}
                        <Line
                          type="monotone"
                          dataKey="Goal Target"
                          stroke="#27AE60"
                          strokeWidth={2}
                          strokeDasharray="8 4"
                          dot={false}
                          activeDot={false}
                        />
                        {/* Current Performance line (red, solid) */}
                        <Line
                          type="monotone"
                          dataKey="Current Performance"
                          stroke="#C0392B"
                          strokeWidth={3}
                          dot={{
                            r: 5,
                            fill: '#C0392B',
                            stroke: 'white',
                            strokeWidth: 2,
                          }}
                          activeDot={{
                            r: 7,
                            fill: '#C0392B',
                            stroke: 'white',
                            strokeWidth: 2,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>

                    {/* Legend explanation */}
                    <div style={{
                      display: 'flex',
                      gap: '1.5rem',
                      justifyContent: 'center',
                      marginTop: '0.75rem',
                      fontSize: '0.8rem',
                      color: 'var(--color-text-secondary)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{
                          width: '24px',
                          height: '3px',
                          backgroundColor: '#C0392B',
                          borderRadius: '2px',
                        }} />
                        <span>Actual weighted score across all goals</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{
                          width: '24px',
                          height: '3px',
                          backgroundColor: '#27AE60',
                          borderRadius: '2px',
                          backgroundImage: 'repeating-linear-gradient(90deg, #27AE60 0px, #27AE60 6px, transparent 6px, transparent 10px)',
                        }} />
                        <span>Target (100%)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== SUMMARY STATS (moved above table) ===== */}
            {initiatives.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
              }}>
                <div className="asrs-card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                    Average Score
                  </div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: '800',
                    color: getScoreColor(
                      initiatives.reduce((sum, init) => sum + init.overallScore, 0) / initiatives.length
                    ),
                  }}>
                    {(initiatives.reduce((sum, init) => sum + init.overallScore, 0) / initiatives.length).toFixed(2)}%
                  </div>
                </div>

                <div className="asrs-card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                    Highest Score
                  </div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: '800',
                    color: getScoreColor(Math.max(...initiatives.map(i => i.overallScore))),
                  }}>
                    {Math.max(...initiatives.map(i => i.overallScore))}%
                  </div>
                </div>

                <div className="asrs-card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                    Lowest Score
                  </div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: '800',
                    color: getScoreColor(Math.min(...initiatives.map(i => i.overallScore))),
                  }}>
                    {Math.min(...initiatives.map(i => i.overallScore))}%
                  </div>
                </div>

                <div className="asrs-card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                    Total Goals
                  </div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: '800',
                    color: 'var(--color-text-primary)',
                  }}>
                    {initiatives.reduce((sum, init) => sum + init.goalsCount, 0)}
                  </div>
                </div>
              </div>
            )}

            {/* Sort Controls */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              <div style={{
                fontSize: '0.95rem',
                color: 'var(--color-text-secondary)',
              }}>
                Total Initiatives: <strong>{initiatives.length}</strong>
              </div>
              <button
                onClick={toggleSortOrder}
                className="asrs-btn-primary"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>
                  Sort: {
                    sortOrder === 'ascending' ? '↑ Ascending Score' :
                    sortOrder === 'descending' ? '↓ Descending Score' :
                    '⏰ Upcoming Deadline'
                  }
                </span>
              </button>
            </div>

            {/* Performance Table */}
            {initiatives.length === 0 ? (
              <div className="asrs-card" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem' }}>
                No initiatives found. Create initiatives to see performance data.
              </div>
            ) : (
              <div style={{
                overflowX: 'auto',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  backgroundColor: 'white',
                }}>
                  <thead>
                    <tr style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderBottom: '2px solid var(--color-bg-tertiary)',
                    }}>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'left',
                        fontWeight: '700',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.95rem',
                      }}>
                        Initiative Name
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'left',
                        fontWeight: '700',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.95rem',
                      }}>
                        Description
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontWeight: '700',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.95rem',
                      }}>
                        Goals
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontWeight: '700',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.95rem',
                      }}>
                        Overall Score
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontWeight: '700',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.95rem',
                      }}>
                        Nearest Deadline
                      </th>
                      <th style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontWeight: '700',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.95rem',
                      }}>
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInitiatives.map((initiative, index) => (
                      <tr
                        key={initiative.initiative_id}
                        style={{
                          borderBottom: '1px solid var(--color-bg-tertiary)',
                          backgroundColor: index % 2 === 0 ? 'white' : 'var(--color-bg-secondary)',
                          transition: 'background-color 0.2s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : 'var(--color-bg-secondary)'}
                        onClick={() => setSelectedInitiativeId(String(initiative.initiative_id))}
                      >
                        {/* Initiative Name */}
                        <td style={{
                          padding: '1rem',
                          fontWeight: '600',
                          color: 'var(--color-text-primary)',
                          fontSize: '0.95rem',
                        }}>
                          {initiative.initiative_name}
                          {String(initiative.initiative_id) === selectedInitiativeId && (
                            <span style={{
                              marginLeft: '0.5rem',
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor: 'var(--color-bg-tertiary)',
                              color: 'var(--color-text-secondary)',
                              fontWeight: '500',
                            }}>
                              viewing chart
                            </span>
                          )}
                        </td>

                        {/* Description */}
                        <td style={{
                          padding: '1rem',
                          color: 'var(--color-text-secondary)',
                          fontSize: '0.9rem',
                          maxWidth: '300px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {initiative.description || '—'}
                        </td>

                        {/* Goals Count */}
                        <td style={{
                          padding: '1rem',
                          textAlign: 'center',
                          color: 'var(--color-text-primary)',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                        }}>
                          {initiative.goalsCount}
                        </td>

                        {/* Overall Score */}
                        <td style={{
                          padding: '1rem',
                          textAlign: 'center',
                        }}>
                          <div style={{
                            display: 'inline-block',
                            minWidth: '80px',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            backgroundColor: getScoreColor(initiative.overallScore) + '18',
                            fontSize: '1.1rem',
                            fontWeight: '800',
                            color: getScoreColor(initiative.overallScore),
                          }}>
                            {initiative.overallScore}%
                          </div>
                        </td>

                        {/* Nearest Deadline */}
                        <td style={{
                          padding: '1rem',
                          textAlign: 'center',
                          color: 'var(--color-text-primary)',
                          fontSize: '0.9rem',
                        }}>
                          {initiative.nearestDeadline ? (
                            <div>
                              <div style={{ fontWeight: '600' }}>
                                {new Date(initiative.nearestDeadline).toLocaleDateString()}
                              </div>
                              <div style={{
                                fontSize: '0.8rem',
                                color: initiative.daysUntilNearest <= 7 ? '#C0392B' :
                                       initiative.daysUntilNearest <= 30 ? '#F39C12' : '#27AE60',
                              }}>
                                {initiative.daysUntilNearest <= 0 ? 'Overdue' :
                                 initiative.daysUntilNearest === 1 ? 'Tomorrow' :
                                 `${initiative.daysUntilNearest} days`}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-light)' }}>—</span>
                          )}
                        </td>

                        {/* Progress Bar */}
                        <td style={{
                          padding: '1rem',
                          textAlign: 'center',
                        }}>
                          <div style={{
                            width: '100%',
                            minWidth: '150px',
                            height: '8px',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${Math.min(initiative.overallScore, 100)}%`,
                              height: '100%',
                              backgroundColor: getScoreColor(initiative.overallScore),
                              borderRadius: '4px',
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                        </td>
                      </tr>
                    ))}
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
