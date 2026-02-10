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

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="asrs-card">
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            Take a Survey
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            Select an initiative and fill out the available survey form. Your responses are stored and used for reporting.
          </p>

          <div style={{
            border: '2px dashed var(--color-bg-tertiary)',
            borderRadius: '12px',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: 'var(--color-text-light)',
          }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Survey Form</p>
            <p style={{ fontSize: '0.9rem' }}>
              This page will display the active survey form for a selected initiative.
              Users fill in the dynamically rendered fields and submit their responses.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}