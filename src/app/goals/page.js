'use client';

import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GoalsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
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
    weight: '1',
    scoring_method: 'linear',
  });

  // Edit form state
  const [editGoal, setEditGoal] = useState({});

  // Check admin access
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsed = JSON.parse(storedUser);
    if (parsed.user_type !== 'admin') {
      router.push('/');
      return;
    }
    setUser(parsed);
  }, [router]);

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
      const res = await fetch('/api/goals/initiatives');
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
      const res = await fetch(`/api/goals?initiativeId=${initiativeId}`);
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
      const res = await fetch('/api/goals', {
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
        weight: '1',
        scoring_method: 'linear',
      });
      fetchGoals(selectedInitiative);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleUpdateGoal(goalId) {
    setMessage('');

    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: goalId,
          goal_name: editGoal.goal_name,
          description: editGoal.description,
          target_metric: editGoal.target_metric,
          target_value: parseFloat(editGoal.target_value),
          current_value: parseFloat(editGoal.current_value),
          weight: parseFloat(editGoal.weight),
          scoring_method: editGoal.scoring_method,
        }),
      });

      const data = await res.json();
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
      const res = await fetch(`/api/goals?goalId=${goalId}`, {
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
    setEditGoal({
      goal_name: goal.goal_name,
      description: goal.description || '',
      target_metric: goal.target_metric,
      target_value: goal.target_value,
      current_value: goal.current_value,
      weight: goal.weight,
      scoring_method: goal.scoring_method,
    });
  }

  function getScoreColor(score) {
    if (score >= 80) return '#27AE60';
    if (score >= 50) return '#F39C12';
    return '#C0392B';
  }

  function getScoringLabel(method) {
    switch (method) {
      case 'linear': return 'Linear (proportional)';
      case 'threshold': return 'Threshold (all-or-nothing at target)';
      case 'binary': return 'Binary (any progress = 100%)';
      default: return method;
    }
  }

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <BackButton />

        <div className="asrs-card" style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            Initiative Goals & Scoring
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Define goals per initiative with target metrics, weights, and scoring criteria.
          </p>

          {/* Initiative Selector */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              color: 'var(--color-text-primary)',
              marginBottom: '0.5rem',
              fontWeight: '600',
              fontSize: '0.95rem',
            }}>
              Select Initiative
            </label>
            <select
              value={selectedInitiative}
              onChange={(e) => setSelectedInitiative(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid var(--color-bg-tertiary)',
                borderRadius: '8px',
                fontSize: '0.95rem',
                color: 'var(--color-text-primary)',
                backgroundColor: 'white',
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              <option value="">-- Choose an initiative --</option>
              {initiatives.map((init) => (
                <option key={init.initiative_id} value={init.initiative_id}>
                  {init.initiative_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: message.includes('successfully') || message.includes('deleted') ? '#e8f5e9' : '#ffebee',
            border: `1px solid ${message.includes('successfully') || message.includes('deleted') ? '#c8e6c9' : '#ffcdd2'}`,
            borderRadius: '8px',
            color: message.includes('successfully') || message.includes('deleted') ? '#2e7d32' : '#c62828',
            fontSize: '0.9rem',
          }}>
            {message}
          </div>
        )}

        {/* Overall Score Display */}
        {selectedInitiative && !isLoading && (
          <div className="asrs-card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
              Overall Initiative Score
            </h2>
            <div style={{
              fontSize: '3rem',
              fontWeight: '800',
              color: getScoreColor(overallScore),
              marginBottom: '0.5rem',
            }}>
              {overallScore}%
            </div>
            {/* Progress bar */}
            <div style={{
              width: '100%',
              maxWidth: '400px',
              height: '12px',
              backgroundColor: 'var(--color-bg-tertiary)',
              borderRadius: '6px',
              margin: '0 auto',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(overallScore, 100)}%`,
                height: '100%',
                backgroundColor: getScoreColor(overallScore),
                borderRadius: '6px',
                transition: 'width 0.5s ease',
              }} />
            </div>
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              {goals.length} goal{goals.length !== 1 ? 's' : ''} configured
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: '#ffebee',
            border: '1px solid #ffcdd2',
            borderRadius: '8px',
            color: '#c62828',
            fontSize: '0.9rem',
          }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
            Loading goals...
          </div>
        )}

        {/* Goals List */}
        {selectedInitiative && !isLoading && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                Goals
              </h2>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="asrs-btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                {showAddForm ? 'Cancel' : '+ Add Goal'}
              </button>
            </div>

            {/* Add Goal Form */}
            {showAddForm && (
              <div className="asrs-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
                  New Goal
                </h3>
                <form onSubmit={handleAddGoal}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      value={newGoal.description}
                      onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                      placeholder="Optional description of this goal..."
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
                      <label style={labelStyle}>Weight *</label>
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        value={newGoal.weight}
                        onChange={(e) => setNewGoal({ ...newGoal, weight: e.target.value })}
                        placeholder="1"
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

                  <button
                    type="submit"
                    className="asrs-btn-primary"
                    style={{ padding: '0.625rem 1.5rem', fontSize: '0.95rem' }}
                  >
                    Save Goal
                  </button>
                </form>
              </div>
            )}

            {/* Goals Cards */}
            {goals.length === 0 && !showAddForm && (
              <div className="asrs-card" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No goals configured for this initiative yet. Click "+ Add Goal" to create one.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {goals.map((goal) => (
                <div key={goal.goal_id} className="asrs-card" style={{ position: 'relative' }}>
                  {editingGoalId === goal.goal_id ? (
                    /* ---- Edit Mode ---- */
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
                        Editing Goal
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Description</label>
                        <textarea
                          value={editGoal.description}
                          onChange={(e) => setEditGoal({ ...editGoal, description: e.target.value })}
                          rows={2}
                          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
                          <label style={labelStyle}>Weight</label>
                          <input
                            type="number"
                            step="any"
                            min="0.1"
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
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleUpdateGoal(goal.goal_id)}
                          className="asrs-btn-primary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingGoalId(null)}
                          className="asrs-btn-secondary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ---- Display Mode ---- */
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
                            {goal.goal_name}
                          </h3>
                          {goal.description && (
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                              {goal.description}
                            </p>
                          )}
                        </div>
                        {/* Score badge */}
                        <div style={{
                          minWidth: '70px',
                          textAlign: 'center',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: getScoreColor(goal.score) + '18',
                          marginLeft: '1rem',
                        }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: getScoreColor(goal.score) }}>
                            {goal.score}%
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)' }}>score</div>
                        </div>
                      </div>

                      {/* Goal details grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '0.75rem',
                        marginTop: '0.75rem',
                        padding: '0.75rem',
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderRadius: '8px',
                      }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginBottom: '0.15rem' }}>Metric</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>{goal.target_metric}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginBottom: '0.15rem' }}>Progress</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                            {goal.current_value} / {goal.target_value}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginBottom: '0.15rem' }}>Weight</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>{goal.weight}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginBottom: '0.15rem' }}>Scoring</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                            {goal.scoring_method.charAt(0).toUpperCase() + goal.scoring_method.slice(1)}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: 'var(--color-bg-tertiary)',
                        borderRadius: '3px',
                        marginTop: '0.75rem',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${Math.min(goal.score, 100)}%`,
                          height: '100%',
                          backgroundColor: getScoreColor(goal.score),
                          borderRadius: '3px',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button
                          onClick={() => startEditing(goal)}
                          className="asrs-btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal.goal_id)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #ffcdd2',
                            backgroundColor: '#fff5f5',
                            color: '#c62828',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffebee'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff5f5'}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Shared styles
const labelStyle = {
  display: 'block',
  color: 'var(--color-text-primary)',
  marginBottom: '0.35rem',
  fontWeight: '600',
  fontSize: '0.85rem',
};

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid var(--color-bg-tertiary)',
  borderRadius: '8px',
  fontSize: '0.9rem',
  color: 'var(--color-text-primary)',
  backgroundColor: 'white',
  outline: 'none',
  boxSizing: 'border-box',
};
