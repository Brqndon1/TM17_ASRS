'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

const routes = [
  {
    href: '/initiative-creation',
    label: 'Initiative Creation',
    description: 'Create and configure new ASRS initiatives.',
    requiresAuth: true,
  },
  {
    href: '/form-creation',
    label: 'Form Creation',
    description: 'Build and configure survey forms for initiatives.',
    requiresAuth: true,
  },
  {
    href: '/survey',
    label: 'Survey',
    description: 'Fill out and submit surveys.',
    // No requiresAuth — publicly accessible
  },
  {
    href: '/report-creation',
    label: 'Report Creation',
    description: 'Generate reports from collected survey data.',
    requiresAuth: true,
  },
  {
    href: '/reporting',
    label: 'Reporting',
    description: 'View published reports and dashboards.',
    requiresAuth: true,
  },
  {
    href: '/manage-reports',
    label: 'Manage Reports',
    description: 'Add, update, delete, and reorder the report library.',
    requiresAuth: true,
    staffOnly: true,
  },
  {
    href: '/goals',
    label: 'Goals & Scoring',
    description: 'Set initiative goals with target metrics and scoring criteria.',
    requiresAuth: true,
    adminOnly: true,
  },
  {
    href: '/login',
    label: 'Login',
    description: 'Sign in to access staff and admin features.',
    showOnlyWhenLoggedOut: true,
  },
];

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [initiatives, setInitiatives] = useState([]);
  const [selectedInitiative, setSelectedInitiative] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    setIsLoggedIn(!!storedUser);
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setIsAdmin(parsed.user_type === 'admin');
      setIsStaff(parsed.user_type === 'staff' || parsed.user_type === 'admin');
    }

    fetch('/api/initiatives')
      .then(res => res.json())
      .then(data => setInitiatives(Array.isArray(data.initiatives) ? data.initiatives : []))
      .catch(() => setInitiatives([]));
  }, []);

  const visibleRoutes = routes.filter(route => {
    if (route.showOnlyWhenLoggedOut) {
      return !isLoggedIn;
    }
    if (route.adminOnly) {
      return isLoggedIn && isAdmin;
    }
    if (route.staffOnly) {
      return isLoggedIn && isStaff;
    }
    if (route.requiresAuth) {
      return isLoggedIn;
    }
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 220px))',
          gap: '1rem',
        }}>
          {visibleRoutes.map(({ href, label, description }) => {
            const isSurvey = href === '/survey';
            const cardContent = (
              <div
                className="asrs-card"
                style={{
                  cursor: isSurvey ? 'default' : 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  height: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!isSurvey) {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSurvey) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '';
                  }
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

                {isSurvey && (
                  <div style={{ marginTop: '1rem' }} onClick={e => e.preventDefault()}>
                    <select
                      value={selectedInitiative}
                      onChange={e => setSelectedInitiative(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border, #ccc)',
                        backgroundColor: 'var(--color-bg-primary)',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.85rem',
                        marginBottom: '0.6rem',
                      }}
                    >
                      <option value=''>— Select an initiative —</option>
                      {initiatives.map(ini => (
                        <option key={ini.id} value={ini.id}>{ini.name}</option>
                      ))}
                    </select>
                    <Link
                      href={selectedInitiative ? `/survey?initiativeId=${selectedInitiative}` : '#'}
                      style={{ textDecoration: 'none', display: 'block' }}
                      onClick={e => { if (!selectedInitiative) e.preventDefault(); }}
                    >
                      <button
                        disabled={!selectedInitiative}
                        style={{
                          width: '100%',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: selectedInitiative
                            ? 'var(--color-primary, #2563eb)'
                            : 'var(--color-border, #ccc)',
                          color: '#fff',
                          fontSize: '0.85rem',
                          cursor: selectedInitiative ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Start Survey
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            );

            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                {cardContent}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}