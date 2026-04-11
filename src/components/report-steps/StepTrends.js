'use client';

import { useMemo } from 'react';

export default function StepTrends({ reportConfig, onChange, tableData }) {
  // Derive available columns from tableData (real submission fields) + initiative attributes
  const availableColumns = useMemo(() => {
    const excludeKeys = new Set(['submission_id', 'submitted_at', 'id', 'initiative_id', 'form_id', 'user_id']);
    const fromData = tableData && tableData.length > 0
      ? Object.keys(tableData[0]).filter(k => !excludeKeys.has(k))
      : [];
    // Deduplicate case-insensitively, preferring the data column name
    const seen = new Set();
    const combined = [];
    for (const col of fromData) {
      const lower = col.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        combined.push(col);
      }
    }
    const fromAttrs = reportConfig.selectedInitiative?.attributes || [];
    for (const attr of fromAttrs) {
      const lower = attr.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        combined.push(attr);
      }
    }
    return combined;
  }, [tableData, reportConfig.selectedInitiative]);

  const trendGroups = reportConfig.trendConfig?.groups || [
    { variables: [], method: 'delta_halves', thresholdPct: 2 },
  ];
  const enabledCalc = reportConfig.trendConfig?.enabledCalc !== false;
  const enabledDisplay = reportConfig.trendConfig?.enabledDisplay !== false;

  function updateGroups(newGroups) {
    onChange({
      trendConfig: {
        ...reportConfig.trendConfig,
        groups: newGroups,
        // Keep legacy `variables` in sync with first group for backward compat
        variables: newGroups[0]?.variables || [],
        method: newGroups[0]?.method || 'delta_halves',
        thresholdPct: newGroups[0]?.thresholdPct ?? 2,
      },
    });
  }

  function toggleVariable(groupIdx, column) {
    const groups = [...trendGroups];
    const group = { ...groups[groupIdx] };
    const selected = group.variables || [];
    if (selected.includes(column)) {
      group.variables = selected.filter(v => v !== column);
    } else {
      if (selected.length >= 5) return;
      group.variables = [...selected, column];
    }
    groups[groupIdx] = group;
    updateGroups(groups);
  }

  function updateGroupField(groupIdx, field, value) {
    const groups = [...trendGroups];
    groups[groupIdx] = { ...groups[groupIdx], [field]: value };
    updateGroups(groups);
  }

  function addGroup() {
    updateGroups([...trendGroups, { variables: [], method: 'delta_halves', thresholdPct: 2 }]);
  }

  function removeGroup(groupIdx) {
    if (trendGroups.length <= 1) return;
    const groups = trendGroups.filter((_, i) => i !== groupIdx);
    updateGroups(groups);
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.15rem', fontWeight: '600', marginBottom: '0.5rem' }}>
        Trend Configuration
      </h2>
      <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Configure one or more trend analyses. Select up to 5 variables per trend group.
      </p>

      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={enabledCalc}
              onChange={(e) =>
                onChange({
                  trendConfig: {
                    ...reportConfig.trendConfig,
                    enabledCalc: e.target.checked,
                    groups: trendGroups,
                  },
                })
              }
            />
            Enable calculation
          </label>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={enabledDisplay}
              onChange={(e) =>
                onChange({
                  trendConfig: {
                    ...reportConfig.trendConfig,
                    enabledDisplay: e.target.checked,
                    groups: trendGroups,
                  },
                })
              }
            />
            Show in report
          </label>
        </div>
      </div>

      {trendGroups.map((group, groupIdx) => {
        const selected = group.variables || [];
        return (
          <div key={groupIdx} className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#111827' }}>
                Trend Group {groupIdx + 1}
              </h3>
              {trendGroups.length > 1 && (
                <button
                  onClick={() => removeGroup(groupIdx)}
                  style={{ fontSize: '0.8rem', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                >
                  Remove
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
                Method:
                <select
                  style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '0.85rem' }}
                  value={group.method || 'delta_halves'}
                  onChange={(e) => updateGroupField(groupIdx, 'method', e.target.value)}
                >
                  <option value="delta_halves">Half-to-Half Delta</option>
                  <option value="linear_slope">Linear Slope</option>
                </select>
              </label>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
                Threshold %:
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={group.thresholdPct ?? 2}
                  onChange={(e) => updateGroupField(groupIdx, 'thresholdPct', Number(e.target.value))}
                  style={{ width: '80px', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '0.85rem' }}
                />
              </label>
            </div>

            <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#6B7280' }}>
              Selected: {selected.length}/5
            </p>

            {availableColumns.length === 0 ? (
              <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.85rem' }}>
                No data fields available. Make sure the initiative has survey submissions.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                {availableColumns.map((col) => {
                  const isChecked = selected.includes(col);
                  const atLimit = !isChecked && selected.length >= 5;
                  return (
                    <label
                      key={col}
                      style={{
                        padding: '0.5rem 0.65rem',
                        borderRadius: '8px',
                        border: `1px solid ${isChecked ? '#E67E22' : '#E5E7EB'}`,
                        backgroundColor: isChecked ? 'rgba(230,126,34,0.08)' : '#fff',
                        opacity: atLimit ? 0.5 : 1,
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        cursor: atLimit ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={atLimit}
                        onChange={() => toggleVariable(groupIdx, col)}
                      />
                      {col}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={addGroup}
        className="btn-outline"
        style={{ fontSize: '0.85rem' }}
      >
        + Add Trend Group
      </button>
    </div>
  );
}
