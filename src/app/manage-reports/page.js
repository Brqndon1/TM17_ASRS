'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';

export default function ManageReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit modal state
  const [editingReport, setEditingReport] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('completed');

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState(null);

  // Toast message
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(storedUser);
    if (parsed.user_type !== 'staff' && parsed.user_type !== 'admin') {
      router.push('/');
      return;
    }
    loadData();
  }, [router]);

  async function loadData() {
    setLoading(true);
    try {
      const [reportsRes, initRes] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/initiatives'),
      ]);
      const reportsData = await reportsRes.json();
      const initData = await initRes.json();
      setReports(reportsData.reports || []);
      setInitiatives(initData.initiatives || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }

  function getInitiativeName(initId) {
    const init = initiatives.find(i => i.initiative_id === initId || i.id === initId);
    return init ? (init.initiative_name || init.name) : '—';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ── Edit ──

  function openEdit(report) {
    setEditingReport(report);
    setEditName(report.name || '');
    setEditDescription(report.description || '');
    setEditStatus(report.status || 'completed');
  }

  function closeEdit() {
    setEditingReport(null);
    setEditName('');
    setEditDescription('');
    setEditStatus('completed');
  }

  async function handleSaveEdit() {
    if (!editingReport) return;
    setSaving(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingReport.id,
          name: editName,
          description: editDescription,
          status: editStatus,
        }),
      });
      if (!res.ok) throw new Error();
      showToast('Report updated successfully');
      closeEdit();
      await loadData();
    } catch {
      showToast('Failed to update report', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──

  async function handleDelete(id) {
    setSaving(true);
    try {
      const res = await fetch(`/api/reports?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Report deleted');
      setDeletingId(null);
      await loadData();
    } catch {
      showToast('Failed to delete report', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Reorder ──

  function moveReport(index, direction) {
    const newReports = [...reports];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newReports.length) return;
    [newReports[index], newReports[targetIndex]] = [newReports[targetIndex], newReports[index]];
    setReports(newReports);
  }

  async function saveOrder() {
    setSaving(true);
    try {
      const order = reports.map((r, i) => ({ id: r.id, display_order: i }));
      const res = await fetch('/api/reports/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      if (!res.ok) throw new Error();
      showToast('Display order saved');
      await loadData();
    } catch {
      showToast('Failed to save order', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Styles ──

  const statusColors = {
    completed: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
    generating: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    failed: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  };

  const btnPrimary = {
    padding: '0.5rem 1.2rem',
    backgroundColor: 'var(--color-asrs-orange)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.88rem',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  };

  const btnSecondary = {
    padding: '0.4rem 0.9rem',
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-bg-tertiary)',
    borderRadius: '6px',
    fontWeight: 500,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  };

  const btnDanger = {
    ...btnSecondary,
    color: '#991b1b',
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  };

  const arrowBtn = {
    padding: '0.25rem 0.5rem',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-bg-tertiary)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    lineHeight: 1,
    color: 'var(--color-text-secondary)',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <BackButton />

        <div className="asrs-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Manage Reports</h1>
              <p style={{ color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
                Add, update, delete, and reorder the report library.
              </p>
            </div>
            <button
              onClick={saveOrder}
              disabled={saving || reports.length === 0}
              style={{
                ...btnPrimary,
                opacity: saving || reports.length === 0 ? 0.5 : 1,
                cursor: saving || reports.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save Order'}
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)' }}>
              Loading reports...
            </div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No reports yet.</p>
              <p style={{ fontSize: '0.9rem' }}>Create reports from the Report Creation page, then manage them here.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-bg-tertiary)' }}>
                    {['#', 'Order', 'Report Name', 'Initiative', 'Status', 'Created', 'Actions'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '0.65rem 0.75rem',
                        fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase',
                        letterSpacing: '0.03em', color: 'var(--color-text-secondary)',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, idx) => {
                    const sc = statusColors[r.status] || statusColors.completed;
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-light)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              onClick={() => moveReport(idx, -1)}
                              disabled={idx === 0}
                              style={{ ...arrowBtn, opacity: idx === 0 ? 0.3 : 1 }}
                              title="Move up"
                            >
                              &#9650;
                            </button>
                            <button
                              onClick={() => moveReport(idx, 1)}
                              disabled={idx === reports.length - 1}
                              style={{ ...arrowBtn, opacity: idx === reports.length - 1 ? 0.3 : 1 }}
                              title="Move down"
                            >
                              &#9660;
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 500 }}>
                          {r.name || '(Untitled)'}
                          {r.description && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', marginTop: '0.15rem' }}>
                              {r.description.length > 60 ? r.description.slice(0, 60) + '...' : r.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                          {r.initiative_name || getInitiativeName(r.initiative_id)}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <span style={{
                            display: 'inline-block', padding: '0.2rem 0.65rem',
                            borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '0.03em',
                            backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                          }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                          {formatDate(r.created_at)}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => openEdit(r)} style={btnSecondary}>
                              Edit
                            </button>
                            {deletingId === r.id ? (
                              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: '#991b1b' }}>Delete?</span>
                                <button
                                  onClick={() => handleDelete(r.id)}
                                  disabled={saving}
                                  style={{ ...btnDanger, padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  style={{ ...btnSecondary, padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setDeletingId(r.id)} style={btnDanger}>
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reorder hint */}
        {reports.length > 1 && (
          <p style={{
            textAlign: 'center', marginTop: '1rem',
            fontSize: '0.85rem', color: 'var(--color-text-light)',
          }}>
            Use the arrow buttons to reorder, then click <strong>Save Order</strong> to persist changes.
          </p>
        )}
      </main>

      {/* ── Edit Modal ── */}
      {editingReport && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.45)',
        }}>
          <div className="asrs-card" style={{
            width: '100%', maxWidth: '520px', margin: '1rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Edit Report
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-text-secondary)' }}>
                Report Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{
                  width: '100%', padding: '0.55rem 0.75rem',
                  border: '1px solid var(--color-bg-tertiary)',
                  borderRadius: '6px', fontSize: '0.9rem',
                  backgroundColor: 'var(--color-bg-primary)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-text-secondary)' }}>
                Description
              </label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                style={{
                  width: '100%', padding: '0.55rem 0.75rem',
                  border: '1px solid var(--color-bg-tertiary)',
                  borderRadius: '6px', fontSize: '0.9rem',
                  backgroundColor: 'var(--color-bg-primary)',
                  resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-text-secondary)' }}>
                Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                style={{
                  width: '100%', padding: '0.55rem 0.75rem',
                  border: '1px solid var(--color-bg-tertiary)',
                  borderRadius: '6px', fontSize: '0.9rem',
                  backgroundColor: 'var(--color-bg-primary)',
                }}
              >
                <option value="completed">Completed</option>
                <option value="generating">Generating</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={closeEdit} style={btnSecondary} disabled={saving}>
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editName.trim()}
                style={{
                  ...btnPrimary,
                  opacity: saving || !editName.trim() ? 0.5 : 1,
                  cursor: saving || !editName.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 300,
          padding: '0.75rem 1.25rem', borderRadius: '8px',
          fontWeight: 600, fontSize: '0.9rem',
          color: toast.type === 'error' ? '#991b1b' : '#065f46',
          backgroundColor: toast.type === 'error' ? '#fee2e2' : '#d1fae5',
          border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
