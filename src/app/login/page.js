'use client';

import Header from '@/components/Header';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth/use-auth-store';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(() => {
    if (typeof window === 'undefined') return '';
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('signup') === 'success'
      ? 'Account created successfully! Please log in.'
      : '';
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setMessage(`Login successful! Welcome ${data.user.first_name}!`);
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        setMessage(data.error || 'Login failed');
      }
    } catch {
      setMessage('Connection error');
    }
  };

  const isSuccess = message && !message.toLowerCase().includes('error') && !message.toLowerCase().includes('failed');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      <main style={{ maxWidth: '460px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div className="asrs-card">
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: 'var(--color-text-primary)',
              marginBottom: '0.5rem',
              textAlign: 'center',
            }}
          >
            Admin / Staff Login
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', textAlign: 'center' }}>
            Sign in to access staff and admin features.
          </p>

          {message && (
            <div
              style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                backgroundColor: isSuccess ? '#e8f5e9' : '#ffebee',
                border: `1px solid ${isSuccess ? '#c8e6c9' : '#ffcdd2'}`,
                borderRadius: '8px',
                color: isSuccess ? '#2e7d32' : '#c62828',
                fontSize: '0.9rem',
              }}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.4rem',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.4rem',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                style={inputStyle}
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

          <div
            style={{
              marginTop: '1.5rem',
              textAlign: 'center',
              fontSize: '0.9rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              Sign up
            </Link>
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              fontSize: '0.85rem',
              lineHeight: '1.6',
            }}
          >
            <strong>Test Accounts:</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div style={testAccountCardStyle}>
                <div style={{ fontWeight: '600', color: 'var(--color-asrs-red)', marginBottom: '0.25rem' }}>Admin</div>
                <div>Email: <code style={{ fontSize: '0.8rem' }}>admin@test.com</code></div>
                <div>Password: <code style={{ fontSize: '0.8rem' }}>admin123</code></div>
              </div>
              <div style={testAccountCardStyle}>
                <div style={{ fontWeight: '600', color: 'var(--color-asrs-orange)', marginBottom: '0.25rem' }}>Staff</div>
                <div>Email: <code style={{ fontSize: '0.8rem' }}>staff@test.com</code></div>
                <div>Password: <code style={{ fontSize: '0.8rem' }}>staff123</code></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid var(--color-bg-tertiary)',
  borderRadius: '8px',
  fontSize: '0.95rem',
  color: 'var(--color-text-primary)',
  backgroundColor: 'white',
  outline: 'none',
  boxSizing: 'border-box',
};

const testAccountCardStyle = {
  padding: '0.5rem 0.75rem',
  backgroundColor: 'white',
  borderRadius: '6px',
  border: '1px solid #e0e0e0',
};
