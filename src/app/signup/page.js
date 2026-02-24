'use client';

import Header from '@/components/Header';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!/[a-zA-Z]/.test(formData.password)) {
      setError('Password must contain at least 1 letter');
      return;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError('Password must contain at least 1 number');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
      setError('Password must contain at least 1 special character');
      return;
    }

    if (formData.phone_number && formData.phone_number.replace(/\D/g, '').length !== 10) {
      setError('Phone number must be 10 digits');
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_number: formData.phone_number,
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Account created successfully - redirect to login
        router.push('/login?signup=success');
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      <main style={{ maxWidth: '460px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div className="asrs-card">
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '700', 
            color: 'var(--color-text-primary)', 
            marginBottom: '0.5rem', 
            textAlign: 'center' 
          }}>
            Create Account
          </h1>
          <p style={{ 
            color: 'var(--color-text-secondary)', 
            marginBottom: '2rem', 
            textAlign: 'center' 
          }}>
            Sign up to get started with ASRS
          </p>

          {error && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#ffebee',
              border: '1px solid #ffcdd2',
              borderRadius: '8px',
              color: '#c62828',
              fontSize: '0.9rem',
            }}>
              {error}
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
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                disabled={loading}
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

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                color: 'var(--color-text-primary)',
                marginBottom: '0.4rem',
                fontWeight: '600',
                fontSize: '0.9rem',
              }}>
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                disabled={loading}
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

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                color: 'var(--color-text-primary)',
                marginBottom: '0.4rem',
                fontWeight: '600',
                fontSize: '0.9rem',
              }}>Phone Number </label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                required
                disabled={loading}
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
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
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

            <div style={{ marginBottom: '1.25rem' }}>
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
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
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
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
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
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div style={{ 
            marginTop: '1.5rem', 
            textAlign: 'center',
            fontSize: '0.9rem',
            color: 'var(--color-text-secondary)'
          }}>
            Already have an account?{' '}
            <Link 
              href="/login"
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              Log in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}