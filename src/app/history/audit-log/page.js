'use client';

import { useEffect, useState, useCallback } from 'react';
import PageLayout from '@/components/PageLayout';
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

// ── Timeline dot color ──
function getDotColor(event) {
  if (event.endsWith('.created')) return '#10B981'; // green
  if (event.endsWith('.updated')) return '#E67E22';  // orange
  if (event.endsWith('.deleted')) return '#EF4444'; // red
  if (event === 'user.login' || event.startsWith('auth.')) return '#3B82F6'; // blue
  return '#9CA3AF';
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
  if (!payload) return <span style={{ color: '#9CA3AF' }}>—</span>;

  let parsed;
  try {
    parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  } catch {
    return <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>{String(payload)}</span>;
  }

  // If there's a changes object (from updates), render a diff view
  if (parsed.changes && typeof parsed.changes === 'object') {
    const changeEntries = Object.entries(parsed.changes);
    if (changeEntries.length === 0) {
      return <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>No field changes</span>;
    }

    return (
      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {parsed.goal_name && (
          <div style={{ color: '#6B7280', marginBottom: '0.15rem' }}>
            {parsed.goal_name}
          </div>
        )}
        {changeEntries.map(([field, diff]) => (
          <div key={field} style={{ display: 'flex', gap: '0.4rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#1F2937' }}>
              {field.replace(/_/g, ' ')}:
            </span>
            <span style={{ color: '#991b1b', textDecoration: 'line-through' }}>
              {String(diff.from ?? '—')}
            </span>
            <span style={{ color: '#9CA3AF' }}>→</span>
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
  if (entries.length === 0) return <span style={{ color: '#9CA3AF' }}>—</span>;

  return (
    <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      {entries.map(([key, val]) => (
        <div key={key} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: '#1F2937' }}>
            {key.replace(/_/g, ' ')}:
          </span>
          <span style={{ color: '#6B7280' }}>
            {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Filter pills config ──
const FILTER_PILLS = [
  { key: '', label: 'All' },
  { key: 'mine', label: 'My Activity' },
  { key: 'created', label: 'Creates' },
  { key: 'updated', label: 'Updates' },
  { key: 'deleted', label: 'Deletes' },
];

// ── Group entries by date label ──
function getDateLabel(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function getDateKey(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toDateString();
}

function groupByDate(entries) {
  const groups = {};
  entries.forEach((entry) => {
    const key = getDateKey(entry.created_at);
    const label = getDateLabel(entry.created_at);
    if (!groups[key]) groups[key] = { label, entries: [], sortKey: entry.created_at || '' };
    groups[key].entries.push(entry);
  });
  return Object.values(groups).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AuditLogPage() {
  const [userRole, setUserRole] = useState('public');
  const [userEmail, setUserEmail] = useState('');
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

  // Active pill: '', 'mine', 'created', 'updated', 'deleted'
  const [activePill, setActivePill] = useState('');

  // Expanded rows
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Auth check
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUserRole(parsed.user_type || 'public');
        setUserEmail(parsed.email || '');
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
      // Map pill to filter params
      const effectiveAction = activePill === 'mine' ? '' : (activePill || actionFilter);
      if (effectiveAction && effectiveAction !== 'mine') params.set('action', effectiveAction);
      if (activePill === 'mine' && userEmail) params.set('userEmail', userEmail);
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
  }, [actionFilter, entityFilter, startDate, endDate, search, activePill, userEmail]);

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
    setActivePill('');
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

  const hasActiveFilters = actionFilter || entityFilter || startDate || endDate || search || activePill;

  const dateGroups = groupByDate(entries);

  // ── Access denied ──
  if (authChecked && userRole !== 'admin') {
    return (
      <PageLayout title="Settings">
        <div style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center', padding: '3rem', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F2937', marginBottom: '0.5rem' }}>
            Access Restricted
          </h2>
          <p style={{ color: '#6B7280' }}>
            The audit log is only available to administrators.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Settings">
      <div>
        {/* Page heading + date range */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1F2937', margin: 0 }}>Activity History</h1>
            <p style={{ color: '#6B7280', fontSize: '0.88rem', marginTop: '0.25rem' }}>
              Complete record of all system changes.
            </p>
          </div>
          {/* Date range filter */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}
              />
            </div>
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setActivePill(pill.key)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '999px',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activePill === pill.key ? '#E67E22' : '#F3F4F6',
                color: activePill === pill.key ? '#fff' : '#374151',
                transition: 'background-color 0.15s ease',
              }}
            >
              {pill.label}
            </button>
          ))}

          {/* Additional filters */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search events, users..."
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', width: '200px' }}
              />
              <button
                type="submit"
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.83rem', fontWeight: 600, borderRadius: '6px', border: 'none', backgroundColor: '#E67E22', color: '#fff', cursor: 'pointer' }}
              >
                Search
              </button>
            </form>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              style={{ padding: '0.4rem 0.65rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}
            >
              <option value="">All entities</option>
              <option value="goal">Goal</option>
              <option value="initiative">Initiative</option>
              <option value="report">Report</option>
              <option value="survey">Survey</option>
              <option value="performance">Performance</option>
              <option value="user">User</option>
            </select>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.83rem', fontWeight: 500, borderRadius: '6px', border: '1px solid #E5E7EB', backgroundColor: '#fff', cursor: 'pointer', color: '#6B7280' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Summary line */}
        <div style={{ fontSize: '0.83rem', color: '#6B7280', marginBottom: '1rem' }}>
          {pagination.total.toLocaleString()} {pagination.total === 1 ? 'entry' : 'entries'}
          {hasActiveFilters ? ' (filtered)' : ''}
          {pagination.totalPages > 1 && ` — Page ${pagination.page} of ${pagination.totalPages}`}
        </div>

        {/* Activity timeline */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', color: '#9CA3AF' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTop: '3px solid #E67E22', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ marginLeft: '1rem' }}>Loading activity...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>
            {hasActiveFilters ? 'No entries match your filters.' : 'No audit log entries yet.'}
          </div>
        ) : (
          <>
            {dateGroups.map((group) => (
              <div key={group.label} style={{ marginBottom: '2rem' }}>
                {/* Date group header */}
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #E5E7EB' }}>
                  {group.label}
                </div>

                {/* Timeline entries */}
                <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                  {/* Vertical line */}
                  <div style={{ position: 'absolute', left: '7px', top: '12px', bottom: '12px', width: '2px', backgroundColor: '#E5E7EB' }} />

                  {group.entries.map((entry, idx) => {
                    const isExpanded = expandedIds.has(entry.audit_id);
                    const dotColor = getDotColor(entry.event);
                    return (
                      <div
                        key={entry.audit_id}
                        style={{ position: 'relative', marginBottom: idx < group.entries.length - 1 ? '1rem' : 0, cursor: 'pointer' }}
                        onClick={() => toggleExpanded(entry.audit_id)}
                      >
                        {/* Dot */}
                        <div style={{
                          position: 'absolute',
                          left: '-1.5rem',
                          top: '6px',
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          backgroundColor: dotColor,
                          border: '2px solid #fff',
                          boxShadow: '0 0 0 2px ' + dotColor + '33',
                        }} />

                        <div
                          style={{
                            backgroundColor: isExpanded ? 'rgba(230,126,34,0.04)' : '#fff',
                            border: `1px solid ${isExpanded ? '#E67E22' : '#E5E7EB'}`,
                            borderRadius: '8px',
                            padding: '0.75rem 1rem',
                            transition: 'box-shadow 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          {/* Top row: time + badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
                              {formatTime(entry.created_at)}
                              <span style={{ color: '#D1D5DB', margin: '0 0.35rem' }}>·</span>
                              <span style={{ color: '#9CA3AF' }}>{getRelativeTime(entry.created_at)}</span>
                            </span>
                            <ActionBadge event={entry.event} />
                          </div>

                          {/* Description */}
                          <div style={{ fontSize: '0.88rem', color: '#374151' }}>
                            <strong>{entry.user_email || 'Unknown user'}</strong>
                            {' — '}
                            <span style={{ textTransform: 'capitalize' }}>{entry.target_type || ''}</span>
                            {entry.target_id && <span style={{ color: '#9CA3AF', fontFamily: 'monospace', fontSize: '0.8rem', marginLeft: '0.35rem' }}>#{entry.target_id}</span>}
                          </div>

                          {/* Detail line / expanded payload */}
                          {isExpanded && (
                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #E5E7EB' }}>
                              <PayloadViewer payload={entry.payload} />
                            </div>
                          )}
                          {!isExpanded && entry.payload && (
                            <div style={{ fontSize: '0.78rem', color: '#D1D5DB', marginTop: '0.25rem' }}>Click to expand details</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchEntries(pagination.page - 1)}
                  style={{ ...pageBtnStyle, opacity: pagination.page <= 1 ? 0.4 : 1, cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  ← Previous
                </button>

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
                        backgroundColor: pageNum === pagination.page ? '#E67E22' : '#fff',
                        color: pageNum === pagination.page ? '#fff' : '#6B7280',
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
                  style={{ ...pageBtnStyle, opacity: pagination.page >= pagination.totalPages ? 0.4 : 1, cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}

const pageBtnStyle = {
  padding: '0.4rem 0.75rem',
  fontSize: '0.83rem',
  fontWeight: 500,
  borderRadius: '6px',
  border: '1px solid #E5E7EB',
  backgroundColor: '#fff',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
};
