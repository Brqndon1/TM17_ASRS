'use client';

import Header from '@/components/Header';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { apiFetch } from '@/lib/api/client';

export default function AdminAuditPage() {
  const router = useRouter();
  const { user } = useAuthStore();

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
    if (user === undefined) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.user_type !== 'admin') {
      router.push('/');
    }
  }, [router, user]);

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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Audit Logs</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>View, search, filter and export audit events.</p>

        <div className="asrs-card" style={{ display: 'flex', gap: '0.75rem', padding: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input placeholder="Search by user, event, or payload..." value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: '1 1 260px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }} />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }} />
          <input placeholder="Event (exact)" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }} />
          <input placeholder="Target type" value={targetTypeFilter} onChange={(e) => setTargetTypeFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }} />
          <button onClick={() => { setOffset(0); fetchLogs(); }} className="asrs-btn-primary" style={{ padding: '0.5rem 0.9rem' }}>Search</button>
          <button onClick={exportCsv} style={{ padding: '0.5rem 0.9rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)', background: 'white', cursor: 'pointer' }}>Export CSV</button>
        </div>

        {loading ? (
          <div className="asrs-card" style={{ padding: '2rem', textAlign: 'center' }}>Loading audit logs...</div>
        ) : (
          <div className="asrs-card" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ textAlign: 'left', padding: '0.6rem 1rem' }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '0.6rem 1rem' }}>Event</th>
                    <th style={{ textAlign: 'left', padding: '0.6rem 1rem' }}>User</th>
                    <th style={{ textAlign: 'left', padding: '0.6rem 1rem' }}>Target</th>
                    <th style={{ textAlign: 'left', padding: '0.6rem 1rem' }}>Reason</th>
                    <th style={{ textAlign: 'left', padding: '0.6rem 1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.audit_id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.6rem 1rem', color: 'var(--color-text-secondary)' }}>{new Date(r.created_at).toLocaleString()}</td>
                      <td style={{ padding: '0.6rem 1rem', fontWeight: 600 }}>{r.event}</td>
                      <td style={{ padding: '0.6rem 1rem' }}>{r.user_email || '—'}</td>
                      <td style={{ padding: '0.6rem 1rem' }}>{r.target_type || '—'} {r.target_id ? `#${r.target_id}` : ''}</td>
                      <td style={{ padding: '0.6rem 1rem' }}>{r.reason_type || ''}{r.reason_text ? ` — ${r.reason_text}` : ''}</td>
                      <td style={{ padding: '0.6rem 1rem' }}>
                        <button onClick={() => setPayloadModal(r)} style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--color-bg-tertiary)', background: 'white', cursor: 'pointer' }}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
          <div style={{ color: 'var(--color-text-secondary)' }}>{Math.min(offset + 1, total)} - {Math.min(offset + limit, total)} of {total}</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button disabled={offset <= 0} onClick={() => setOffset(Math.max(0, offset - limit))} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px' }}>Prev</button>
            <button disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px' }}>Next</button>
          </div>
        </div>

        {/* Payload modal */}
        {payloadModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} onClick={() => setPayloadModal(null)}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', width: '90%', maxWidth: '800px', maxHeight: '80%', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ marginTop: 0 }}>Audit Entry #{payloadModal.audit_id}</h2>
              <div style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>{new Date(payloadModal.created_at).toLocaleString()}</div>
              <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', overflowX: 'auto' }}>{payloadModal.payload ? JSON.stringify(JSON.parse(payloadModal.payload), null, 2) : 'No payload'}</pre>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <button onClick={() => setPayloadModal(null)} style={{ padding: '0.5rem 0.9rem', borderRadius: '8px' }}>Close</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
