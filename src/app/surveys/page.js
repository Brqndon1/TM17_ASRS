"use client";
import { useState } from 'react';
import Header from '@/components/Header';
import SurveyForm from "../../components/SurveyForm";

export default function Page() {
  const [userRole, setUserRole] = useState('staff');

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header userRole={userRole} onRoleChange={setUserRole} />

      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{justifyContent:'center', textAlign: 'center', alignItems: 'center', display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 'bold' }}>Create Survey</h1>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>Create a survey to send out to the public!</p>
          </div>
        </div>

        <SurveyForm />
      </section>
    </main>
  );
}
