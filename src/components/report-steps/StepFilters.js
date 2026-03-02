'use client';

import FilterPanel from '@/components/FilterPanel';

export default function StepFilters({ reportConfig, onChange, tableData }) {
  const attributes = reportConfig.selectedInitiative?.attributes || [];

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
