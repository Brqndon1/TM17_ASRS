'use client';

import PageLayout from '@/components/PageLayout';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { apiFetch } from '@/lib/api/client';

// ── Payload helpers ───────────────────────────────────────────────────────────

function parsePayload(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function getPayloadSummary(event, payload) {
  if (!payload) return null;
  const ev = (event || '').toLowerCase();

  if (ev === 'user.updated') {
    const parts = [];
    if (payload.email) parts.push(payload.email);
    if (payload.changes?.role) {
      const { from, to } = payload.changes.role;
      parts.push(`role: ${from} → ${to}`);
    }
    return parts.join(' — ') || null;
  }

  if (ev === 'user.created') {
    const parts = [];
    if (payload.email) parts.push(payload.email);
    if (payload.role) parts.push(`role: ${payload.role}`);
    return parts.join(' — ') || null;
  }

  if (ev === 'survey.created' || ev === 'survey.deleted') {
    let s = payload.title || null;
    if (s && payload.questionCount != null) s += ` (${payload.questionCount} questions)`;
    return s;
  }

  if (ev === 'report.created' || ev === 'report.updated' || ev === 'report.deleted') {
    const parts = [];
    if (payload.name) parts.push(payload.name);
    if (payload.initiative_name) parts.push(payload.initiative_name);
    return parts.join(' — ') || null;
  }

  if (ev === 'goal.created' || ev === 'goal.updated' || ev === 'goal.deleted') {
    const parts = [];
    if (payload.goal_name) parts.push(payload.goal_name);
    if (payload.target_metric) parts.push(`${payload.target_metric}: ${payload.target_value}`);
    return parts.join(' — ') || null;
  }

  const firstStr = Object.values(payload).find(v => typeof v === 'string' && v.length > 0);
  return firstStr || null;
}

function PayloadDetail({ payload }) {
  if (!payload) return <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>No additional data</span>;

  const renderValue = (val, depth = 0) => {
    if (val === null || val === undefined) return <span style={{ color: '#9CA3AF' }}>—</span>;
    if (typeof val === 'object' && !Array.isArray(val)) {
      return (
        <table style={{ borderCollapse: 'collapse', marginLeft: depth ? '1rem' : 0 }}>
          <tbody>
            {Object.entries(val).map(([k, v]) => (
              <tr key={k}>
                <td style={{ color: '#6B7280', fontSize: '0.8rem', fontWeight: 500, paddingRight: '1.25rem', paddingTop: '2px', paddingBottom: '2px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{k}</td>
                <td style={{ fontSize: '0.8rem', color: '#111827', paddingTop: '2px', paddingBottom: '2px' }}>{renderValue(v, depth + 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    return <span>{String(val)}</span>;
  };

  return renderValue(payload);
}

// ── Action pill ───────────────────────────────────────────────────────────────

function ActionPill({ event }) {
  if (!event) return <span className="pill-gray">—</span>;
  const ev = event.toLowerCase();
  if (ev.includes('creat') || ev.includes('insert')) return <span className="pill-green">{event}</span>;
  if (ev.includes('updat') || ev.includes('edit'))   return <span className="pill-orange">{event}</span>;
  if (ev.includes('delet') || ev.includes('remov'))  return <span className="pill-red">{event}</span>;
  if (ev.includes('login') || ev.includes('auth'))   return <span className="pill-blue">{event}</span>;
  return <span className="pill-gray">{event}</span>;
}

// ── Expandable row ────────────────────────────────────────────────────────────

function AuditRow({ r }) {
  const [open, setOpen] = useState(false);
  const payload = parsePayload(r.payload);
  const summary = getPayloadSummary(r.event, payload);

  return (
    <>
      <tr
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer' }}
        className={open ? 'audit-row-open' : 'audit-row'}
      >
        <td style={{ width: 28, paddingRight: 0 }}>
          <span style={{
            display: 'inline-block',
            fontSize: '0.6rem',
            color: '#9CA3AF',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}>▶</span>
        </td>
        <td style={{ color: '#6B7280', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
          {new Date(r.created_at).toLocaleString()}
        </td>
        <td style={{ fontSize: '0.875rem' }}>{r.user_email || '—'}</td>
        <td><ActionPill event={r.event} /></td>
        <td style={{ fontSize: '0.875rem' }}>
          {r.target_type
            ? <span style={{ textTransform: 'capitalize' }}>{r.target_type}{r.target_id ? ` #${r.target_id}` : ''}</span>
            : '—'}
        </td>
        <td style={{ fontSize: '0.8rem', color: '#6B7280', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {summary || <span style={{ color: '#D1D5DB' }}>—</span>}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} style={{ padding: 0, borderBottom: '1px solid #F3F4F6' }}>
            <div style={{
              padding: '0.875rem 1rem 0.875rem 2.5rem',
              backgroundColor: '#F9FAFB',
              borderLeft: '3px solid #E5810A',
            }}>
              <PayloadDetail payload={payload} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminAuditPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();

  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [q, setQ]               = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [limit]                 = useState(50);
  const [offset, setOffset]     = useState(0);
  const [total, setTotal]       = useState(0);

  // Debounced search value — fires fetch 300ms after the user stops typing
  const [debouncedQ, setDebouncedQ] = useState('');
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push('/login'); return; }
    if (user.user_type !== 'admin') router.push('/');
  }, [router, user, hydrated]);

  const handleQChange = (val) => {
    setQ(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setOffset(0);
      setDebouncedQ(val);
    }, 300);
  };

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (debouncedQ) params.set('q', debouncedQ);
      if (dateFrom)   params.set('date_from', dateFrom);
      if (dateTo)     params.set('date_to', dateTo);
      params.set('limit',  String(limit));
      params.set('offset', String(offset));

      const resp = await apiFetch(`/api/admin/audit?${params.toString()}`);
      const data = await resp.json();
      if (resp.ok) {
        setRows(data.rows || []);
        setTotal(data.total || 0);
      } else {
        setError(data.error || 'Failed to load audit logs');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, debouncedQ, dateFrom, dateTo, limit, offset]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set('q', debouncedQ);
    if (dateFrom)   params.set('date_from', dateFrom);
    if (dateTo)     params.set('date_to', dateTo);
    params.set('export', 'csv');
    window.open(`/api/admin/audit?${params.toString()}`, '_blank');
  };

  const inputSt = {
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '9px 14px',
    fontSize: '0.875rem',
    outline: 'none',
    backgroundColor: 'white',
  };

  return (
    <PageLayout title="Audit Logs">
      <style>{`
        .audit-row:hover td { background: #F9FAFB; }
        .audit-row-open td  { background: #FFF7ED; }
      `}</style>

      {/* Filter Bar */}
      <div className="card" style={{ display: 'flex', gap: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search users, actions, details..."
          value={q}
          onChange={(e) => handleQChange(e.target.value)}
          style={{ ...inputSt, flex: '1 1 300px' }}
        />
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setOffset(0); }} style={inputSt} />
        <input type="date" value={dateTo}   onChange={(e) => { setDateTo(e.target.value);   setOffset(0); }} style={inputSt} />
        <button onClick={exportCsv} className="btn-outline">Export CSV</button>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}>
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>Loading audit logs...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 28 }} />
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>No audit logs found.</td>
                  </tr>
                ) : (
                  rows.map((r) => <AuditRow key={r.audit_id} r={r} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
        <div style={{ color: '#6B7280', fontSize: '0.875rem' }}>
          {total === 0
            ? '0 results'
            : `${Math.min(offset + 1, total)}–${Math.min(offset + limit, total)} of ${total}`}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            disabled={offset <= 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
            className="btn-outline"
            style={{ padding: '0.4rem 0.8rem', opacity: offset <= 0 ? 0.4 : 1 }}
          >
            Prev
          </button>
          <button
            disabled={offset + limit >= total}
            onClick={() => setOffset(offset + limit)}
            className="btn-outline"
            style={{ padding: '0.4rem 0.8rem', opacity: offset + limit >= total ? 0.4 : 1 }}
          >
            Next
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
