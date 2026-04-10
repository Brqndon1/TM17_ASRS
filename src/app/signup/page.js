'use client';

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
  const [resultMessage, setResultMessage] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');

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
        setResultMessage(data.message || 'Account created!');
        setVerificationUrl(data.verificationUrl || '');
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

  const inputFocus = (e) => {
    e.target.style.borderColor = '#E67E22';
    e.target.style.boxShadow = '0 0 0 3px rgba(230,126,34,.1)';
  };
  const inputBlur = (e) => {
    e.target.style.borderColor = '#E5E7EB';
    e.target.style.boxShadow = 'none';
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', fontSize: 15,
    border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff',
    color: '#111827', outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block', fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 6,
  };

  const outerWrapper = {
    minHeight: '100vh', background: '#F9FAFB',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  };

  const card = {
    background: '#fff', width: '100%', maxWidth: 420,
    border: '1px solid #E5E7EB', borderRadius: 12, padding: 32,
  };

  const logoBlock = (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <img src="/asrs-logo.png" alt="ASRS" style={{ width: 48, height: 48, borderRadius: 8, marginBottom: 16 }} />
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>ASRS Initiatives</h1>
      <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>Reporting System</p>
    </div>
  );

  // ── Success state: show check your email message ──────────────────────────
  if (submitted) {
    return (
      <div style={outerWrapper}>
        <div style={{ ...card, textAlign: 'center' }}>
          {logoBlock}
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '0.75rem' }}>
            Check your email
          </h2>
          <p style={{ color: '#6B7280', marginBottom: '1.5rem', lineHeight: '1.6', fontSize: 14 }}>
            We sent a verification link to <strong>{formData.email}</strong>.
            Click the link in that email to verify your address and set your password.
          </p>
          {resultMessage && (
            <p style={{ color: '#6B7280', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {resultMessage}
            </p>
          )}
          {verificationUrl && (
            <div style={{
              backgroundColor: '#fff8e1', border: '1px solid #ffe082',
              borderRadius: 8, padding: '0.75rem', textAlign: 'left', marginBottom: '1rem',
            }}>
              <p style={{ margin: '0 0 0.5rem 0', color: '#795548', fontSize: '0.85rem' }}>
                Email delivery is unavailable in this environment. Open this verification link directly:
              </p>
              <a href={verificationUrl} style={{ color: '#E67E22', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                {verificationUrl}
              </a>
            </div>
          )}
          <p style={{ color: '#6B7280', fontSize: '0.85rem' }}>
            Didn&apos;t get it? Check your spam folder, or{' '}
            <button
              onClick={() => setSubmitted(false)}
              style={{ background: 'none', border: 'none', color: '#E67E22', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
            >
              try again
            </button>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={outerWrapper}>
      <div style={card}>
        {logoBlock}

        {error && (
          <div style={{
            padding: '0.75rem', marginBottom: '1rem',
            backgroundColor: '#ffebee', border: '1px solid #ffcdd2',
            borderRadius: 8, color: '#c62828', fontSize: '0.9rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>First Name</label>
            <input
              type="text" name="first_name" value={formData.first_name}
              onChange={handleChange} required disabled={loading}
              style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Last Name</label>
            <input
              type="text" name="last_name" value={formData.last_name}
              onChange={handleChange} required disabled={loading}
              style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Phone Number <span style={{ fontWeight: 400, color: '#6B7280' }}>(optional)</span>
            </label>
            <input
              type="tel" name="phone_number" value={formData.phone_number}
              onChange={handleChange} disabled={loading} maxLength={10}
              placeholder="10 digits"
              style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email" name="email" value={formData.email}
              onChange={handleChange} required disabled={loading}
              placeholder="you@example.com"
              style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'block', width: '100%', padding: 12, fontSize: 15, fontWeight: 600,
              color: '#fff', background: loading ? '#D1D5DB' : '#E67E22',
              border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
            onMouseEnter={(e) => { if (!loading) e.target.style.background = '#D35400'; }}
            onMouseLeave={(e) => { if (!loading) e.target.style.background = '#E67E22'; }}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: '#6B7280' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#E67E22', textDecoration: 'none', fontWeight: 600 }}>
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
