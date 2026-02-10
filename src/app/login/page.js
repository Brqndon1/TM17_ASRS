'use client';

import Header from '@/components/Header';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check for signup success message
    if (searchParams.get('signup') === 'success') {
      setMessage('✅ Account created successfully! Please log in.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store user info in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setMessage(`✅ Login successful! Welcome ${data.user.first_name}!`);
        
        // Redirect after a brief delay
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage('❌ Connection error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      <main style={{ maxWidth: '460px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div className="asrs-card">
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem', textAlign: 'center' }}>
            Admin / Staff Login
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', textAlign: 'center' }}>
            Sign in to access staff and admin features.
          </p>

          {message && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: message.includes('✅') ? '#e8f5e9' : '#ffebee',
              border: `1px solid ${message.includes('✅') ? '#c8e6c9' : '#ffcdd2'}`,
              borderRadius: '8px',
              color: message.includes('✅') ? '#2e7d32' : '#c62828',
              fontSize: '0.9rem',
            }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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

          <div style={{ 
            marginTop: '1.5rem', 
            textAlign: 'center',
            fontSize: '0.9rem',
            color: 'var(--color-text-secondary)'
          }}>
            Don't have an account?{' '}
            <Link 
              href="/signup"
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              Sign up
            </Link>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px', fontSize: '0.85rem' }}>
            <strong>Test Login:</strong><br />
            Email: test@gmail.com<br />
            Password: testing
          </div>
        </div>
      </main>
    </div>
  );
}