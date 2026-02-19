'use client';

import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import SurveyForm from '@/components/SurveyForm';
import QRCodeManager from '@/components/QRCodeManager';
import { useState, useEffect } from 'react';

export default function SurveyPage() {
  const [userRole, setUserRole] = useState('public');

  // Check for logged-in user and set their role
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserRole(user.user_type || 'public');
    }
  }, []);

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

  // Distribution / auto-close state (public users only)
  const [surveyOpen, setSurveyOpen] = useState(null); // null = loading, true = open, false = closed
  const [activeDistribution, setActiveDistribution] = useState(null);

  // QR code tracking
  const [qrCodeKey, setQrCodeKey] = useState(null);
  const [scanId, setScanId] = useState(null);

  // Survey template loading
  const [surveyTemplate, setSurveyTemplate] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateResponses, setTemplateResponses] = useState({});

  // Check for an active distribution on mount (public users only)
  useEffect(() => {
    if (userRole !== 'public') return;

    // Bypass distribution check when arriving via QR code link
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('qr')) {
      setSurveyOpen(true);
      return;
    }

    fetch('/api/surveys/distributions')
      .then((res) => res.json())
      .then((data) => {
        const dists = data.distributions || [];
        const today = new Date().toISOString().split('T')[0];

        // Find a distribution that is active and whose end_date hasn't passed
        const active = dists.find(
          (d) => d.status === 'active' && d.end_date >= today
        );

        if (active) {
          setSurveyOpen(true);
          setActiveDistribution(active);
        } else {
          setSurveyOpen(false);
        }
      })
      .catch(() => {
        // If the API fails, default to allowing the survey (graceful degradation)
        setSurveyOpen(true);
      });
  }, [userRole]);

  // Load survey template if ?template= parameter is present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const templateParam = urlParams.get('template');
    if (!templateParam) return;

    setTemplateLoading(true);
    fetch(`/api/surveys/templates/${templateParam}`)
      .then((res) => {
        if (!res.ok) throw new Error('Template not found');
        return res.json();
      })
      .then((templateData) => {
        setSurveyTemplate(templateData);
      })
      .catch((err) => {
        console.error('Error loading survey template:', err);
        setError('Survey template not found. The link may be invalid or expired.');
      })
      .finally(() => {
        setTemplateLoading(false);
      });
  }, []);

  // Track QR code scan if ?qr= parameter is present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qrParam = urlParams.get('qr');
    if (!qrParam) return;

    setQrCodeKey(qrParam);

    fetch('/api/qr-codes/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCodeKey: qrParam, convertedToSubmission: false }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.scan) {
          setScanId(data.scan.scanId);
        }
        if (data.qrCode && !data.qrCode.isActive) {
          setError('This QR code has been deactivated. Please contact support.');
        } else if (data.qrCode && data.qrCode.isExpired) {
          setError('This QR code has expired. Please use a current link.');
        }
      })
      .catch((err) => {
        console.error('Error recording QR scan:', err);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate personal info
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Please fill out all required personal information fields.');
      return;
    }

    if (surveyTemplate) {
      // Template survey: validate all template questions are answered
      const questions = surveyTemplate.questions || [];
      const unanswered = questions.filter((q) => {
        const isQuestionRequired = q.text?.required ?? q.required ?? true;
        // because some surveys did not have required field, if not specified, we will treat it as required by default
        if (!isQuestionRequired) return false; // skip non-required questions
        const qId = q.id;
        return !templateResponses[qId] || !String(templateResponses[qId]).trim();
      });
      if (unanswered.length > 0) {
        setError('Please answer all questions before submitting.');
        return;
      }
    } else {
      // Default survey: validate initiative rating
      if (!initiativeRating) {
        setError('Please fill out all required fields.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let payload;

      if (surveyTemplate) {
        payload = {
          name: `${firstName.trim()} ${lastName.trim()}`,
          email: email.trim(),
          responses: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            templateId: surveyTemplate.id,
            templateTitle: surveyTemplate.title,
            templateAnswers: templateResponses,
          },
        };
      } else {
        payload = {
          name: `${firstName.trim()} ${lastName.trim()}`,
          email: email.trim(),
          responses: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            initiativeRating,
            initiativeComments: initiativeComments.trim(),
          },
        };
      }

      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit survey.');
      }

      // Track QR code conversion
      if (qrCodeKey && scanId) {
        fetch('/api/qr-codes/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrCodeKey, convertedToSubmission: true }),
        }).catch(() => {});
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
    setTemplateResponses({});
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
      <Header />

      <main style={{ 
        maxWidth: userRole === 'public' ? '680px' : '1100px', 
        margin: '0 auto', 
        padding: userRole === 'public' ? '2rem 1.5rem' : '1.5rem' 
      }}>
        <BackButton />
        {userRole === 'public' ? (
          // Public user view - Take a Survey (completed form)
          <div className="asrs-card">
            {/* ---- Loading distribution check ---- */}
            {surveyOpen === null ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                  Checking survey availability…
                </p>
              </div>
            ) : !surveyOpen ? (
              /* ---- Survey Closed State ---- */
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔒</div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                  Survey Closed
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem', lineHeight: 1.6 }}>
                  This survey is no longer accepting responses.<br />
                  The submission deadline has passed.
                </p>
                <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                  If you believe this is an error, please contact the survey administrator.
                </p>
              </div>
            ) : (
              /* ---- Survey Open — show form ---- */
              <>
            {/* Show loading state while template is being fetched */}
            {templateLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                  Loading survey...
                </p>
              </div>
            ) : (
              <>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
              {surveyTemplate ? surveyTemplate.title : 'Take a Survey'}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
              {surveyTemplate
                ? (surveyTemplate.description || 'Please complete the survey below.')
                : <>Share your feedback on the initiative. All fields marked with <span style={{ color: 'var(--color-asrs-red)' }}>*</span> are required.</>
              }
            </p>
            {activeDistribution && (
              <p style={{ color: 'var(--color-text-light)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                Open until <strong>{activeDistribution.end_date}</strong>
              </p>
            )}

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

                {surveyTemplate ? (
                  /* ---- Section: Template Questions ---- */
                  <div style={{
                    borderBottom: '1px solid var(--color-bg-tertiary)',
                    paddingBottom: '1.25rem',
                    marginBottom: '1.5rem',
                  }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-asrs-dark)', marginBottom: '1rem' }}>
                      Survey Questions
                    </h2>

                    {(surveyTemplate.questions || []).map((q, index) => {
                      // Handle both formats:
                      // Old: { id, text: { question, type, options } }
                      // New: { id, question, type, options }
                      const questionText = q.text?.question || q.question || '';
                      const questionType = q.text?.type || q.type || 'text';
                      const questionOptions = q.text?.options || q.options || [];
                      const qId = q.id;
                      const isRequired = q.text?.required ?? q.required ?? true;

                      return (
                        <div key={qId} style={fieldGroupStyle}>
                          <label style={labelStyle}>
                            {index + 1}. {questionText} {isRequired && <span style={{ color: 'var(--color-asrs-red)' }}>*</span>}
                          </label>

                          {questionType === 'text' && (
                            <textarea
                              value={templateResponses[qId] || ''}
                              onChange={(e) => setTemplateResponses({
                                ...templateResponses,
                                [qId]: e.target.value,
                              })}
                              rows={3}
                              placeholder="Enter your response..."
                              style={{
                                ...inputStyle,
                                resize: 'vertical',
                                fontFamily: 'inherit',
                              }}
                              required={isRequired}
                            />
                          )}

                          {questionType === 'numeric' && (
                            <input
                              type="number"
                              value={templateResponses[qId] || ''}
                              onChange={(e) => setTemplateResponses({
                                ...templateResponses,
                                [qId]: e.target.value,
                              })}
                              placeholder="Enter a number"
                              style={inputStyle}
                              required={isRequired}
                            />
                          )}

                          {questionType === 'choice' && questionOptions.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {questionOptions.map((option) => (
                                <label
                                  key={option}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.65rem',
                                    padding: '0.6rem 0.85rem',
                                    borderRadius: '8px',
                                    border: templateResponses[qId] === option
                                      ? '2px solid var(--color-asrs-orange)'
                                      : '1px solid var(--color-bg-tertiary)',
                                    backgroundColor: templateResponses[qId] === option
                                      ? '#fdf4e8'
                                      : 'var(--color-bg-primary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name={`question_${qId}`}
                                    value={option}
                                    checked={templateResponses[qId] === option}
                                    onChange={(e) => setTemplateResponses({
                                      ...templateResponses,
                                      [qId]: e.target.value,
                                    })}
                                    style={{ accentColor: 'var(--color-asrs-orange)' }}
                                    required={isRequired}
                                  />
                                  <span style={{ fontSize: '0.92rem', color: 'var(--color-text-primary)' }}>
                                    {option}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ---- Section: Default Initiative Feedback ---- */
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
                        placeholder="Share any additional thoughts or suggestions..."
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
                )}

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
                    {isSubmitting ? 'Submitting...' : 'Submit Survey'}
                  </button>
                </div>
              </form>
            )}
              </>
            )}
              </>
            )}
          </div>
        ) : (
          // Staff/Admin user view - Create Survey & QR Code Management
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

            {/* Survey Template Creation Form */}
            <SurveyForm />

            {/* QR Code Generator & Management */}
            <div style={{ marginTop: '2rem' }}>
              <QRCodeManager
                qrType="survey"
                showStats={true}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}