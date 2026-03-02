'use client';

import Header from '@/components/Header';
import { useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.phone_number && formData.phone_number.replace(/\D/g, '').length !== 10) {
      setError('Phone number must be 10 digits');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_number: formData.phone_number,
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  const labelStyle = {
    display: 'block',
    color: 'var(--color-text-primary)',
    marginBottom: '0.4rem',
    fontWeight: '600',
    fontSize: '0.9rem',
  };

  // ── Success state: show check your email message ──────────────────────────
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
        <Header />
        <main style={{ maxWidth: '460px', margin: '0 auto', padding: '3rem 1.5rem' }}>
          <div className="asrs-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
              Check your email
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              We sent a verification link to <strong>{formData.email}</strong>.
              Click the link in that email to verify your address and set your password.
            </p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
              Didn't get it? Check your spam folder, or{' '}
              <button
                onClick={() => setSubmitted(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                try again
              </button>.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      <main style={{ maxWidth: '460px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div className="asrs-card">
          <h1 style={{
            fontSize: '1.75rem', fontWeight: '700',
            color: 'var(--color-text-primary)', marginBottom: '0.5rem', textAlign: 'center',
          }}>
            Create Account
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', textAlign: 'center' }}>
            Sign up to get started with ASRS
          </p>

          {error && (
            <div style={{
              padding: '0.75rem', marginBottom: '1rem',
              backgroundColor: '#ffebee', border: '1px solid #ffcdd2',
              borderRadius: '8px', color: '#c62828', fontSize: '0.9rem',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>First Name</label>
              <input type="text" name="first_name" value={formData.first_name}
                onChange={handleChange} required disabled={loading} style={inputStyle} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Last Name</label>
              <input type="text" name="last_name" value={formData.last_name}
                onChange={handleChange} required disabled={loading} style={inputStyle} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>
                Phone Number <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional)</span>
              </label>
              <input type="tel" name="phone_number" value={formData.phone_number}
                onChange={handleChange} disabled={loading} maxLength={10}
                placeholder="10 digits" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Email</label>
              <input type="email" name="email" value={formData.email}
                onChange={handleChange} required disabled={loading} style={inputStyle} />
            </div>

            <button
              type="submit"
              className="asrs-btn-primary"
              disabled={loading}
              style={{
                width: '100%', padding: '0.75rem', fontSize: '1rem',
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div style={{
            marginTop: '1.5rem', textAlign: 'center',
            fontSize: '0.9rem', color: 'var(--color-text-secondary)',
          }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '600' }}>
              Log in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
