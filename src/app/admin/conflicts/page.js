'use client';

import Header from '@/components/Header';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { apiFetch } from '@/lib/api/client';

function FieldDiff({ label, before, after }) {
  const same = JSON.stringify(before) === JSON.stringify(after);
  return (
    <div style={{ marginBottom: '0.35rem', fontSize: '0.88rem' }}>
      <span style={{ fontWeight: 600 }}>{label}:</span>{' '}
      {same ? (
        <span style={{ color: 'var(--color-text-secondary)' }}>{String(before ?? '—')}</span>
      ) : (
        <>
          <span style={{ textDecoration: 'line-through', color: '#c0392b' }}>{String(before ?? '—')}</span>
          {' → '}
          <span style={{ color: '#27ae60', fontWeight: 600 }}>{String(after ?? '—')}</span>
        </>
      )}
    </div>
  );
}

export default function AdminGoalConflictsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);

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

  const load = useCallback(async () => {
    if (!user || user.user_type !== 'admin') return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      const resp = await apiFetch(`/api/admin/goal-conflicts?${params.toString()}`);
      const data = await resp.json();
      if (resp.ok) {
        setConflicts(data.conflicts || []);
      } else {
        setError(data.error || 'Failed to load conflicts');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(conflictId, action) {
    setBusyId(conflictId);
    setError('');
    try {
      const resp = await apiFetch('/api/admin/goal-conflicts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflict_id: conflictId, action }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Action failed');
        return;
      }
      await load();
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  const fieldLabels = {
    goal_name: 'Goal name',
    description: 'Description',
    target_metric: 'Target metric',
    target_value: 'Target value',
    current_value: 'Current value',
    weight: 'Weight',
    scoring_method: 'Scoring method',
    deadline: 'Deadline',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Goal edit conflicts</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          When two people edit the same goal, the second save is held for review. Approve to apply their proposed values, or reject to keep the current server copy.
        </p>

        <div className="asrs-card" style={{ display: 'flex', gap: '0.75rem', padding: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600 }}>Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }}
            >
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </select>
          </label>
          <button type="button" onClick={() => load()} className="asrs-btn-primary" style={{ padding: '0.5rem 0.9rem' }}>
            Refresh
          </button>
        </div>

        {error && (
          <div className="asrs-card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderLeft: '4px solid #c0392b' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="asrs-card" style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
        ) : conflicts.length === 0 ? (
          <div className="asrs-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No conflicts in this view.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {conflicts.map((c) => {
              const patch = c.proposed_patch || {};
              const snap = c.server_snapshot || {};
              const fields = new Set([...Object.keys(patch), ...Object.keys(snap)].filter((k) => k !== 'updated_at'));
              return (
                <div key={c.conflict_id} className="asrs-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                        Goal #{c.goal_id} — {snap.goal_name || 'Goal'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                        {c.initiative_name} · Submitted by {c.submitter_email} · {new Date(c.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        background: c.status === 'pending' ? '#fff3cd' : '#d4edda',
                        color: c.status === 'pending' ? '#856404' : '#155724',
                        alignSelf: 'flex-start',
                      }}
                    >
                      {c.status}
                      {c.resolution ? ` · ${c.resolution.replace(/_/g, ' ')}` : ''}
                    </div>
                  </div>

                  <div style={{ marginBottom: '0.75rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                    Client expected <code>updated_at</code> {c.expected_updated_at}; server had {c.detected_server_updated_at} when the conflict was recorded.
                  </div>

                  <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                    {Array.from(fields).map((key) => (
                      <FieldDiff key={key} label={fieldLabels[key] || key} before={snap[key]} after={patch[key]} />
                    ))}
                  </div>

                  {c.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="asrs-btn-primary"
                        disabled={busyId === c.conflict_id}
                        onClick={() => resolve(c.conflict_id, 'apply')}
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        {busyId === c.conflict_id ? 'Working…' : 'Approve (apply proposed values)'}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === c.conflict_id}
                        onClick={() => resolve(c.conflict_id, 'reject')}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid var(--color-bg-tertiary)',
                          background: 'white',
                          cursor: busyId === c.conflict_id ? 'default' : 'pointer',
                        }}
                      >
                        Reject (keep current data)
                      </button>
                    </div>
                  )}
                  {c.status === 'resolved' && c.resolved_by_email && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      Resolved by {c.resolved_by_email}
                      {c.resolved_at ? ` · ${new Date(c.resolved_at).toLocaleString()}` : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
