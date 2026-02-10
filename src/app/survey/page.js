'use client';

import Header from '@/components/Header';
import SurveyForm from '@/components/SurveyForm';
import { useState } from 'react';

export default function SurveyPage() {
  const [userRole, setUserRole] = useState('public');

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [initiativeRating, setInitiativeRating] = useState('');
  const [initiativeComments, setInitiativeComments] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic client-side validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !initiativeRating) {
      setError('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim(),
        responses: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          initiativeRating,
          initiativeComments: initiativeComments.trim(),
        },
      };

      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit survey.');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setInitiativeRating('');
    setInitiativeComments('');
    setSubmitted(false);
    setError(null);
  };

  // Shared input style
  const inputStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: '8px',
    border: '1px solid var(--color-bg-tertiary)',
    backgroundColor: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontWeight: '600',
    fontSize: '0.9rem',
    color: 'var(--color-text-primary)',
    marginBottom: '0.35rem',
  };

  const fieldGroupStyle = {
    marginBottom: '1.25rem',
  };

  // Rating options
  const ratingOptions = [
    { value: 'very_satisfied', label: 'Very Satisfied', emoji: '😍' },
    { value: 'satisfied', label: 'Satisfied', emoji: '😊' },
    { value: 'neutral', label: 'Neutral', emoji: '😐' },
    { value: 'dissatisfied', label: 'Dissatisfied', emoji: '😕' },
    { value: 'very_dissatisfied', label: 'Very Dissatisfied', emoji: '😞' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header userRole={userRole} onRoleChange={setUserRole} />

      <main style={{ 
        maxWidth: userRole === 'public' ? '680px' : '1100px', 
        margin: '0 auto', 
        padding: userRole === 'public' ? '2rem 1.5rem' : '1.5rem' 
      }}>
        {userRole === 'public' ? (
          // Public user view - Take a Survey (completed form)
          <div className="asrs-card">
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
              Take a Survey
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.75rem' }}>
              Share your feedback on the initiative. All fields marked with <span style={{ color: 'var(--color-asrs-red)' }}>*</span> are required.
            </p>

            {/* ---- Success State ---- */}
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                  Thank You!
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  Your survey response has been submitted successfully.<br />
                  Your feedback helps improve future initiatives.
                </p>
                <button
                  onClick={handleReset}
                  className="asrs-btn-primary"
                  style={{ padding: '0.7rem 2rem', fontSize: '0.95rem' }}
                >
                  Submit Another Response
                </button>
              </div>
            ) : (
              /* ---- Survey Form ---- */
              <form onSubmit={handleSubmit}>
                {/* Error banner */}
                {error && (
                  <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    color: '#b91c1c',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                  }}>
                    {error}
                  </div>
                )}

                {/* ---- Section: Personal Information ---- */}
                <div style={{
                  borderBottom: '1px solid var(--color-bg-tertiary)',
                  paddingBottom: '1.25rem',
                  marginBottom: '1.25rem',
                }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-asrs-dark)', marginBottom: '1rem' }}>
                    Personal Information
                  </h2>

                  {/* First Name & Last Name – side by side */}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ ...fieldGroupStyle, flex: '1 1 45%', minWidth: '200px' }}>
                      <label style={labelStyle}>
                        First Name <span style={{ color: 'var(--color-asrs-red)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div style={{ ...fieldGroupStyle, flex: '1 1 45%', minWidth: '200px' }}>
                      <label style={labelStyle}>
                        Last Name <span style={{ color: 'var(--color-asrs-red)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        style={inputStyle}
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>
                      Email Address <span style={{ color: 'var(--color-asrs-red)' }}>*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="john.doe@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>

                {/* ---- Section: Initiative Feedback ---- */}
                <div style={{
                  borderBottom: '1px solid var(--color-bg-tertiary)',
                  paddingBottom: '1.25rem',
                  marginBottom: '1.5rem',
                }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-asrs-dark)', marginBottom: '1rem' }}>
                    Initiative Feedback
                  </h2>

                  {/* Rating question */}
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>
                      How do you like your initiative? <span style={{ color: 'var(--color-asrs-red)' }}>*</span>
                    </label>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-light)', marginBottom: '0.65rem' }}>
                      Select the option that best describes your experience.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {ratingOptions.map((option) => (
                        <label
                          key={option.value}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            padding: '0.6rem 0.85rem',
                            borderRadius: '8px',
                            border: initiativeRating === option.value
                              ? '2px solid var(--color-asrs-orange)'
                              : '1px solid var(--color-bg-tertiary)',
                            backgroundColor: initiativeRating === option.value
                              ? '#fdf4e8'
                              : 'var(--color-bg-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="radio"
                            name="initiativeRating"
                            value={option.value}
                            checked={initiativeRating === option.value}
                            onChange={(e) => setInitiativeRating(e.target.value)}
                            style={{ accentColor: 'var(--color-asrs-orange)' }}
                          />
                          <span style={{ fontSize: '1.15rem' }}>{option.emoji}</span>
                          <span style={{ fontSize: '0.92rem', color: 'var(--color-text-primary)' }}>
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Additional comments */}
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>
                      Additional Comments
                    </label>
                    <textarea
                      placeholder="Share any additional thoughts or suggestions…"
                      value={initiativeComments}
                      onChange={(e) => setInitiativeComments(e.target.value)}
                      rows={4}
                      style={{
                        ...inputStyle,
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                </div>

                {/* ---- Submit Button ---- */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="asrs-btn-secondary"
                    disabled={isSubmitting}
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    className="asrs-btn-primary"
                    disabled={isSubmitting}
                    style={{
                      padding: '0.65rem 2rem',
                      fontSize: '0.95rem',
                      opacity: isSubmitting ? 0.7 : 1,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? 'Submitting…' : 'Submit Survey'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          // Staff/Admin user view - Create Survey
          <section>
            <div style={{ 
              justifyContent: 'center', 
              textAlign: 'center', 
              alignItems: 'center', 
              display: 'flex', 
              gap: '1rem', 
              marginBottom: '1rem' 
            }}>
              <div>
                <h1 style={{ margin: 0, fontWeight: 'bold' }}>Create Survey</h1>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                  Create a survey to send out to the public!
                </p>
              </div>
            </div>
            <SurveyForm />
          </section>
        )}
      </main>
    </div>
  );
}