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

import { useMemo, useState } from 'react';

export default function DataTable({ data, columns }) {
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const safeColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns]);
  const displayColumns = safeColumns.filter(col => col !== 'id');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(safeData.length / pageSize));
  const displayPage = Math.min(page, totalPages);

  const pagedData = useMemo(() => {
    const start = (displayPage - 1) * pageSize;
    return safeData.slice(start, start + pageSize);
  }, [safeData, displayPage, pageSize]);

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

  if (safeData.length === 0) {
    return (
      <div className="asrs-card" style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: 'var(--color-text-light)' }}>
          No data matches your current filters.
        </p>
      </div>
    );
  }

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
          {safeData.length} record{safeData.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div style={{ padding: '0.6rem 1.5rem', borderBottom: '1px solid var(--color-bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}>
          Rows per page
          <select
            value={pageSize}
            onChange={(e) => {
              const next = Number(e.target.value);
              setPageSize(next);
              setPage(1);
            }}
            className="asrs-input"
            style={{ width: '80px', padding: '0.25rem 0.4rem' }}
          >
            {[20, 50, 100].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <button
            className="asrs-btn-secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ padding: '0.3rem 0.55rem' }}
          >
            Prev
          </button>
          <span>Page {displayPage} of {totalPages}</span>
          <button
            className="asrs-btn-secondary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{ padding: '0.3rem 0.55rem' }}
          >
            Next
          </button>
        </div>
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
            {pagedData.map((row, rowIndex) => (
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
