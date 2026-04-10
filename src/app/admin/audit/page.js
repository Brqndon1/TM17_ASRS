'use client';

import PageLayout from '@/components/PageLayout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { apiFetch } from '@/lib/api/client';

export default function AdminAuditPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [payloadModal, setPayloadModal] = useState(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.user_type !== 'admin') {
      router.push('/');
    }
  }, [router, user, hydrated]);

  const fetchLogs = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (eventFilter) params.set('event', eventFilter);
      if (targetTypeFilter) params.set('target_type', targetTypeFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      params.set('limit', String(limit));
      params.set('offset', String(offset));

      const resp = await apiFetch(`/api/admin/audit?${params.toString()}`);
      const data = await resp.json();
      if (resp.ok) {
        setRows(data.rows || []);
        setTotal(data.total || 0);
      } else {
        setError(data.error || 'Failed to load audit logs');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [user, q, eventFilter, targetTypeFilter, dateFrom, dateTo, limit, offset]);

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (eventFilter) params.set('event', eventFilter);
    if (targetTypeFilter) params.set('target_type', targetTypeFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    params.set('export', 'csv');
    const url = `/api/admin/audit?${params.toString()}`;
    window.open(url, '_blank');
  };

  const getActionPill = (event) => {
    if (!event) return <span className="pill-gray">—</span>;
    const ev = event.toLowerCase();
    if (ev.includes('create') || ev.includes('insert')) return <span className="pill-green">{event}</span>;
    if (ev.includes('update') || ev.includes('edit')) return <span className="pill-orange">{event}</span>;
    if (ev.includes('delete') || ev.includes('remove')) return <span className="pill-red">{event}</span>;
    if (ev.includes('login') || ev.includes('auth')) return <span className="pill-blue">{event}</span>;
    return <span className="pill-gray">{event}</span>;
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
      {/* Filter Bar */}
      <div className="card" style={{ display: 'flex', gap: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search by user, event, or payload..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ ...inputSt, flex: '1 1 260px' }}
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          style={inputSt}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          style={inputSt}
        />
        <input
          placeholder="Event (exact)"
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          style={inputSt}
        />
        <input
          placeholder="Target type"
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value)}
          style={inputSt}
        />
        <button onClick={() => { setOffset(0); fetchLogs(); }} className="btn-primary">
          Search
        </button>
        <button
          onClick={exportCsv}
          className="btn-outline"
        >
          Export CSV
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}>
          {error}
        </div>
      )}

      {/* Audit Table */}
      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>Loading audit logs...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Details</th>
                  <th>IP Address</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>No audit logs found.</td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.audit_id}>
                      <td style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString()}</td>
                      <td>{r.user_email || '—'}</td>
                      <td>{getActionPill(r.event)}</td>
                      <td>{r.target_type || '—'}{r.target_id ? ` #${r.target_id}` : ''}</td>
                      <td>{r.reason_type || ''}{r.reason_text ? ` — ${r.reason_text}` : ''}</td>
                      <td style={{ color: '#6B7280', fontSize: '0.8rem' }}>—</td>
                      <td>
                        <button
                          onClick={() => setPayloadModal(r)}
                          className="btn-outline"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
        <div style={{ color: '#6B7280', fontSize: '0.875rem' }}>
          {total === 0 ? '0 results' : `${Math.min(offset + 1, total)}–${Math.min(offset + limit, total)} of ${total}`}
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

      {/* Payload modal */}
      {payloadModal && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}
          onClick={() => setPayloadModal(null)}
        >
          <div
            style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', width: '90%', maxWidth: '800px', maxHeight: '80%', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, fontSize: '1.15rem', fontWeight: '700', color: '#111827' }}>Audit Entry #{payloadModal.audit_id}</h2>
            <div style={{ color: '#6B7280', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{new Date(payloadModal.created_at).toLocaleString()}</div>
            <pre style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.8rem' }}>
              {payloadModal.payload ? JSON.stringify(JSON.parse(payloadModal.payload), null, 2) : 'No payload'}
            </pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button onClick={() => setPayloadModal(null)} className="btn-outline" style={{ padding: '0.5rem 1rem' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
