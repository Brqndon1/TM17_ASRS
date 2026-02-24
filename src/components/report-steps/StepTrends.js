'use client';

export default function StepTrends({ reportConfig, onChange }) {
  const attributes = reportConfig.selectedInitiative?.attributes || [];
  const trendConfig = reportConfig.trendConfig || {
    variables: [],
    enabledCalc: true,
    enabledDisplay: true,
  };
  const selected = trendConfig.variables || [];

  function toggleVariable(attribute) {
    if (selected.includes(attribute)) {
      onChange({
        trendConfig: {
          ...trendConfig,
          variables: selected.filter(v => v !== attribute),
        },
      });
      return;
    }

    if (selected.length >= 5) return;

    onChange({
      trendConfig: {
        ...trendConfig,
        variables: [...selected, attribute],
      },
    });
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.15rem', fontWeight: '600', marginBottom: '0.5rem' }}>
        Step 5: Trend Configuration
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Select up to 5 variables for automatic trend calculation.
      </p>

      <div className="asrs-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={trendConfig.enabledCalc !== false}
              onChange={(e) =>
                onChange({
                  trendConfig: {
                    ...trendConfig,
                    enabledCalc: e.target.checked,
                  },
                })
              }
            />
            Enable calculation
          </label>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={trendConfig.enabledDisplay !== false}
              onChange={(e) =>
                onChange({
                  trendConfig: {
                    ...trendConfig,
                    enabledDisplay: e.target.checked,
                  },
                })
              }
            />
            Show in report
          </label>
        </div>
      </div>

      <div className="asrs-card">
        <p style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
          Selected variables: {selected.length}/5
        </p>

        {attributes.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--color-text-light)' }}>
            No attributes available for this initiative.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
            {attributes.map((attribute) => {
              const isChecked = selected.includes(attribute);
              const atLimit = !isChecked && selected.length >= 5;
              return (
                <label
                  key={attribute}
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: `1px solid ${isChecked ? 'var(--color-asrs-orange)' : 'var(--color-bg-tertiary)'}`,
                    backgroundColor: isChecked ? 'rgba(243, 156, 18, 0.12)' : 'var(--color-bg-primary)',
                    opacity: atLimit ? 0.6 : 1,
                    display: 'flex',
                    gap: '0.55rem',
                    alignItems: 'center',
                    cursor: atLimit ? 'not-allowed' : 'pointer',
                    fontSize: '0.88rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={atLimit}
                    onChange={() => toggleVariable(attribute)}
                  />
                  {attribute}
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
