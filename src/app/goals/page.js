'use client';

import PageLayout from '@/components/PageLayout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { getScoreColor } from '@/lib/score-utils';
import { useAuthStore } from '@/lib/auth/use-auth-store';

export default function GoalsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [initiatives, setInitiatives] = useState([]);
  const [selectedInitiative, setSelectedInitiative] = useState('');
  const [goals, setGoals] = useState([]);
  const [overallScore, setOverallScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [message, setMessage] = useState('');

  // New goal form state
  const [newGoal, setNewGoal] = useState({
    goal_name: '',
    description: '',
    target_metric: '',
    target_value: '',
    current_value: '0',
    weight: '2',
    scoring_method: 'linear',
    deadline: '',
  });

  // Edit form state (expected_updated_at = version when edit started; US-035 concurrency)
  const [editGoal, setEditGoal] = useState({});
  const [editBaselineUpdatedAt, setEditBaselineUpdatedAt] = useState('');

  // Auth check: staff or admin required
  useEffect(() => {
    if (user && user.user_type !== 'admin' && user.user_type !== 'staff') {
      router.push('/');
    }
  }, [user, router]);

  // Fetch initiatives on mount
  useEffect(() => {
    fetchInitiatives();
  }, []);

  // Fetch goals when initiative changes
  useEffect(() => {
    if (selectedInitiative) {
      fetchGoals(selectedInitiative);
    } else {
      setGoals([]);
      setOverallScore(0);
    }
  }, [selectedInitiative]);

  async function fetchInitiatives() {
    try {
      const res = await apiFetch('/api/goals/initiatives');
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch initiatives');
      const data = await res.json();
      setInitiatives(data.initiatives || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load initiatives');
    }
  }

  async function fetchGoals(initiativeId) {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiFetch(`/api/goals?initiativeId=${initiativeId}`);
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch goals');
      const data = await res.json();
      setGoals(data.goals || []);
      setOverallScore(data.overallScore || 0);
    } catch (err) {
      console.error(err);
      setError('Failed to load goals');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddGoal(e) {
    e.preventDefault();
    setMessage('');

    try {
      const res = await apiFetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiative_id: parseInt(selectedInitiative),
          goal_name: newGoal.goal_name,
          description: newGoal.description,
          target_metric: newGoal.target_metric,
          target_value: parseFloat(newGoal.target_value),
          current_value: parseFloat(newGoal.current_value) || 0,
          weight: parseFloat(newGoal.weight),
          scoring_method: newGoal.scoring_method,
          deadline: newGoal.deadline || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create goal');

      setMessage('Goal created successfully!');
      setShowAddForm(false);
      setNewGoal({
        goal_name: '',
        description: '',
        target_metric: '',
        target_value: '',
        current_value: '0',
        weight: '2',
        scoring_method: 'linear',
        deadline: '',
      });
      fetchGoals(selectedInitiative);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleUpdateGoal(goalId) {
    setMessage('');

    try {
      const res = await apiFetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: goalId,
          expected_updated_at: editBaselineUpdatedAt,
          goal_name: editGoal.goal_name,
          description: editGoal.description,
          target_metric: editGoal.target_metric,
          target_value: parseFloat(editGoal.target_value),
          current_value: parseFloat(editGoal.current_value),
          weight: parseFloat(editGoal.weight),
          scoring_method: editGoal.scoring_method,
          deadline: editGoal.deadline || null,
        }),
      });

      const data = await res.json();
      if (res.status === 409 && data.conflict) {
        setMessage(
          data.error ||
            'Another user saved this goal first. Your edit was queued for an admin to review. The list below shows the current server copy—refresh after an admin resolves the conflict.'
        );
        setEditingGoalId(null);
        fetchGoals(selectedInitiative);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to update goal');

      setMessage('Goal updated successfully!');
      setEditingGoalId(null);
      fetchGoals(selectedInitiative);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleDeleteGoal(goalId) {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    setMessage('');

    try {
      const res = await apiFetch(`/api/goals?goalId=${goalId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete goal');

      setMessage('Goal deleted.');
      fetchGoals(selectedInitiative);
    } catch (err) {
      setMessage(err.message);
    }
  }

  function startEditing(goal) {
    setEditingGoalId(goal.goal_id);
    setEditBaselineUpdatedAt(goal.updated_at != null ? String(goal.updated_at) : '');
    setEditGoal({
      goal_name: goal.goal_name,
      description: goal.description || '',
      target_metric: goal.target_metric,
      target_value: goal.target_value,
      current_value: goal.current_value,
      weight: goal.weight,
      scoring_method: goal.scoring_method,
      deadline: goal.deadline || '',
    });
  }

  function getScoringLabel(method) {
    switch (method) {
      case 'linear': return 'Linear (proportional)';
      case 'threshold': return 'Threshold (all-or-nothing at target)';
      case 'binary': return 'Binary (any progress = 100%)';
      default: return method;
    }
  }

  function getStatusBadge(score) {
    if (score >= 100) {
      return <span className="pill pill-blue">Exceeding</span>;
    } else if (score >= 70) {
      return <span className="pill pill-green">On Track</span>;
    } else {
      return <span className="pill pill-yellow">Below</span>;
    }
  }

  // Ring progress SVG helper
  function RingProgress({ score, size = 80 }) {
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.min(Math.max(score || 0, 0), 100);
    const offset = circumference - (pct / 100) * circumference;
    const color = getScoreColor(pct);

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F3F4F6"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
    );
  }

  return (
    <PageLayout title="Goals & Scoring">
      {/* Initiative selector — always visible */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Initiatives</h2>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Choose an initiative to view and manage its scoring goals</p>
        {initiatives.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 14 }}>
            No initiatives found. Create one first.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {initiatives.map((init) => {
              const isSelected = selectedInitiative === String(init.initiative_id);
              return (
                <button
                  key={init.initiative_id}
                  onClick={() => setSelectedInitiative(String(init.initiative_id))}
                  style={{
                    textAlign: 'left',
                    padding: '16px 20px',
                    borderRadius: 12,
                    border: isSelected ? '2px solid #E67E22' : '1px solid #E5E7EB',
                    backgroundColor: isSelected ? '#FFF7ED' : '#fff',
                    cursor: 'pointer',
                    transition: 'border-color 150ms, box-shadow 150ms',
                    boxShadow: isSelected ? '0 2px 8px rgba(230,126,34,.15)' : 'none',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#E67E22'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(230,126,34,.12)'; } }}
                  onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; } }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                    {init.initiative_name}
                  </div>
                  <div style={{ fontSize: 12, color: isSelected ? '#E67E22' : '#9CA3AF' }}>
                    {isSelected ? 'Selected' : 'Click to manage goals'}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Manage Goals header */}
      {selectedInitiative && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <button
            onClick={() => { setSelectedInitiative(''); setGoals([]); setOverallScore(0); setShowAddForm(false); }}
            className="btn-outline"
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            ← Deselect
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
              Manage Goals: {initiatives.find(i => String(i.initiative_id) === selectedInitiative)?.initiative_name || 'Initiative'}
            </h2>
          </div>

          {!isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Overall score:</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: getScoreColor(overallScore) }}>
                {overallScore}%
              </span>
            </div>
          )}

          <button
            className="btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : '+ Add Goal'}
          </button>
        </div>
      )}

      {/* Placeholder when no initiative selected */}
      {!selectedInitiative && initiatives.length > 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: '#9CA3AF', fontSize: 15 }}>
          Click an initiative above to manage goals
        </div>
      )}

      {/* Feedback message */}
      {message && (
        <div style={{
          padding: '10px 16px',
          marginBottom: 20,
          borderRadius: 8,
          fontSize: 13,
          backgroundColor: message.includes('successfully') || message.includes('deleted') ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${message.includes('successfully') || message.includes('deleted') ? '#A7F3D0' : '#FECACA'}`,
          color: message.includes('successfully') || message.includes('deleted') ? '#065F46' : '#991B1B',
        }}>
          {message}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 16px',
          marginBottom: 20,
          borderRadius: 8,
          fontSize: 13,
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#991B1B',
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)', fontSize: 14 }}>
          Loading goals...
        </div>
      )}

      {/* Add Goal Form */}
      {showAddForm && selectedInitiative && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">New Goal</span>
          </div>
          <form onSubmit={handleAddGoal}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Goal Name *</label>
                <input
                  type="text"
                  value={newGoal.goal_name}
                  onChange={(e) => setNewGoal({ ...newGoal, goal_name: e.target.value })}
                  placeholder="e.g., Increase Participation"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Target Metric *</label>
                <input
                  type="text"
                  value={newGoal.target_metric}
                  onChange={(e) => setNewGoal({ ...newGoal, target_metric: e.target.value })}
                  placeholder="e.g., Number of participants"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder="Optional description of this goal..."
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Deadline (Optional)</label>
              <input
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Target Value *</label>
                <input
                  type="number"
                  step="any"
                  value={newGoal.target_value}
                  onChange={(e) => setNewGoal({ ...newGoal, target_value: e.target.value })}
                  placeholder="500"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Current Value</label>
                <input
                  type="number"
                  step="any"
                  value={newGoal.current_value}
                  onChange={(e) => setNewGoal({ ...newGoal, current_value: e.target.value })}
                  placeholder="0"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Weight (%) *</label>
                <input
                  type="number"
                  step="any"
                  min="1.01"
                  max="99.99"
                  value={newGoal.weight}
                  onChange={(e) => setNewGoal({ ...newGoal, weight: e.target.value })}
                  placeholder="2"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Scoring Method *</label>
                <select
                  value={newGoal.scoring_method}
                  onChange={(e) => setNewGoal({ ...newGoal, scoring_method: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="linear">Linear</option>
                  <option value="threshold">Threshold</option>
                  <option value="binary">Binary</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary">
              Save Goal
            </button>
          </form>
        </div>
      )}


      {/* Goals content */}
      {selectedInitiative && !isLoading && goals.length === 0 && !showAddForm && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 48, fontSize: 14 }}>
          No goals configured for this initiative yet. Click &quot;+ Add Goal&quot; to create one.
        </div>
      )}

      {selectedInitiative && !isLoading && goals.length > 0 && (
        <>
          {/* Scoring Criteria card */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">Scoring Criteria</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Weight (%)</th>
                  <th>Target</th>
                  <th>Current</th>
                  <th>Status</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {goals.map((goal) =>
                  editingGoalId === goal.goal_id ? (
                    /* ---- Edit Mode Row ---- */
                    <tr key={goal.goal_id}>
                      <td colSpan={6} style={{ padding: 0 }}>
                        <div style={{ padding: '20px 16px', background: '#FAFAFA', borderRadius: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'var(--color-text-primary)' }}>
                            Editing: {goal.goal_name}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div>
                              <label style={labelStyle}>Goal Name</label>
                              <input
                                type="text"
                                value={editGoal.goal_name}
                                onChange={(e) => setEditGoal({ ...editGoal, goal_name: e.target.value })}
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Target Metric</label>
                              <input
                                type="text"
                                value={editGoal.target_metric}
                                onChange={(e) => setEditGoal({ ...editGoal, target_metric: e.target.value })}
                                style={inputStyle}
                              />
                            </div>
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <label style={labelStyle}>Description</label>
                            <textarea
                              value={editGoal.description}
                              onChange={(e) => setEditGoal({ ...editGoal, description: e.target.value })}
                              rows={2}
                              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                            />
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <label style={labelStyle}>Deadline (Optional)</label>
                            <input
                              type="date"
                              value={editGoal.deadline}
                              onChange={(e) => setEditGoal({ ...editGoal, deadline: e.target.value })}
                              style={inputStyle}
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div>
                              <label style={labelStyle}>Target Value</label>
                              <input
                                type="number"
                                step="any"
                                value={editGoal.target_value}
                                onChange={(e) => setEditGoal({ ...editGoal, target_value: e.target.value })}
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Current Value</label>
                              <input
                                type="number"
                                step="any"
                                value={editGoal.current_value}
                                onChange={(e) => setEditGoal({ ...editGoal, current_value: e.target.value })}
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Weight (%)</label>
                              <input
                                type="number"
                                step="any"
                                min="1.01"
                                max="99.99"
                                value={editGoal.weight}
                                onChange={(e) => setEditGoal({ ...editGoal, weight: e.target.value })}
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Scoring Method</label>
                              <select
                                value={editGoal.scoring_method}
                                onChange={(e) => setEditGoal({ ...editGoal, scoring_method: e.target.value })}
                                style={{ ...inputStyle, cursor: 'pointer' }}
                              >
                                <option value="linear">Linear</option>
                                <option value="threshold">Threshold</option>
                                <option value="binary">Binary</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleUpdateGoal(goal.goal_id)}
                              className="btn-primary"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={() => setEditingGoalId(null)}
                              className="btn-outline"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    /* ---- Display Mode Row ---- */
                    <tr key={goal.goal_id}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                          {goal.goal_name}
                        </div>
                        {goal.description && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            {goal.description}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--color-text-light)', marginTop: 2 }}>
                          {goal.target_metric}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{goal.weight}%</span>
                          <div style={{ width: 80, height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(goal.weight, 100)}%`,
                                height: '100%',
                                backgroundColor: 'var(--color-asrs-orange)',
                                borderRadius: 2,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{goal.target_value}</td>
                      <td>
                        <span style={{ fontWeight: 500, color: getScoreColor(goal.score) }}>
                          {goal.current_value}
                        </span>
                      </td>
                      <td>{getStatusBadge(goal.score)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => startEditing(goal)}
                            className="btn-outline"
                            style={{ padding: '5px 12px', fontSize: 12 }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal.goal_id)}
                            style={{
                              padding: '5px 12px',
                              fontSize: 12,
                              borderRadius: 8,
                              border: '1px solid #FECACA',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              cursor: 'pointer',
                              transition: 'background 150ms ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Target Metrics card */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">Target Metrics</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 16,
              }}
            >
              {goals.map((goal) => (
                <div
                  key={goal.goal_id}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 12,
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    background: '#FAFAFA',
                    transition: 'border-color 150ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'center', marginBottom: 4 }}>
                    {goal.goal_name}
                  </div>

                  {/* Ring progress */}
                  <div style={{ position: 'relative', width: 80, height: 80 }}>
                    <RingProgress score={goal.score} size={80} />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: getScoreColor(goal.score), lineHeight: 1 }}>
                        {goal.score}%
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Target
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {goal.target_value}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Current
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: getScoreColor(goal.score) }}>
                      {goal.current_value}
                    </div>
                  </div>

                  <div style={{ marginTop: 4 }}>
                    {getStatusBadge(goal.score)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save Changes button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn-primary"
              onClick={() => fetchGoals(selectedInitiative)}
            >
              Refresh Data
            </button>
          </div>
        </>
      )}
    </PageLayout>
  );
}

// Shared form field styles
const labelStyle = {
  display: 'block',
  color: 'var(--color-text-primary)',
  marginBottom: '0.35rem',
  fontWeight: '600',
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1.5px solid #E5E7EB',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--color-text-primary)',
  backgroundColor: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 150ms ease',
};
