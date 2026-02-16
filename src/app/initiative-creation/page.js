'use client';

import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ATTRIBUTE_CATALOG = [
  'Grade',
  'School',
  'Interest Level',
  'Career Awareness',
  'Participation Count',
  'Session Rating',
  'Completion Status',
  'Safety Score',
  'Project Completion',
  'Team Size',
  'Robot Performance',
  'Attendance Rate',
  'Reading Level',
  'Award Type',
  'Improvement Score',
  'Semester',
  'Bags Collected',
  'Families Helped',
  'Volunteer Count',
  'Donation Value',
  'Event Date',
  'Event Type',
  'Personal Best',
  'Team Placement',
  'Practice Attendance',
  'Season',
  'Proposal Topic',
  'Score',
  'Award Level',
  'Reviewer Rating',
  'Submission Date',
  'Product Category',
  'Innovation Score',
  'Presentation Rating',
  'Feasibility Score',
];

export default function InitiativeCreationPage() {

  const [userRole, setUserRole] = useState('public');

  // Check for logged-in user and set their role
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserRole(user.user_type || 'public');
    }
  }, []);

  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [addQuestions, setAddQuestions] = useState(false);
  const [questions, setQuestions] = useState(['']);
  const [status, setStatus] = useState('Active');
  const [isPublic, setIsPublic] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAttributeToggle = (attribute) => {
    setSelectedAttributes((prev) =>
      prev.includes(attribute)
        ? prev.filter((a) => a !== attribute)
        : [...prev, attribute]
    );
  };

  const handleQuestionChange = (index, value) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  const addQuestionField = () => {
    setQuestions([...questions, '']);
  };

  const removeQuestionField = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    if (!name.trim()) {
      setMessage('Please enter an initiative name.');
      setIsSubmitting(false);
      return;
    }

    if (selectedAttributes.length === 0) {
      setMessage('Please select at least one attribute.');
      setIsSubmitting(false);
      return;
    }

    const cleanedQuestions = addQuestions
      ? questions.map((q) => q.trim()).filter(Boolean)
      : [];

    try {
      const response = await fetch('/api/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          attributes: selectedAttributes,
          questions: cleanedQuestions,
          settings: { status, isPublic },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Initiative created successfully!');
        setName('');
        setDescription('');
        setSelectedAttributes([]);
        setAddQuestions(false);
        setQuestions(['']);
        setStatus('Active');
        setIsPublic(false);
        setTimeout(() => router.push('/'), 2000);
      } else {
        setMessage(`${data.error || 'Failed to create initiative'}`);
      }
    } catch (error) {
      setMessage('Connection error. Please try again.');
      console.error('Error creating initiative:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <BackButton />
        
        {userRole === 'admin' ? (
          <>
            {/* Page Header */}
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{
                fontSize: '1.75rem',
                fontWeight: '700',
                color: 'var(--color-text-primary)',
                marginBottom: '0.4rem',
              }}>
                Create Initiative
              </h1>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                Define a new ASRS initiative with its name, description, attributes, and settings.
              </p>
            </div>

            {/* Status Message */}
            {message && (
              <div style={{
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                backgroundColor: message.includes('successfully') ? '#e8f5e9' : '#ffebee',
                border: `1px solid ${message.includes('successfully') ? '#c8e6c9' : '#ffcdd2'}`,
                borderRadius: '8px',
                color: message.includes('successfully') ? '#2e7d32' : '#c62828',
                fontSize: '0.9rem',
              }}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* ── Name & Description ─────────────────────── */}
              <div className="asrs-card" style={{ marginBottom: '1.25rem' }}>
                <h2 style={sectionHeadingStyle}>Basic Information</h2>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={labelStyle}>
                    Initiative Name <span style={{ color: '#c62828' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., E-Gaming and Careers"
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the initiative's purpose and goals..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* ── Attributes ─────────────────────────────── */}
              <div className="asrs-card" style={{ marginBottom: '1.25rem' }}>
                <h2 style={sectionHeadingStyle}>
                  Attributes{' '}
                  <span style={{ color: '#c62828', fontSize: '0.85rem' }}>*</span>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: '400',
                    color: 'var(--color-text-light)',
                    marginLeft: '0.5rem',
                  }}>
                    {selectedAttributes.length} selected
                  </span>
                </h2>

                <div style={{
                  maxHeight: '240px',
                  overflowY: 'auto',
                  border: '1px solid var(--color-bg-tertiary)',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  backgroundColor: 'var(--color-bg-primary)',
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '0.25rem',
                  }}>
                    {ATTRIBUTE_CATALOG.map((attribute) => {
                      const isSelected = selectedAttributes.includes(attribute);
                      return (
                        <label
                          key={attribute}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '6px',
                            backgroundColor: isSelected ? 'var(--color-bg-secondary)' : 'transparent',
                            border: isSelected ? '1px solid var(--color-bg-tertiary)' : '1px solid transparent',
                            transition: 'all 0.15s ease',
                            fontSize: '0.85rem',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleAttributeToggle(attribute)}
                            style={{ marginRight: '0.5rem', cursor: 'pointer', accentColor: 'var(--color-asrs-orange)' }}
                          />
                          <span style={{ color: 'var(--color-text-primary)' }}>{attribute}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Settings ───────────────────────────────── */}
              <div className="asrs-card" style={{ marginBottom: '1.25rem' }}>
                <h2 style={sectionHeadingStyle}>Settings</h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      padding: '0.625rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-bg-tertiary)',
                      width: '100%',
                      transition: 'background-color 0.15s ease',
                    }}>
                      <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        style={{ marginRight: '0.6rem', cursor: 'pointer', accentColor: 'var(--color-asrs-orange)' }}
                      />
                      <span style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                        Publicly visible
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* ── Questions ──────────────────────────────── */}
              <div className="asrs-card" style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: addQuestions ? '1rem' : 0 }}>
                  <h2 style={{ ...sectionHeadingStyle, marginBottom: 0 }}>Questions</h2>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                  }}>
                    <input
                      type="checkbox"
                      checked={addQuestions}
                      onChange={(e) => setAddQuestions(e.target.checked)}
                      style={{ marginRight: '0.4rem', cursor: 'pointer', accentColor: 'var(--color-asrs-orange)' }}
                    />
                    Add questions
                  </label>
                </div>

                {addQuestions && (
                  <div>
                    {questions.map((q, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          type="text"
                          value={q}
                          onChange={(e) => handleQuestionChange(i, e.target.value)}
                          placeholder={`Question ${i + 1}`}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestionField(i)}
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderRadius: '6px',
                              border: '1px solid var(--color-bg-tertiary)',
                              background: 'white',
                              cursor: 'pointer',
                              color: '#c62828',
                              fontWeight: '600',
                              fontSize: '0.85rem',
                              transition: 'background-color 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addQuestionField}
                      className="asrs-btn-secondary"
                      style={{ marginTop: '0.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    >
                      + Add another question
                    </button>
                  </div>
                )}
              </div>

              {/* ── Submit ─────────────────────────────────── */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="asrs-btn-primary"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontSize: '1rem',
                  opacity: isSubmitting ? 0.6 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? 'Creating...' : 'Create Initiative'}
              </button>
            </form>
          </>
        ) : (
          <div className="asrs-card">
            {/* Survey Closed State */}
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔒</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                Unauthorized Access
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem', lineHeight: 1.6 }}>
                Only staff and admin can create initiatives.<br />
              </p>
              <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                If you believe this is an error, please contact the administrator.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────

const sectionHeadingStyle = {
  fontSize: '1rem',
  fontWeight: '700',
  color: 'var(--color-text-primary)',
  marginBottom: '1rem',
  paddingBottom: '0.5rem',
  borderBottom: '1px solid var(--color-bg-tertiary)',
};

const labelStyle = {
  display: 'block',
  color: 'var(--color-text-primary)',
  marginBottom: '0.4rem',
  fontWeight: '600',
  fontSize: '0.9rem',
};

const inputStyle = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid var(--color-bg-tertiary)',
  borderRadius: '8px',
  fontSize: '0.9rem',
  color: 'var(--color-text-primary)',
  backgroundColor: 'white',
  outline: 'none',
  boxSizing: 'border-box',
};