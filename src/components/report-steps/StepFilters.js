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
