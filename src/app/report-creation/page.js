'use client';

import Header from '@/components/Header';
import { useState } from 'react';

export default function ReportCreationPage() {
  const [userRole, setUserRole] = useState('staff');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header userRole={userRole} onRoleChange={setUserRole} />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="asrs-card">
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            Report Creation
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            Generate reports from collected survey data. Configure columns, filters, grouping, and chart types, then publish to the Reporting dashboard.
          </p>

          <div style={{
            border: '2px dashed var(--color-bg-tertiary)',
            borderRadius: '12px',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: 'var(--color-text-light)',
          }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Report Builder</p>
            <p style={{ fontSize: '0.9rem' }}>
              This page will let staff select an initiative, choose which fields to include as report columns,
              apply filters and sorting, pick chart types, and generate a report that gets saved to the reporting dashboard.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
