/**
 * ============================================================================
 * SORT PANEL — Allows users to sort report data by up to 7 levels.
 * ============================================================================
 * Per REP002 and REP021:
 * - Up to 7 sorting levels, each with an attribute and direction (asc/desc).
 * - Uses ORDER BY with comma-separated criteria (simulated client-side here).
 *
 * Per REP022: Changing sort order does NOT affect existing filters.
 *
 * Props:
 * - attributes: Array<string> — Available attribute names for sorting.
 * - activeSorts: Array<{attribute, direction}> — Current sort configuration.
 * - onSortsChange: function — Called when sort config is updated.
 * ============================================================================
 */
'use client';

const MAX_SORTS = 7;

export default function SortPanel({ attributes, activeSorts, onSortsChange }) {
  /** addSortLevel — Adds a new sorting level with defaults. */
  function addSortLevel() {
    if (activeSorts.length >= MAX_SORTS) return;
    // Pick the first attribute that isn't already used in a sort
    const usedAttrs = activeSorts.map(s => s.attribute);
    const available = attributes.find(a => !usedAttrs.includes(a));
    if (available) {
      onSortsChange([...activeSorts, { attribute: available, direction: 'asc' }]);
    }
  }

  /** removeSortLevel — Removes a sorting level by its index. */
  function removeSortLevel(index) {
    const newSorts = activeSorts.filter((_, i) => i !== index);
    onSortsChange(newSorts);
  }

  /** updateSortLevel — Changes the attribute or direction of one sort level. */
  function updateSortLevel(index, field, value) {
    const newSorts = [...activeSorts];
    newSorts[index] = { ...newSorts[index], [field]: value };
    onSortsChange(newSorts);
  }

  return (
    <div className="asrs-card">
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '0.75rem'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
          Sort ({activeSorts.length}/{MAX_SORTS})
        </h3>
        <button
          onClick={addSortLevel}
          disabled={activeSorts.length >= MAX_SORTS}
          className="asrs-btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
        >
          + Add Level
        </button>
      </div>

      {/* List of active sort levels */}
      {activeSorts.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
          No sorting applied. Click "Add Level" to sort the data.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activeSorts.map((sort, index) => (
            <div key={index} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.4rem', backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: '6px'
            }}>
              {/* Priority number */}
              <span style={{
                fontSize: '0.75rem', fontWeight: '600',
                color: 'var(--color-text-light)', minWidth: '20px'
              }}>
                {index + 1}.
              </span>

              {/* Attribute selector */}
              <select
                value={sort.attribute}
                onChange={(e) => updateSortLevel(index, 'attribute', e.target.value)}
                style={{
                  flex: 1, padding: '0.35rem', borderRadius: '4px',
                  border: '1px solid var(--color-bg-tertiary)', fontSize: '0.8rem'
                }}
              >
                {attributes.map(attr => (
                  <option key={attr} value={attr}>{attr}</option>
                ))}
              </select>

              {/* Direction toggle (ascending/descending) */}
              <select
                value={sort.direction}
                onChange={(e) => updateSortLevel(index, 'direction', e.target.value)}
                style={{
                  padding: '0.35rem', borderRadius: '4px',
                  border: '1px solid var(--color-bg-tertiary)', fontSize: '0.8rem',
                  width: '75px'
                }}
              >
                <option value="asc">A→Z</option>
                <option value="desc">Z→A</option>
              </select>

              {/* Remove button */}
              <button
                onClick={() => removeSortLevel(index)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-asrs-red)', fontSize: '1.1rem',
                  padding: '0 0.25rem'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}