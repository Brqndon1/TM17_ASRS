'use client';

/**
 * ============================================================================
 * VERIFY PAGE — src/app/verify/page.js
 * ============================================================================
 * The page users land on after clicking the verification link in their email.
 *
 * Flow:
 *   1. Page loads → reads ?token= from URL → calls GET /api/auth/verify
 *   2. If valid: shows "Set your password" form
 *   3. On submit: calls POST /api/auth/verify with { token, password }
 *   4. On success: shows confirmation and redirects to /login after 3s
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState('loading'); // loading | valid | invalid | expired | success | error
  const [firstName, setFirstName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Step 1: Validate the token on page load
  useEffect(() => {
    if (!token) {
      setState('invalid');
      setErrorMessage('No verification token found. Please use the full link from your email.');
      return;
    }

    fetch(`/api/auth/verify?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFirstName(data.firstName);
          setState('valid');
        } else if (data.error?.includes('expired')) {
          setState('expired');
          setErrorMessage(data.error);
        } else {
          setState('invalid');
          setErrorMessage(data.error || 'Invalid verification link.');
        }
      })
      .catch(() => {
        setState('error');
        setErrorMessage('Something went wrong. Please try again.');
      });
  }, [token]);

  // Step 2: Submit the new password
  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
  
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
  
    if (!/[0-9]/.test(password)) {
      setFormError('Password must contain at least 1 number.');
      return;
    }
  
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setFormError('Password must contain at least 1 special character.');
      return;
    }
  
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
  
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (data.success) {
        setState('success');
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setFormError(data.error || 'Verification failed. Please try again.');
      }
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg-primary, #f5f5f5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2.5rem',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    textAlign: 'center',
  };

  const headingStyle = {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a4a8a',
    marginBottom: '0.75rem',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '1rem',
    marginBottom: '0.75rem',
    boxSizing: 'border-box',
  };

  const buttonStyle = {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#1a4a8a',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: submitting ? 'not-allowed' : 'pointer',
    opacity: submitting ? 0.7 : 1,
    marginTop: '0.5rem',
  };

  const errorBoxStyle = {
    backgroundColor: '#fff0f0',
    border: '1px solid #ffcccc',
    borderRadius: '6px',
    padding: '0.75rem 1rem',
    color: '#cc0000',
    fontSize: '0.9rem',
    marginBottom: '1rem',
    textAlign: 'left',
  };

  const successBoxStyle = {
    backgroundColor: '#f0fff4',
    border: '1px solid #b2f5c8',
    borderRadius: '6px',
    padding: '1rem',
    color: '#1a7a3a',
    fontSize: '0.95rem',
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ color: '#666' }}>Validating your link…</p>
        </div>
      </div>
    );
  }

  if (state === 'invalid' || state === 'expired' || state === 'error') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>❌</div>
          <h1 style={headingStyle}>Link {state === 'expired' ? 'Expired' : 'Invalid'}</h1>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>{errorMessage}</p>
          <button style={{ ...buttonStyle, opacity: 1, cursor: 'pointer' }} onClick={() => router.push('/login')}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
          <h1 style={headingStyle}>You're all set, {firstName}!</h1>
          <div style={successBoxStyle}>
            Your account has been verified and your password has been set.<br />
            Redirecting you to the login page…
          </div>
        </div>
      </div>
    );
  }

  // state === 'valid' — show the set password form
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔐</div>
        <h1 style={headingStyle}>Hi {firstName}, set your password</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Choose a password to complete your account setup.
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          {formError && <div style={errorBoxStyle}>{formError}</div>}

          <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: '600', fontSize: '0.9rem' }}>
            Password
          </label>
          <input
            type="password"
            style={inputStyle}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="> 8 characters, 1 special char, 1 number"
            required
            minLength={8}
          />

          <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: '600', fontSize: '0.9rem' }}>
            Confirm Password
          </label>
          <input
            type="password"
            style={inputStyle}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
          />

          <button type="submit" style={buttonStyle} disabled={submitting}>
            {submitting ? 'Setting password…' : 'Verify & Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading…</p>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
