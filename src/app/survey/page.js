'use client';

import Header from '@/components/Header';
import SurveyForm from '@/components/SurveyForm';
import { useState } from 'react';

export default function SurveyPage() {
  const [userRole, setUserRole] = useState('public');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header userRole={userRole} onRoleChange={setUserRole} />

      <main style={{ 
        maxWidth: userRole === 'public' ? '1000px' : '1100px', 
        margin: '0 auto', 
        padding: userRole === 'public' ? '2rem 1.5rem' : '1.5rem' 
      }}>
        {userRole === 'public' ? (
          // Public user view - Take a Survey
          <div className="asrs-card">
            <h1 style={{ 
              fontSize: '1.75rem', 
              fontWeight: '700', 
              color: 'var(--color-text-primary)', 
              marginBottom: '0.5rem' 
            }}>
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
        ) : (
          // Staff/Admin user view - Create Survey
          <section>
            <div style={{ 
              justifyContent: 'center', 
              textAlign: 'center', 
              alignItems: 'center', 
              display: 'flex', 
              gap: '1rem', 
              marginBottom: '1rem' 
            }}>
              <div>
                <h1 style={{ margin: 0, fontWeight: 'bold' }}>Create Survey</h1>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                  Create a survey to send out to the public!
                </p>
              </div>
            </div>
            <SurveyForm />
          </section>
        )}
      </main>
    </div>
  );
}