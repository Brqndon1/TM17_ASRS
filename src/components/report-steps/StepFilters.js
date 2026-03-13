'use client';

import { useState, useEffect } from 'react';
import FilterPanel from '@/components/FilterPanel';

const MAX_COLUMNS = 7;

export default function StepFilters({ reportConfig, onChange, tableData }) {
  const attributes = reportConfig.selectedInitiative?.attributes || [];
  const selectedAttributes = reportConfig.selectedAttributes || [];
  const [maxMsg, setMaxMsg] = useState(false);

  useEffect(() => {
    if (!maxMsg) return;
    const timer = setTimeout(() => setMaxMsg(false), 2000);
    return () => clearTimeout(timer);
  }, [maxMsg]);

  function handleToggleAttribute(attr) {
    if (selectedAttributes.includes(attr)) {
      onChange({ selectedAttributes: selectedAttributes.filter((a) => a !== attr) });
      return;
    }
    if (selectedAttributes.length >= MAX_COLUMNS) {
      setMaxMsg(true);
      return;
    }
    onChange({ selectedAttributes: [...selectedAttributes, attr] });
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.15rem', fontWeight: '600', marginBottom: '0.5rem' }}>
        Step 2: Data Filters
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Select attribute filters to narrow the data included in the report. This step is optional.
      </p>

      {/* Date Range */}
      <div className="asrs-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.75rem 0' }}>
          Date Range
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', display: 'block', marginBottom: '0.2rem' }}>
              Start Date
            </label>
            <input
              type="date"
              value={reportConfig.startDate || ''}
              onChange={(e) => onChange({ startDate: e.target.value })}
              style={{
                width: '100%', padding: '0.4rem',
                borderRadius: '6px', fontSize: '0.8rem',
                border: '1px solid var(--color-bg-tertiary)',
                backgroundColor: 'white', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', display: 'block', marginBottom: '0.2rem' }}>
              End Date
            </label>
            <input
              type="date"
              value={reportConfig.endDate || ''}
              min={reportConfig.startDate || ''}
              onChange={(e) => onChange({ endDate: e.target.value })}
              style={{
                width: '100%', padding: '0.4rem',
                borderRadius: '6px', fontSize: '0.8rem',
                border: '1px solid var(--color-bg-tertiary)',
                backgroundColor: 'white', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* Report Columns */}
      <div className="asrs-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.25rem 0' }}>
          Report Columns
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', margin: '0 0 0.75rem 0' }}>
          Select up to {MAX_COLUMNS} attributes to include as columns in the report ({selectedAttributes.length}/{MAX_COLUMNS} selected).
        </p>

        {maxMsg && (
          <p style={{
            fontSize: '0.8rem', color: 'var(--color-error, #b91c1c)',
            fontWeight: '600', margin: '0 0 0.5rem 0',
          }}>
            Maximum {MAX_COLUMNS} attributes
          </p>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '0.4rem',
        }}>
          {attributes.map((attr) => {
            const checked = selectedAttributes.includes(attr);
            const disabled = !checked && selectedAttributes.length >= MAX_COLUMNS;
            return (
              <label
                key={attr}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                  backgroundColor: checked ? 'var(--color-bg-secondary, #f1f5f9)' : 'transparent',
                  border: checked ? '1px solid var(--color-asrs-orange)' : '1px solid transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => handleToggleAttribute(attr)}
                  style={{ accentColor: 'var(--color-asrs-orange)' }}
                />
                {attr}
              </label>
            );
          })}
        </div>

        {attributes.length === 0 && (
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
            No attributes available for the selected initiative.
          </p>
        )}
      </div>

      {tableData && tableData.length > 0 ? (
        <FilterPanel
          attributes={attributes}
          activeFilters={reportConfig.filters}
          onFiltersChange={(filters) => onChange({ filters })}
          tableData={tableData}
        />
      ) : (
        <div className="asrs-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--color-text-light)' }}>
            No table data available for this initiative.
          </p>
        </div>
      )}
    </div>
  );
}
