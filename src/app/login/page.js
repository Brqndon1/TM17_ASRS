'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth/use-auth-store';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(() => {
    if (typeof window === 'undefined') return '';
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('signup') === 'success'
      ? 'Account created successfully! Please log in.'
      : '';
  });

  // Active surveys for public access
  const [activeSurveys, setActiveSurveys] = useState([]);
  const [surveysLoading, setSurveysLoading] = useState(true);

  useEffect(() => {
    fetch('/api/surveys/active')
      .then((res) => res.ok ? res.json() : { surveys: [] })
      .then((data) => setActiveSurveys(data.surveys || []))
      .catch(() => setActiveSurveys([]))
      .finally(() => setSurveysLoading(false));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setLoading(true);

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
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = message && !message.toLowerCase().includes('error') && !message.toLowerCase().includes('failed');

  return (
    <div style={{
      minHeight: '100vh', background: '#F9FAFB',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Login Card */}
        <div style={{
          background: '#fff', width: '100%',
          border: '1px solid #E5E7EB', borderRadius: 12, padding: 32, marginBottom: 20,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <img src="/asrs-logo.png" alt="ASRS" style={{ width: 48, height: 48, borderRadius: 8, marginBottom: 16 }} />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>ASRS Initiatives</h1>
            <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>Reporting System</p>
          </div>

          {message && (
            <div style={{
              padding: '0.75rem', marginBottom: '1rem',
              backgroundColor: isSuccess ? '#e8f5e9' : '#ffebee',
              border: `1px solid ${isSuccess ? '#c8e6c9' : '#ffcdd2'}`,
              borderRadius: 8,
              color: isSuccess ? '#2e7d32' : '#c62828',
              fontSize: '0.9rem',
            }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%', padding: '10px 14px', fontSize: 15,
                  border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff',
                  color: '#111827', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#E67E22'; e.target.style.boxShadow = '0 0 0 3px rgba(230,126,34,.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                style={{
                  width: '100%', padding: '10px 14px', fontSize: 15,
                  border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff',
                  color: '#111827', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#E67E22'; e.target.style.boxShadow = '0 0 0 3px rgba(230,126,34,.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: '#6B7280' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: '#E67E22', textDecoration: 'none', fontWeight: 600 }}>
              Sign up
            </Link>
          </div>

          <div style={{
            marginTop: 24, padding: '1rem',
            backgroundColor: '#f5f5f5', borderRadius: 8,
            fontSize: '0.85rem', lineHeight: '1.6',
          }}>
            <strong>Test Accounts:</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div style={testAccountCardStyle}>
                <div style={{ fontWeight: '600', color: '#c0392b', marginBottom: '0.25rem' }}>Admin</div>
                <div>Email: <code style={{ fontSize: '0.8rem' }}>admin@test.com</code></div>
                <div>Password: <code style={{ fontSize: '0.8rem' }}>admin123</code></div>
              </div>
              <div style={testAccountCardStyle}>
                <div style={{ fontWeight: '600', color: '#E67E22', marginBottom: '0.25rem' }}>Staff</div>
                <div>Email: <code style={{ fontSize: '0.8rem' }}>staff@test.com</code></div>
                <div>Password: <code style={{ fontSize: '0.8rem' }}>staff123</code></div>
              </div>
            </div>
          </div>
        </div>

        {/* Available Surveys Card */}
        <div style={{
          background: '#fff', width: '100%',
          border: '1px solid #E5E7EB', borderRadius: 12, padding: 24,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
            Take a Survey
          </h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 16px' }}>
            No account needed. Choose a survey below to participate.
          </p>

          {surveysLoading ? (
            <p style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>Loading available surveys...</p>
          ) : activeSurveys.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>No surveys are currently open.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeSurveys.map((survey) => (
                <Link
                  key={survey.id}
                  href={`/survey?template=${survey.templateId}`}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: 8, border: '1px solid #E5E7EB',
                    textDecoration: 'none', color: '#111827',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E67E22'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(230,126,34,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{survey.title}</div>
                    {survey.initiativeName && (
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{survey.initiativeName}</div>
                    )}
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Open until {survey.endDate}</div>
                  </div>
                  <span style={{ color: '#E67E22', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>Take Survey &rarr;</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const testAccountCardStyle = {
  padding: '0.5rem 0.75rem',
  backgroundColor: 'white',
  borderRadius: '6px',
  border: '1px solid #e0e0e0',
};
