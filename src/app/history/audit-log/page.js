'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import { apiFetch } from '@/lib/api/client';

// ── Friendly labels for event names ──
const EVENT_LABELS = {
  'goal.created': 'Goal Created',
  'goal.updated': 'Goal Updated',
  'goal.deleted': 'Goal Deleted',
  'initiative.created': 'Initiative Created',
  'initiative.updated': 'Initiative Updated',
  'initiative.deleted': 'Initiative Deleted',
  'report.generated': 'Report Generated',
  'report.deleted': 'Report Deleted',
  'survey.created': 'Survey Created',
  'survey.published': 'Survey Published',
  'survey.updated': 'Survey Updated',
  'performance.updated': 'Performance Updated',
  'user.role_changed': 'User Role Changed',
  'user.created': 'User Created',
  'user.deleted': 'User Deleted',
};

function friendlyEvent(event) {
  return EVENT_LABELS[event] || event;
}

// ── Badge colors by action type ──
function getActionColor(event) {
  if (event.endsWith('.created')) return { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' };
  if (event.endsWith('.updated')) return { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' };
  if (event.endsWith('.deleted')) return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
  if (event.endsWith('.generated')) return { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' };
  if (event.endsWith('.published')) return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
  return { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
}

function ActionBadge({ event }) {
  const c = getActionColor(event);
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.2rem 0.65rem',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: '600',
      letterSpacing: '0.02em',
      backgroundColor: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      {friendlyEvent(event)}
    </span>
  );
}

function PayloadViewer({ payload }) {
  if (!payload) return <span style={{ color: 'var(--color-text-light)' }}>—</span>;

  let parsed;
  try {
    parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  } catch {
    return <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{String(payload)}</span>;
  }

  // If there's a changes object (from updates), render a diff view
  if (parsed.changes && typeof parsed.changes === 'object') {
    const changeEntries = Object.entries(parsed.changes);
    if (changeEntries.length === 0) {
      return <span style={{ color: 'var(--color-text-light)', fontSize: '0.8rem' }}>No field changes</span>;
    }

    return (
      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {parsed.goal_name && (
          <div style={{ color: 'var(--color-text-secondary)', marginBottom: '0.15rem' }}>
            {parsed.goal_name}
          </div>
        )}
        {changeEntries.map(([field, diff]) => (
          <div key={field} style={{ display: 'flex', gap: '0.4rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {field.replace(/_/g, ' ')}:
            </span>
            <span style={{ color: '#991b1b', textDecoration: 'line-through' }}>
              {String(diff.from ?? '—')}
            </span>
            <span style={{ color: 'var(--color-text-light)' }}>→</span>
            <span style={{ color: '#065f46', fontWeight: 500 }}>
              {String(diff.to ?? '—')}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // For creates / deletes, show a compact summary
  const entries = Object.entries(parsed).filter(([k]) => k !== 'changes');
  if (entries.length === 0) return <span style={{ color: 'var(--color-text-light)' }}>—</span>;

  return (
    <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      {entries.map(([key, val]) => (
        <div key={key} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {key.replace(/_/g, ' ')}:
          </span>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AuditLogPage() {
  const [userRole, setUserRole] = useState('public');
  const [authChecked, setAuthChecked] = useState(false);

  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Expanded rows
  const [expandedIds, setExpandedIds] = useState(new Set());

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

  const fetchEntries = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '50');
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity', entityFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (search) params.set('search', search);

      const res = await apiFetch(`/api/audit-log?${params.toString()}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('Failed to fetch audit log:', err);
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, entityFilter, startDate, endDate, search]);

  useEffect(() => {
    if (!authChecked || userRole !== 'admin') return;
    fetchEntries(1);
  }, [authChecked, userRole, fetchEntries]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setSearch(searchInput);
  }

  function handleClearFilters() {
    setActionFilter('');
    setEntityFilter('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setSearchInput('');
  }

  function toggleExpanded(auditId) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(auditId)) next.delete(auditId);
      else next.add(auditId);
      return next;
    });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  }

  // ── Loading state ──
  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
        <Header />
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
          <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: '2rem' }}>
            Loading...
          </p>
        </main>
      </div>
    );
  }

  // ── Access denied ──
  if (authChecked && userRole !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
        <Header />
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
          <BackButton />
          <div className="asrs-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-asrs-dark)', marginBottom: '0.5rem' }}>
              Access Restricted
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              The audit log is only available to administrators.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const hasActiveFilters = actionFilter || entityFilter || startDate || endDate || search;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <BackButton />

        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-asrs-dark)', marginBottom: '0.25rem' }}>
            Audit Log
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Complete record of all system changes for compliance tracking.
          </p>
        </div>

        <div className="asrs-card" style={{ marginBottom: '1.5rem' }}>
          {/* ── Filters ── */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '0.75rem',
            alignItems: 'flex-end', marginBottom: '1rem',
          }}>
            {/* Search */}
            <div style={{ flex: '1 1 220px' }}>
              <label style={labelStyle}>Search</label>
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search events, users, reasons..."
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="submit" style={filterBtnStyle}>
                  Search
                </button>
              </form>
            </div>

            {/* Action filter — verb */}
            <div style={{ flex: '0 1 150px' }}>
              <label style={labelStyle}>Action</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="">All actions</option>
                <option value="created">Created</option>
                <option value="updated">Updated</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>

            {/* Entity filter — noun */}
            <div style={{ flex: '0 1 150px' }}>
              <label style={labelStyle}>Entity</label>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="">All entities</option>
                <option value="goal">Goal</option>
                <option value="initiative">Initiative</option>
                <option value="report">Report</option>
                <option value="survey">Survey</option>
                <option value="performance">Performance</option>
                <option value="user">User</option>
              </select>
            </div>

            {/* Date range */}
            <div style={{ flex: '0 1 150px' }}>
              <label style={labelStyle}>From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: '0 1 150px' }}>
              <label style={labelStyle}>To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            {hasActiveFilters && (
              <button onClick={handleClearFilters} style={clearBtnStyle}>
                Clear Filters
              </button>
            )}
          </div>

          {/* ── Summary ── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)',
          }}>
            <span>
              {pagination.total.toLocaleString()} {pagination.total === 1 ? 'entry' : 'entries'}
              {hasActiveFilters ? ' (filtered)' : ''}
            </span>
            {pagination.totalPages > 1 && (
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
            )}
          </div>

          {/* ── Table ── */}
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
              <span style={{ marginLeft: '1rem', fontSize: '1rem' }}>Loading audit log...</span>
            </div>
          ) : entries.length === 0 ? (
            <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: '2rem' }}>
              {hasActiveFilters
                ? 'No entries match your filters.'
                : 'No audit log entries yet. Actions will appear here as changes are made.'}
            </p>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-bg-tertiary)' }}>
                      {['Timestamp', 'Action', 'User', 'Entity', 'ID', 'Details'].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const isExpanded = expandedIds.has(entry.audit_id);
                      return (
                        <tr
                          key={entry.audit_id}
                          onClick={() => toggleExpanded(entry.audit_id)}
                          style={{
                            borderBottom: '1px solid var(--color-bg-tertiary)',
                            cursor: 'pointer',
                            backgroundColor: isExpanded ? 'rgba(249, 115, 22, 0.04)' : 'transparent',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isExpanded) e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary, #f9fafb)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>
                            {formatDate(entry.created_at)}
                          </td>
                          <td style={tdStyle}>
                            <ActionBadge event={entry.event} />
                          </td>
                          <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>
                            {entry.user_email || '—'}
                          </td>
                          <td style={{ ...tdStyle, textTransform: 'capitalize', color: 'var(--color-text-secondary)' }}>
                            {entry.target_type || '—'}
                          </td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                            {entry.target_id || '—'}
                          </td>
                          <td style={tdStyle}>
                            {isExpanded ? (
                              <PayloadViewer payload={entry.payload} />
                            ) : (
                              <span style={{ color: 'var(--color-text-light)', fontSize: '0.8rem' }}>
                                {entry.payload ? 'Click to expand' : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ── */}
              {pagination.totalPages > 1 && (
                <div style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  gap: '0.5rem', marginTop: '1.25rem',
                }}>
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchEntries(pagination.page - 1)}
                    style={{
                      ...pageBtnStyle,
                      opacity: pagination.page <= 1 ? 0.4 : 1,
                      cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ← Previous
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 4) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 3) {
                      pageNum = pagination.totalPages - 6 + i;
                    } else {
                      pageNum = pagination.page - 3 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => fetchEntries(pageNum)}
                        style={{
                          ...pageBtnStyle,
                          backgroundColor: pageNum === pagination.page ? 'var(--color-asrs-orange)' : 'var(--color-bg-primary)',
                          color: pageNum === pagination.page ? '#fff' : 'var(--color-text-secondary)',
                          fontWeight: pageNum === pagination.page ? 700 : 500,
                          minWidth: '36px',
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchEntries(pagination.page + 1)}
                    style={{
                      ...pageBtnStyle,
                      opacity: pagination.page >= pagination.totalPages ? 0.4 : 1,
                      cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Shared styles ──
const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  marginBottom: '0.25rem',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
};

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  fontSize: '0.85rem',
  borderRadius: '6px',
  border: '1px solid var(--color-bg-tertiary)',
  backgroundColor: 'var(--color-bg-primary)',
  color: 'var(--color-text-primary)',
  boxSizing: 'border-box',
};

const filterBtnStyle = {
  padding: '0.5rem 1rem',
  fontSize: '0.85rem',
  fontWeight: 600,
  borderRadius: '6px',
  border: '1px solid var(--color-asrs-orange)',
  backgroundColor: 'var(--color-asrs-orange)',
  color: '#fff',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const clearBtnStyle = {
  padding: '0.5rem 1rem',
  fontSize: '0.85rem',
  fontWeight: 500,
  borderRadius: '6px',
  border: '1px solid var(--color-bg-tertiary)',
  backgroundColor: 'var(--color-bg-primary)',
  cursor: 'pointer',
  alignSelf: 'flex-end',
};

const thStyle = {
  textAlign: 'left',
  padding: '0.6rem 0.75rem',
  fontWeight: '600',
  color: 'var(--color-text-secondary)',
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
};

const tdStyle = {
  padding: '0.65rem 0.75rem',
  verticalAlign: 'top',
};

const pageBtnStyle = {
  padding: '0.4rem 0.75rem',
  fontSize: '0.83rem',
  fontWeight: 500,
  borderRadius: '6px',
  border: '1px solid var(--color-bg-tertiary)',
  backgroundColor: 'var(--color-bg-primary)',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
};
