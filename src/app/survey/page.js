'use client';

import Header from '@/components/Header';
import { useState } from 'react';

export default function SurveyPage() {
  const [userRole, setUserRole] = useState('public');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header userRole={userRole} onRoleChange={setUserRole} />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="asrs-card">
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            Take a Survey
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            Select an initiative and fill out the available survey form. Your responses are stored and used for reporting.
          </p>

          <div style={{
            border: '2px dashed var(--color-bg-tertiary)',
            borderRadius: '12px',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: 'var(--color-text-light)',
          }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Survey Form</p>
            <p style={{ fontSize: '0.9rem' }}>
              This page will display the active survey form for a selected initiative.
              Users fill in the dynamically rendered fields and submit their responses.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
