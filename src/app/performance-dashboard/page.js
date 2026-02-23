'use client';

import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PerformanceDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [initiatives, setInitiatives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('descending'); // 'ascending', 'descending', or 'deadline'

  // Check admin access
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(storedUser);
    if (parsed.user_type !== 'admin') {
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

  async function fetchInitiativesWithScores() {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all initiatives
      const initiativesRes = await fetch('/api/goals/initiatives');
      if (!initiativesRes.ok) throw new Error('Failed to fetch initiatives');
      const initiativesData = await initiativesRes.json();
      const allInitiatives = initiativesData.initiatives || [];

      // Fetch overall score and deadlines for each initiative
      const initiativesWithScores = await Promise.all(
        allInitiatives.map(async (init) => {
          try {
            const goalsRes = await fetch(`/api/goals?initiativeId=${init.initiative_id}`);
            if (goalsRes.ok) {
              const goalsData = await goalsRes.json();
              const goals = goalsData.goals || [];
              
              // Find the nearest upcoming deadline
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

  function getScoreColor(score) {
    if (score >= 80) return '#27AE60'; // Green
    if (score >= 50) return '#F39C12'; // Orange
    return '#C0392B'; // Red
  }

  function getSortedInitiatives() {
    const sorted = [...initiatives].sort((a, b) => {
      if (sortOrder === 'ascending') {
        return a.overallScore - b.overallScore;
      } else if (sortOrder === 'descending') {
        return b.overallScore - a.overallScore;
      } else if (sortOrder === 'deadline') {
        // Sort by days until nearest deadline (ascending - upcoming deadlines first)
        // Initiatives without deadlines go to the end
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
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : 'var(--color-bg-secondary)'}
                      >
                        {/* Initiative Name */}
                        <td style={{
                          padding: '1rem',
                          fontWeight: '600',
                          color: 'var(--color-text-primary)',
                          fontSize: '0.95rem',
                        }}>
                          {initiative.initiative_name}
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

            {/* Summary Stats */}
            {initiatives.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginTop: '2rem',
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
          </>
        )}
      </main>
    </div>
  );
}
