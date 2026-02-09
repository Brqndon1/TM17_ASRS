'use client';

import Header from '@/components/Header';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
// Attribute catalog - common attributes available for initiatives
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
  const router = useRouter();
  const [userRole, setUserRole] = useState('staff');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [addQuestions, setAddQuestions] = useState(false);
  const [questions, setQuestions] = useState(['']);
  const [status, setStatus] = useState('draft'); // draft, active, archived
  const [isPublic, setIsPublic] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAttributeToggle = (attribute) => {
    setSelectedAttributes(prev => 
      prev.includes(attribute)
        ? prev.filter(a => a !== attribute)
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
    let file_submitted = false;
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

    const cleanedQuestions = addQuestions ? questions.map(q => q.trim()).filter(Boolean): [];


    try {
      const response = await fetch('/api/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          attributes: selectedAttributes,
          questions: cleanedQuestions,
          settings: {
            status,
            isPublic,
          },
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
        setStatus('draft');
        setIsPublic(false);
        setTimeout(() => {
          router.push('/');
        }, 2000);
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
      <Header userRole={userRole} onRoleChange={setUserRole} />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="asrs-card">
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            Initiative Creation
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            Create and configure new ASRS initiatives. Define the initiative name, description, attributes, and associated settings.
          </p>

          {/* {message && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1.5rem',
              backgroundColor: message.includes('') ? '#e8f5e9' : '#ffebee',
              border: `1px solid ${message.includes('') ? '#c8e6c9' : '#ffcdd2'}`,
              borderRadius: '8px',
              color: message.includes('') ? '#2e7d32' : '#c62828',
              fontSize: '0.9rem',
            }}>
              {message}
            </div>
          )} */}

          <form onSubmit={handleSubmit}>
            {/* Initiative Name */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: 'var(--color-text-primary)',
                marginBottom: '0.5rem',
                fontWeight: '600',
                fontSize: '0.95rem',
              }}>
                Initiative Name <span style={{ color: '#c62828' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., E-Gaming and Careers"
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

            {/* Description */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: 'var(--color-text-primary)',
                marginBottom: '0.5rem',
                fontWeight: '600',
                fontSize: '0.95rem',
              }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the initiative's purpose and goals..."
                rows={4}
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
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Attribute Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: 'var(--color-text-primary)',
                marginBottom: '0.5rem',
                fontWeight: '600',
                fontSize: '0.95rem',
              }}>
                Attributes <span style={{ color: '#c62828' }}>*</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>
                  ({selectedAttributes.length} selected)
                </span>
              </label>
              <div style={{
                border: '1px solid var(--color-bg-tertiary)',
                borderRadius: '8px',
                padding: '0.75rem',
                backgroundColor: 'white',
                maxHeight: '200px',
                overflowY: 'auto',
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '0.5rem',
                }}>
                  {ATTRIBUTE_CATALOG.map((attribute) => (
                    <label
                      key={attribute}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        backgroundColor: selectedAttributes.includes(attribute) 
                          ? 'var(--color-bg-secondary)' 
                          : 'transparent',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAttributes.includes(attribute)}
                        onChange={() => handleAttributeToggle(attribute)}
                        style={{
                          marginRight: '0.5rem',
                          cursor: 'pointer',
                        }}
                      />
                      <span style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                        {attribute}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Initiative-Level Settings */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: 'var(--color-text-primary)',
                marginBottom: '0.75rem',
                fontWeight: '600',
                fontSize: '0.95rem',
              }}>
                Initiative-Level Settings
              </label>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  fontSize: '0.9rem',
                }}>
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
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
                    cursor: 'pointer',
                  }}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: 'var(--color-bg-secondary)',
                transition: 'background-color 0.2s',
              }}>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  style={{
                    marginRight: '0.75rem',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                  Make this initiative publicly visible
                </span>
              </label>
            </div>

            {/* Initiative Questions */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: 'var(--color-text-primary)',
                marginBottom: '0.75rem',
                fontWeight: '600',
                fontSize: '0.95rem',
              }}>
                Initiative Questions
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: 'var(--color-bg-secondary)',
                marginBottom: '0.75rem',
              }}>
                <input
                  type="checkbox"
                  checked={addQuestions}
                  onChange={(e) => setAddQuestions(e.target.checked)}
                  style={{ marginRight: '0.75rem' }}
                />
                <span style={{ fontSize: '0.9rem' }}>
                  Add Questions
                </span>
              </label>

              {addQuestions && (
                <div>
                  {questions.map((q, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        type="text"
                        value={q}
                        onChange={(e) => handleQuestionChange(i, e.target.value)}
                        placeholder={`Question ${i + 1}`}
                        style={{
                          flex: 1,
                          padding: '0.625rem 0.75rem',
                          border: '1px solid var(--color-bg-tertiary)',
                          borderRadius: '8px',
                          fontSize: '0.95rem',
                          backgroundColor: 'white',
                        }}
                      />

                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestionField(i)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #ccc',
                            background: '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addQuestionField}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--color-bg-tertiary)',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    + Add another question
                  </button>
                </div>
              )}
            </div>


            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="asrs-btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                opacity: isSubmitting ? 0.6 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Creating...' : 'Create Initiative'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
