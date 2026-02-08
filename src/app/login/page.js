'use client';

import Header from '@/components/Header';
import { useState } from 'react';

export default function LoginPage() {
  const [userRole, setUserRole] = useState('public');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header userRole={userRole} onRoleChange={setUserRole} />

      <main style={{ maxWidth: '460px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div className="asrs-card">
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem', textAlign: 'center' }}>
            Admin / Staff Login
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', textAlign: 'center' }}>
            Sign in to access staff and admin features.
          </p>

          <form>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                color: 'var(--color-text-primary)',
                marginBottom: '0.4rem',
                fontWeight: '600',
                fontSize: '0.9rem',
              }}>
                Email
              </label>
              <input
                type="email"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  border: '1px solid var(--color-bg-tertiary)',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'white',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: 'var(--color-text-primary)',
                marginBottom: '0.4rem',
                fontWeight: '600',
                fontSize: '0.9rem',
              }}>
                Password
              </label>
              <input
                type="password"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  border: '1px solid var(--color-bg-tertiary)',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'white',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              className="asrs-btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
              }}
            >
              Login
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
