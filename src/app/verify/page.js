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

  // ── Shared layout ───────────────────────────────────────────────────────────
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

  const errorBoxStyle = {
    backgroundColor: '#ffebee', border: '1px solid #ffcdd2',
    borderRadius: 8, padding: '0.75rem 1rem',
    color: '#c62828', fontSize: '0.9rem', marginBottom: '1rem',
  };

  const successBoxStyle = {
    backgroundColor: '#f0fff4', border: '1px solid #b2f5c8',
    borderRadius: 8, padding: '1rem',
    color: '#1a7a3a', fontSize: '0.95rem',
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div style={outerWrapper}>
        <div style={card}>
          {logoBlock}
          <p style={{ color: '#6B7280', textAlign: 'center' }}>Validating your link…</p>
        </div>
      </div>
    );
  }

  if (state === 'invalid' || state === 'expired' || state === 'error') {
    return (
      <div style={outerWrapper}>
        <div style={{ ...card, textAlign: 'center' }}>
          {logoBlock}
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>❌</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>
            Link {state === 'expired' ? 'Expired' : 'Invalid'}
          </h2>
          <p style={{ color: '#6B7280', marginBottom: '1.5rem', fontSize: 14 }}>{errorMessage}</p>
          <button
            style={{
              display: 'block', width: '100%', padding: 12, fontSize: 15, fontWeight: 600,
              color: '#fff', background: '#E67E22',
              border: 'none', borderRadius: 8, cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.target.style.background = '#D35400'; }}
            onMouseLeave={(e) => { e.target.style.background = '#E67E22'; }}
            onClick={() => router.push('/login')}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div style={outerWrapper}>
        <div style={{ ...card, textAlign: 'center' }}>
          {logoBlock}
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>
            You&apos;re all set, {firstName}!
          </h2>
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
    <div style={outerWrapper}>
      <div style={card}>
        {logoBlock}
        <div style={{ fontSize: '2rem', textAlign: 'center', marginBottom: 8 }}>🔐</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: 8 }}>
          Hi {firstName}, set your password
        </h2>
        <p style={{ color: '#6B7280', textAlign: 'center', marginBottom: 24, fontSize: 14 }}>
          Choose a password to complete your account setup.
        </p>

        <form onSubmit={handleSubmit}>
          {formError && <div style={errorBoxStyle}>{formError}</div>}

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="> 8 characters, 1 special char, 1 number"
              required
              minLength={8}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              display: 'block', width: '100%', padding: 12, fontSize: 15, fontWeight: 600,
              color: '#fff', background: submitting ? '#D1D5DB' : '#E67E22',
              border: 'none', borderRadius: 8, cursor: submitting ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
            onMouseEnter={(e) => { if (!submitting) e.target.style.background = '#D35400'; }}
            onMouseLeave={(e) => { if (!submitting) e.target.style.background = '#E67E22'; }}
          >
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
