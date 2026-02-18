'use client';

import SortPanel from '@/components/SortPanel';

export default function StepSorting({ reportConfig, onChange }) {
  const attributes = reportConfig.selectedInitiative?.attributes || [];

  return (
    <div>
      <h2 style={{ fontSize: '1.15rem', fontWeight: '600', marginBottom: '0.5rem' }}>
        Step 4: Sort Configuration
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Configure the sort order for the report data. This step is optional.
      </p>

      <SortPanel
        attributes={attributes}
        activeSorts={reportConfig.sorts}
        onSortsChange={(sorts) => onChange({ sorts })}
      />
    </div>
  );
}
