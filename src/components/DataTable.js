/**
 * ============================================================================
 * DATA TABLE — Displays report data in a scrollable, responsive table.
 * ============================================================================
 * Per REP036: On mobile, this converts to a card-like layout (handled via
 * CSS class "responsive-table" in globals.css).
 *
 * Props:
 * - data: Array — The filtered & sorted rows to display.
 * - columns: Array<string> — The column keys from the data objects.
 * ============================================================================
 */
'use client';

export default function DataTable({ data, columns }) {
  if (!data || data.length === 0) {
    return (
      <div className="asrs-card" style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: 'var(--color-text-light)' }}>
          No data matches your current filters.
        </p>
      </div>
    );
  }

  /**
   * formatColumnName — Converts camelCase keys to human-readable labels.
   * Example: "sessionRating" → "Session Rating"
   */
  function formatColumnName(key) {
    return key
      .replace(/([A-Z])/g, ' $1')    // Add space before capital letters
      .replace(/^./, str => str.toUpperCase())  // Capitalize first letter
      .trim();
  }

  // Filter out the "id" column from display — it's internal only
  const displayColumns = columns.filter(col => col !== 'id');

  return (
    <div className="asrs-card" style={{ overflow: 'hidden', padding: '0' }}>
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid var(--color-bg-tertiary)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>
          Data Table
        </h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
          {data.length} record{data.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrollable container for wide tables */}
      <div style={{ overflowX: 'auto' }}>
        <table className="responsive-table" style={{
          width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem'
        }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              {displayColumns.map(col => (
                <th key={col} style={{
                  padding: '0.75rem 1rem', textAlign: 'left',
                  fontWeight: '600', color: 'var(--color-text-secondary)',
                  fontSize: '0.8rem', whiteSpace: 'nowrap',
                  borderBottom: '2px solid var(--color-bg-tertiary)'
                }}>
                  {formatColumnName(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} style={{
                borderBottom: '1px solid var(--color-bg-secondary)',
                transition: 'background-color 0.15s ease'
              }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {displayColumns.map(col => (
                  <td
                    key={col}
                    data-label={formatColumnName(col)}
                    style={{
                      padding: '0.65rem 1rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {row[col] !== undefined ? String(row[col]) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
