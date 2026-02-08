'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

const routes = [
  {
    href: '/initiative-creation',
    label: 'Initiative Creation',
    description: 'Create and configure new ASRS initiatives.',
  },
  {
    href: '/form-creation',
    label: 'Form Creation',
    description: 'Build and configure survey forms for initiatives.',
  },
  {
    href: '/survey',
    label: 'Survey',
    description: 'Fill out and submit surveys.',
  },
  {
    href: '/report-creation',
    label: 'Report Creation',
    description: 'Generate reports from collected survey data.',
  },
  {
    href: '/reporting',
    label: 'Reporting',
    description: 'View published reports and dashboards.',
  },
  {
    href: '/login',
    label: 'Login',
    description: 'Sign in to access staff and admin features.',
  },
];

export default function Home() {
  const [userRole, setUserRole] = useState('public');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header userRole={userRole} onRoleChange={setUserRole} />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="asrs-card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            ASRS Initiatives Reporting System
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Select a section to get started.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1rem',
        }}>
          {routes.map(({ href, label, description }) => (
            <Link
              key={href}
              href={href}
              style={{ textDecoration: 'none' }}
            >
              <div
                className="asrs-card"
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  height: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <h2 style={{
                  fontSize: '1.15rem',
                  fontWeight: '700',
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.5rem',
                }}>
                  {label}
                </h2>
                <p style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-text-secondary)',
                  margin: 0,
                }}>
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
