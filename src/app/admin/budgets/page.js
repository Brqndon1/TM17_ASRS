'use client';

import Header from '@/components/Header';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { apiFetch } from '@/lib/api/client';

const blankForm = {
  initiativeId: '',
  department: '',
  fiscalYear: '',
  personnel: '',
  equipment: '',
  operations: '',
  travel: '',
};

export default function AdminBudgetsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [budgets, setBudgets] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLabel, setHistoryLabel] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [form, setForm] = useState(blankForm);

  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.user_type !== 'admin') {
      router.push('/');
      return;
    }
  }, [router, user]);

  useEffect(() => {
    if (!user) return;
    fetchInitiatives();
    fetchBudgets();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const filteredBudgets = useMemo(() => {
    return budgets.filter((budget) => {
      const budgetDepartment = budget.department || 'General';
      const matchesDepartment = filterDepartment === '' || budgetDepartment === filterDepartment;
      const matchesYear = filterYear === '' || String(budget.fiscal_year) === filterYear.trim();
      return matchesDepartment && matchesYear;
    });
  }, [budgets, filterDepartment, filterYear]);

  const departments = useMemo(() => {
    const values = new Set();
    budgets.forEach((budget) => values.add(budget.department || 'General'));
    return Array.from(values).sort();
  }, [budgets]);

  async function fetchInitiatives() {
    try {
      const response = await apiFetch('/api/initiatives');
      const data = await response.json();
      if (response.ok) {
        setInitiatives(data.initiatives || []);
      } else {
        setError(data.error || 'Failed to load initiatives');
      }
    } catch (err) {
      setError('Unable to load initiatives.');
    }
  }

  async function fetchBudgets() {
    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/admin/budgets');
      const data = await response.json();
      if (response.ok) {
        setBudgets(data.budgets || []);
      } else {
        setError(data.error || 'Failed to load budgets');
      }
    } catch (err) {
      setError('Unable to load budgets.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchHistory(budget) {
    setError('');
    setHistoryRows([]);
    setHistoryLabel('');
    setHistoryOpen(true);

    try {
      const response = await apiFetch(`/api/admin/budgets?history_for=${budget.budget_id}`);
      const data = await response.json();
      if (response.ok) {
        setHistoryRows(data.history || []);
        setHistoryLabel(`${budget.initiative_name} — ${budget.fiscal_year}`);
      } else {
        setError(data.error || 'Failed to load allocation history');
        setHistoryOpen(false);
      }
    } catch (err) {
      setError('Unable to load allocation history.');
      setHistoryOpen(false);
    }
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function clearForm() {
    setSelectedBudgetId(null);
    setForm(blankForm);
    setError('');
  }

  function validateBudgetForm() {
    const initiativeId = Number(form.initiativeId);
    const fiscalYear = Number(form.fiscalYear);
    const personnel = Number(form.personnel);
    const equipment = Number(form.equipment);
    const operations = Number(form.operations);
    const travel = Number(form.travel);

    if (!initiativeId || !Number.isFinite(initiativeId)) return 'Choose an initiative.';
    if (!fiscalYear || !Number.isFinite(fiscalYear) || fiscalYear <= 0) return 'Enter a valid fiscal year.';
    if (personnel <= 0 || equipment <= 0 || operations <= 0 || travel <= 0) {
      return 'Personnel, equipment, operations, and travel must all be positive numbers.';
    }
    if ([personnel, equipment, operations, travel].some((value) => Number.isNaN(value))) return 'Budget values must be valid numbers.';
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateBudgetForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    const payload = {
      initiativeId: Number(form.initiativeId),
      department: form.department.trim() || 'General',
      fiscalYear: Number(form.fiscalYear),
      personnel: Number(form.personnel),
      equipment: Number(form.equipment),
      operations: Number(form.operations),
      travel: Number(form.travel),
    };

    try {
      const method = selectedBudgetId ? 'PUT' : 'POST';
      const body = selectedBudgetId ? { budgetId: selectedBudgetId, ...payload } : payload;
      const response = await apiFetch('/api/admin/budgets', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to save budget');
      } else {
        const action = selectedBudgetId ? 'updated' : 'created';
        setSuccess(`Budget ${action} successfully.`);
        clearForm();
        fetchBudgets();
      }
    } catch (err) {
      setError('Saved failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(budgetId) {
    if (!window.confirm('Delete this budget? This cannot be undone.')) {
      return;
    }

    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const response = await apiFetch(`/api/admin/budgets?budget_id=${budgetId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to delete budget');
      } else {
        if (selectedBudgetId === budgetId) {
          clearForm();
        }
        setSuccess('Budget deleted successfully.');
        fetchBudgets();
      }
    } catch (err) {
      setError('Unable to delete budget. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(budget) {
    setSelectedBudgetId(budget.budget_id);
    setForm({
      initiativeId: String(budget.initiative_id),
      department: budget.department || 'General',
      fiscalYear: String(budget.fiscal_year),
      personnel: String(budget.personnel),
      equipment: String(budget.equipment),
      operations: String(budget.operations),
      travel: String(budget.travel),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Budget Reporting</h1>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
              Admin-only initiative budget reporting with fiscal year, department categorization, and allocation history.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.9rem 1rem', borderRadius: '10px', backgroundColor: '#ffebee', color: '#b00020' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ marginBottom: '1rem', padding: '0.9rem 1rem', borderRadius: '10px', backgroundColor: '#e8f5e9', color: '#2e7d32' }}>
            {success}
          </div>
        )}

        <section className="asrs-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.15rem' }}>{selectedBudgetId ? 'Edit Budget' : 'Create Budget'}</h2>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                Initiative
                <select
                  value={form.initiativeId}
                  onChange={(e) => updateForm('initiativeId', e.target.value)}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }}
                >
                  <option value="">Select initiative</option>
                  {initiatives.map((initiative) => (
                    <option key={initiative.id} value={initiative.id}>{initiative.name}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                Department
                <input
                  value={form.department}
                  onChange={(e) => updateForm('department', e.target.value)}
                  placeholder="e.g. Academic, IT, Facilities"
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                Fiscal Year
                <input
                  type="number"
                  value={form.fiscalYear}
                  onChange={(e) => updateForm('fiscalYear', e.target.value)}
                  min="2020"
                  step="1"
                  placeholder="2025"
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }}
                />
              </label>
            </div>

            <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                Personnel $
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.personnel}
                  onChange={(e) => updateForm('personnel', e.target.value.startsWith('-') ? e.target.value.slice(1) : e.target.value)}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                Equipment $
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.equipment}
                  onChange={(e) => updateForm('equipment', e.target.value.startsWith('-') ? e.target.value.slice(1) : e.target.value)}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                Operations $
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.operations}
                  onChange={(e) => updateForm('operations', e.target.value.startsWith('-') ? e.target.value.slice(1) : e.target.value)}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                Travel $
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.travel}
                  onChange={(e) => updateForm('travel', e.target.value.startsWith('-') ? e.target.value.slice(1) : e.target.value)}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }}
                />
              </label>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button
                type="submit"
                className="asrs-btn-primary"
                style={{ padding: '0.75rem 1.1rem', minWidth: '160px' }}
                disabled={saving}
              >
                {saving ? 'Saving…' : selectedBudgetId ? 'Update Budget' : 'Create Budget'}
              </button>
              <button
                type="button"
                onClick={clearForm}
                style={{ padding: '0.75rem 1.1rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)', background: 'white', color: 'var(--color-text-primary)' }}
              >
                Clear Form
              </button>
            </div>
          </form>
        </section>

        <section className="asrs-card" style={{ padding: '1.25rem' }}>
          <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Existing Budgets</h2>
              <p style={{ margin: '0.35rem 0 0', color: 'var(--color-text-secondary)' }}>
                Grouped by department and fiscal year. Use the filters or edit an item.
              </p>
            </div>
            <div style={{ display: 'grid', gap: '0.85rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', width: '100%', maxWidth: '600px' }}>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)', background: 'white' }}
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
              <input
                type="number"
                min="2020"
                step="1"
                placeholder="Filter by year"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value.startsWith('-') ? e.target.value.slice(1) : e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading budgets…</div>
          ) : filteredBudgets.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No budgets found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Department</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Initiative</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Year</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Personnel</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Equipment</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Operations</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Travel</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBudgets.map((budget) => (
                    <tr key={budget.budget_id} style={{ borderBottom: '1px solid #e8eaed' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>{budget.department || 'General'}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{budget.initiative_name}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{budget.fiscal_year}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{Number(budget.personnel).toFixed(2)}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{Number(budget.equipment).toFixed(2)}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{Number(budget.operations).toFixed(2)}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{Number(budget.travel).toFixed(2)}</td>
                      <td style={{ padding: '0.85rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleEdit(budget)}
                          style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)', background: 'white', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => fetchHistory(budget)}
                          style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)', background: 'white', cursor: 'pointer' }}
                        >
                          History
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(budget.budget_id)}
                          style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #f44336', background: '#ffebee', color: '#b00020', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {historyOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', background: 'white', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Allocation History</h2>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--color-text-secondary)' }}>{historyLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                style={{ padding: '0.55rem 0.9rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)', background: 'white', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

            {historyRows.length === 0 ? (
              <div style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>No allocation history available for this budget.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>When</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Changed By</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Department</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Personnel</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Equipment</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Operations</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Travel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((row) => (
                      <tr key={row.history_id} style={{ borderBottom: '1px solid #e8eaed' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>{new Date(row.created_at).toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{row.changed_by_email || 'System'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{row.department || 'General'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{Number(row.personnel).toFixed(2)}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{Number(row.equipment).toFixed(2)}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{Number(row.operations).toFixed(2)}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{Number(row.travel).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
