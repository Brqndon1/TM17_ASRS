'use client';

import Header from '@/components/Header';
import { useState } from 'react';

export default function FormCreationPage() {
  const [userRole, setUserRole] = useState('staff');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header userRole={userRole} onRoleChange={setUserRole} />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="asrs-card">
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            Form Creation
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            Build and configure survey forms for initiatives. Select fields, set display order, and publish forms for public or staff use.
          </p>

          <div style={{
            border: '2px dashed var(--color-bg-tertiary)',
            borderRadius: '12px',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: 'var(--color-text-light)',
          }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Form Builder</p>
            <p style={{ fontSize: '0.9rem' }}>
              This page will allow staff to create forms by selecting fields from the field catalog,
              setting display order, marking fields as required, and assigning the form to an initiative.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
