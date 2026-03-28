'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import ReportDashboard from '@/components/ReportDashboard';
import { normalizeSnapshot } from '@/lib/report-snapshot';

export default function HistoricalReportsPage() {
  const [userRole, setUserRole] = useState('public');
  const [authChecked, setAuthChecked] = useState(false);

  const [reports, setReports] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInitiativeId, setSelectedInitiativeId] = useState('');

  // Comparison
  const [selectedIds, setSelectedIds] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  // Auth check
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUserRole(parsed.user_type || 'public');
      } catch {
        setUserRole('public');
      }
    } else {
      setUserRole('public');
    }
    setAuthChecked(true);
  }, []);

  // Load initiatives on mount
  useEffect(() => {
    async function loadInitiatives() {
      try {
        const res = await fetch('/api/initiatives');
        const data = await res.json();
        setInitiatives(data.initiatives || []);
      } catch {
        setInitiatives([]);
      }
    }
    loadInitiatives();
  }, []);

  // Fetch reports whenever filters change
  useEffect(() => {
    if (!authChecked || (userRole !== 'staff' && userRole !== 'admin')) return;
    fetchReports();
  }, [authChecked, userRole, startDate, endDate, selectedInitiativeId]);

  async function fetchReports() {
    setIsLoading(true);
    setShowComparison(false);
    setSelectedIds([]);
    try {
      const params = new URLSearchParams();
      if (selectedInitiativeId) params.set('initiativeId', selectedInitiativeId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const qs = params.toString();
      const res = await fetch(`/api/reports${qs ? '?' + qs : ''}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCheckbox(reportId) {
    setSelectedIds((prev) => {
      if (prev.includes(reportId)) {
        return prev.filter((id) => id !== reportId);
      }
      if (prev.length >= 2) return prev;
      return [...prev, reportId];
    });
    setShowComparison(false);
  }

  function handleCompare() {
    if (selectedIds.length === 2) {
      setShowComparison(true);
    }
  }

  function handleClearFilters() {
    setStartDate('');
    setEndDate('');
    setSelectedInitiativeId('');
  }

  function downloadCsv(report) {
    let parsed = null;
    try {
      parsed = typeof report.report_data === 'string'
        ? JSON.parse(report.report_data)
        : report.report_data;
    } catch {
      parsed = null;
    }

    const normalized = normalizeSnapshot(parsed);
    const rows = normalized?.results?.filteredTableData || [];
    if (rows.length === 0) {
      alert('No table data available to export.');
      return;
    }

    const columns = Object.keys(rows[0]);
    const csvLines = [
      columns.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','),
      ...rows.map((row) =>
        columns.map((c) => {
          const val = row[c] == null ? '' : String(row[c]);
          return `"${val.replace(/"/g, '""')}"`;
        }).join(',')
      ),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${(report.name || 'report').replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '\u2014';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function parseReportForDashboard(report) {
    let parsed = null;
    try {
      parsed = typeof report.report_data === 'string'
        ? JSON.parse(report.report_data)
        : report.report_data;
    } catch {
      parsed = null;
    }

    const normalized = normalizeSnapshot(parsed);
    if (!normalized) return { reportData: null, trendData: [], initiative: null };

    const results = normalized.results;
    return {
      reportData: {
        reportId: results.reportId,
        initiativeId: normalized.config.initiativeId,
        initiativeName: results.initiativeName,
        generatedDate: results.generatedDate,
        summary: results.summary,
        chartData: results.chartData,
        tableData: results.filteredTableData,
        explainability: results.explainability,
      },
      trendData: results.trendData || [],
      initiative: {
        id: normalized.config.initiativeId,
        name: results.initiativeName,
      },
    };
  }

  const statusBadgeStyle = (status) => {
    const colors = {
      completed: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
      generating: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
      failed: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
    };
    const c = colors[status] || colors.completed;
    return {
      display: 'inline-block',
      padding: '0.2rem 0.65rem',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      backgroundColor: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
    };
  };

  // ── Access denied for public users ──
  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
        <Header />
        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
          <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: '2rem' }}>
            Loading...
          </p>
        </main>
      </div>
    );
  }

  if (authChecked && userRole !== 'staff' && userRole !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
        <Header />
        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
          <BackButton />
          <div className="asrs-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-asrs-dark)' }}>
              Access Denied
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>
              You do not have permission to view historical reports. Please contact an administrator.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const comparedReports = showComparison
    ? selectedIds.map((id) => reports.find((r) => r.id === id)).filter(Boolean)
    : [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <BackButton />

        <div className="asrs-card">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Historical Reports
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Browse, filter, compare, and download previously generated reports.
          </p>

          {/* ── Filter Bar ── */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--color-bg-tertiary)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '0.5rem 0.65rem',
                  fontSize: '0.9rem',
                  borderRadius: '6px',
                  border: '1px solid var(--color-bg-tertiary)',
                  backgroundColor: 'var(--color-bg-primary)',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '0.5rem 0.65rem',
                  fontSize: '0.9rem',
                  borderRadius: '6px',
                  border: '1px solid var(--color-bg-tertiary)',
                  backgroundColor: 'var(--color-bg-primary)',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Initiative
              </label>
              <select
                value={selectedInitiativeId}
                onChange={(e) => setSelectedInitiativeId(e.target.value)}
                style={{
                  padding: '0.5rem 0.65rem',
                  fontSize: '0.9rem',
                  borderRadius: '6px',
                  border: '1px solid var(--color-bg-tertiary)',
                  backgroundColor: 'var(--color-bg-primary)',
                  minWidth: '180px',
                }}
              >
                <option value="">All Initiatives</option>
                {initiatives.map((init) => (
                  <option key={init.id} value={init.id}>
                    {init.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleClearFilters}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 500,
                borderRadius: '6px',
                border: '1px solid var(--color-bg-tertiary)',
                backgroundColor: 'var(--color-bg-primary)',
                cursor: 'pointer',
                alignSelf: 'flex-end',
              }}
            >
              Clear Filters
            </button>
          </div>

          {/* ── Compare Button ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <button
              onClick={handleCompare}
              disabled={selectedIds.length !== 2}
              style={{
                padding: '0.6rem 1.5rem',
                backgroundColor: selectedIds.length === 2 ? 'var(--color-asrs-orange)' : 'var(--color-bg-tertiary)',
                color: selectedIds.length === 2 ? '#fff' : 'var(--color-text-light)',
                borderRadius: '8px',
                fontWeight: 600,
                border: 'none',
                cursor: selectedIds.length === 2 ? 'pointer' : 'not-allowed',
                fontSize: '0.9rem',
              }}
            >
              Compare Selected ({selectedIds.length}/2)
            </button>
            {selectedIds.length > 0 && (
              <button
                onClick={() => { setSelectedIds([]); setShowComparison(false); }}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  border: '1px solid var(--color-bg-tertiary)',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Clear Selection
              </button>
            )}
          </div>

          {/* ── Reports Table ── */}
          {isLoading ? (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              padding: '3rem', color: 'var(--color-text-light)',
            }}>
              <div style={{
                width: '36px', height: '36px', border: '4px solid var(--color-bg-tertiary)',
                borderTop: '4px solid var(--color-asrs-orange)',
                borderRadius: '50%', animation: 'spin 1s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <span style={{ marginLeft: '1rem', fontSize: '1rem' }}>Loading reports...</span>
            </div>
          ) : reports.length === 0 ? (
            <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: '2rem' }}>
              No reports found matching your filters.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-bg-tertiary)' }}>
                    {['', 'Report Name', 'Initiative', 'Created Date', 'Created By', 'Status', ''].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          textAlign: 'left',
                          padding: '0.6rem 0.75rem',
                          fontWeight: '600',
                          color: 'var(--color-text-secondary)',
                          fontSize: '0.8rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => {
                    const isChecked = selectedIds.includes(r.id);
                    const isDisabled = !isChecked && selectedIds.length >= 2;
                    return (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: '1px solid var(--color-bg-tertiary)',
                          backgroundColor: isChecked ? 'rgba(249, 115, 22, 0.06)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '0.65rem 0.75rem', width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => handleCheckbox(r.id)}
                            style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: '500' }}>
                          {r.name || '(Untitled)'}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                          {r.initiative_name || '\u2014'}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                          {formatDate(r.created_at)}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                          {r.created_by || '\u2014'}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <span style={statusBadgeStyle(r.status)}>
                            {r.status || 'completed'}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <button
                            onClick={() => downloadCsv(r)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                              borderRadius: '6px',
                              border: '1px solid var(--color-bg-tertiary)',
                              backgroundColor: 'var(--color-bg-primary)',
                              cursor: 'pointer',
                            }}
                          >
                            CSV
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Side-by-Side Comparison ── */}
        {showComparison && comparedReports.length === 2 && (
          <div className="asrs-card" style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-asrs-dark)' }}>
              Report Comparison
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
            }}>
              {comparedReports.map((report) => {
                const { reportData, trendData, initiative } = parseReportForDashboard(report);
                return (
                  <div key={report.id} style={{
                    border: '1px solid var(--color-bg-tertiary)',
                    borderRadius: '10px',
                    padding: '1rem',
                    overflow: 'hidden',
                  }}>
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                      color: 'var(--color-asrs-dark)',
                      borderBottom: '2px solid var(--color-asrs-orange)',
                      paddingBottom: '0.5rem',
                    }}>
                      {report.name || '(Untitled)'}
                      <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>
                        {formatDate(report.created_at)}
                      </span>
                    </h3>
                    {reportData ? (
                      <ReportDashboard
                        reportData={reportData}
                        trendData={trendData}
                        selectedInitiative={initiative}
                        userRole={userRole}
                      />
                    ) : (
                      <p style={{ color: 'var(--color-text-light)', padding: '1rem', textAlign: 'center' }}>
                        No report data available.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
