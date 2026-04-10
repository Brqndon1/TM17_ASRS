'use client';

import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import SurveyForm from '@/components/SurveyForm';
import QRCodeManager from '@/components/QRCodeManager';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { toSurveyTemplateViewModel } from '@/lib/adapters/survey-template-adapter';
import { validateFieldValue } from '@/lib/field-validation';

export default function SurveyPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);
  const [isQrAccess] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(new URLSearchParams(window.location.search).get('qr'));
  });
  const userRole = user?.user_type || 'public';
  const isPublicView = isQrAccess || userRole === 'public';

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [initiativeRating, setInitiativeRating] = useState('');
  const [initiativeComments, setInitiativeComments] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionInfo, setSubmissionInfo] = useState(null);
  const [error, setError] = useState(null);

  // Invalid fields tracking
  const [invalidFields, setInvalidFields] = useState({});

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
  const [staffTemplates, setStaffTemplates] = useState([]);
  const [staffQrCodes, setStaffQrCodes] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [copiedQrKey, setCopiedQrKey] = useState('');

  useEffect(() => {
    setIsMounted(true);

    if (isQrAccess) {
      setSurveyOpen(true);
    }
  }, [isQrAccess]);

  // Check for an active distribution on mount (public users only)
  useEffect(() => {
    if (!isPublicView) return;

    // Bypass distribution check when arriving via QR code link
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('qr')) {
      setSurveyOpen(true);
      return;
    }

    fetch('/api/surveys/distributions')
      .then((res) => {
        if (!res.ok) throw new Error('Not authorized');
        return res.json();
      })
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
  }, [isPublicView]);

  // Load survey template if ?template= parameter is present,
  // or if there is an active distribution and no ?template= in the URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const templateParam = urlParams.get('template');

    // Helper to fetch template by id
    const fetchTemplate = (id) => {
      setTemplateLoading(true);
      fetch(`/api/surveys/templates/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Template not found');
          return res.json();
        })
        .then((templateData) => {
          setSurveyTemplate(toSurveyTemplateViewModel(templateData));
        })
        .catch((err) => {
          console.error('Error loading survey template:', err);
          setError('Survey template not found. The link may be invalid or expired.');
        })
        .finally(() => {
          setTemplateLoading(false);
        });
    };

    if (templateParam) {
      fetchTemplate(templateParam);
    } else if (activeDistribution && activeDistribution.survey_template_id) {
      fetchTemplate(activeDistribution.survey_template_id);
    }
  }, [activeDistribution]);

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

  useEffect(() => {
    if (isPublicView) return;

    let isCancelled = false;
    setStaffLoading(true);
    setStaffError('');

    Promise.all([
      fetch('/api/surveys/templates').then((res) => (res.ok ? res.json() : [])),
      fetch('/api/qr-codes?scope=survey').then((res) => (res.ok ? res.json() : { qrCodes: [] })),
    ])
      .then(([templatesData, qrCodesData]) => {
        if (isCancelled) return;
        setStaffTemplates(Array.isArray(templatesData) ? templatesData : []);
        setStaffQrCodes(Array.isArray(qrCodesData?.qrCodes) ? qrCodesData.qrCodes : []);
      })
      .catch(() => {
        if (isCancelled) return;
        setStaffTemplates([]);
        setStaffQrCodes([]);
        setStaffError('Unable to load survey QR inventory right now.');
      })
      .finally(() => {
        if (isCancelled) return;
        setStaffLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isPublicView]);

  const handleCopyQrUrl = async (qrCode) => {
    try {
      await navigator.clipboard.writeText(qrCode.targetUrl);
      setCopiedQrKey(qrCode.qrCodeKey);
      setTimeout(() => setCopiedQrKey(''), 1500);
    } catch {
      setStaffError('Copy failed. Please copy the URL manually.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSubmitting) return;
    setError(null);

    const newInvalidFields = {};

    // Validate personal info
    if (!firstName.trim()) newInvalidFields.firstName = true;
    if (!lastName.trim()) newInvalidFields.lastName = true;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newInvalidFields.email = true;

    if (surveyTemplate) {
      // Template survey: validate all required template questions
      const questions = surveyTemplate.questions || [];
      questions.forEach((q) => {
        const isQuestionRequired = q.required ?? q.text?.required ?? true;
        if (!isQuestionRequired) return;
        const qId = q.id;
        const questionType = q.type || q.text?.type || 'text';
        const questionSubQuestions = q.subQuestions || q.text?.subQuestions || [];

        if (questionType === 'yesno') {
          const answers = templateResponses[qId] || {};
          if (Object.keys(answers).length < questionSubQuestions.length) {
            newInvalidFields[`question_${qId}`] = true;
          }
        } else if (questionType === 'multiselect') {
          if (!templateResponses[qId] || templateResponses[qId].length === 0) {
            newInvalidFields[`question_${qId}`] = true;
          }
        } else if (questionType === 'boolean') {
          if (templateResponses[qId] === undefined || templateResponses[qId] === null) {
            newInvalidFields[`question_${qId}`] = true;
          }
        } else {
          if (templateResponses[qId] === undefined || templateResponses[qId] === null || !String(templateResponses[qId]).trim()) {
            newInvalidFields[`question_${qId}`] = true;
          }
        }
      });
    } else {
      // Default survey: validate initiative rating
      if (!initiativeRating) newInvalidFields.initiativeRating = true;
    }

    if (Object.keys(newInvalidFields).length > 0) {
      setInvalidFields(newInvalidFields);
      setError('Please fill out all required fields.');
      // Scroll to first invalid field
      const firstKey = Object.keys(newInvalidFields)[0];
      const fieldId = firstKey.startsWith('question_')
        ? `field-${firstKey}`
        : `field-${firstKey}`;
      setTimeout(() => {
        const el = document.getElementById(`field-${firstKey}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    // Validate against field rules
    if (surveyTemplate && surveyTemplate.questions) {
      const fieldErrors = {};
      for (const q of surveyTemplate.questions) {
        const qId = q.id;
        const value = templateResponses[qId];
        const questionType = q.type || q.text?.type || 'text';
        const isRequired = q.required ?? q.text?.required ?? true;
        const rules = q.validation_rules || q.text?.validation_rules || null;

        const isEmpty = value === undefined || value === null || (typeof value === 'string' && value === '');
        if (isRequired && isEmpty) {
          fieldErrors[`question_${qId}`] = true;
          continue;
        }

        if (!isEmpty && rules) {
          const fieldMeta = { field_type: questionType };
          const qOptions = q.options || q.text?.options;
          if (Array.isArray(qOptions)) fieldMeta.options = qOptions;
          const error = validateFieldValue(value, fieldMeta, rules);
          if (error) {
            fieldErrors[`question_${qId}`] = true;
          }
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        setInvalidFields(prev => ({ ...prev, ...fieldErrors }));
        return; // Stop submission
      }
    }

    setInvalidFields({});
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

      setSubmissionInfo({
        surveyId: data.surveyId,
        submittedAt: data.submittedAt,
        survey: data.survey,
      });
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
    setSubmissionInfo(null);
    setError(null);
    setInvalidFields({});
  };

  const formatEasternDateTime = (timestamp) => {
    if (!timestamp) return '—';
    try {
      return new Date(timestamp).toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      });
    } catch {
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    }
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

  const invalidInputStyle = {
    ...inputStyle,
    border: '1.5px solid #ef4444',
    backgroundColor: '#fef2f2',
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

  if (!isMounted) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
        <Header />
        <main style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      <main style={{
        maxWidth: isPublicView ? '680px' : '1100px',
        margin: '0 auto',
        padding: isPublicView ? '2rem 1.5rem' : '1.5rem'
      }}>
        <BackButton />
        {!isPublicView && (
          <button
            className="asrs-btn-secondary"
            style={{ margin: '0.8rem 0', padding: '0.55rem 0.85rem', fontSize: '0.95rem' }}
            onClick={() => router.push('/manage-surveys')}
          >
            Manage surveys
          </button>
        )}

        {isPublicView ? (
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
            {userRole !== 'public' && (
              <button
                onClick={() => router.push('/manage-surveys')}
                className="asrs-btn-secondary"
                style={{ marginBottom: '0.75rem', padding: '0.6rem 1rem', fontSize: '0.9rem' }}
              >
                Manage surveys
              </button>
            )}
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
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                  Your survey response has been submitted successfully.<br />
                  {submissionInfo?.submittedAt && (
                    <span>Submitted at: <strong>{formatEasternDateTime(submissionInfo.submittedAt)} (Eastern)</strong></span>
                  )}
                </p>
                {submissionInfo?.survey && (
                  <div style={{ margin: '1rem auto', maxWidth: '520px', textAlign: 'left', fontSize: '0.9rem' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--color-text-primary)' }}>Submission Details</h3>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, textAlign: 'left' }}>
                      <li><strong>ID:</strong> {submissionInfo.surveyId || submissionInfo.survey.id}</li>
                      <li><strong>Name:</strong> {submissionInfo.survey.name}</li>
                      <li><strong>Email:</strong> {submissionInfo.survey.email}</li>
                      <li><strong>Template:</strong> {submissionInfo.survey.responses?.templateTitle || 'N/A'}</li>
                    </ul>
                  </div>
                )}
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
              <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
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

                <fieldset
                  disabled={isSubmitting}
                  style={{ border: 'none', margin: 0, padding: 0, minInlineSize: 0 }}
                >
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
                    <div id="field-firstName" style={{ ...fieldGroupStyle, flex: '1 1 45%', minWidth: '200px' }}>
                      <label style={labelStyle}>
                        First Name <span style={{ color: 'var(--color-asrs-red)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          if (invalidFields.firstName) setInvalidFields((p) => ({ ...p, firstName: false }));
                        }}
                        style={invalidFields.firstName ? invalidInputStyle : inputStyle}
                      />
                      {invalidFields.firstName && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>First name is required.</span>}
                    </div>
                    <div id="field-lastName" style={{ ...fieldGroupStyle, flex: '1 1 45%', minWidth: '200px' }}>
                      <label style={labelStyle}>
                        Last Name <span style={{ color: 'var(--color-asrs-red)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          if (invalidFields.lastName) setInvalidFields((p) => ({ ...p, lastName: false }));
                        }}
                        style={invalidFields.lastName ? invalidInputStyle : inputStyle}
                      />
                      {invalidFields.lastName && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Last name is required.</span>}
                    </div>
                  </div>

                  {/* Email */}
                  <div id="field-email" style={fieldGroupStyle}>
                    <label style={labelStyle}>
                      Email Address <span style={{ color: 'var(--color-asrs-red)' }}>*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="john.doe@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (invalidFields.email) setInvalidFields((p) => ({ ...p, email: false }));
                      }}
                      style={invalidFields.email ? invalidInputStyle : inputStyle}
                    />
                    {invalidFields.email && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{!email.trim() ? 'Email address is required.' : 'Please enter a valid email address.'}</span>}
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
                      const questionText = q.label || q.text?.question || q.question || '';
                      const questionType = q.type || q.text?.type || 'text';
                      const questionOptions = q.options || q.text?.options || [];
                      const questionSubQuestions = q.subQuestions || q.text?.subQuestions || [];
                      const qId = q.id;
                      const isRequired = q.required ?? q.text?.required ?? true;
                      const isInvalid = !!invalidFields[`question_${qId}`];

                      return (
                        <div key={qId} id={`field-question_${qId}`} style={fieldGroupStyle}>
                          <label style={labelStyle}>
                            {index + 1}. {questionText} {isRequired && <span style={{ color: 'var(--color-asrs-red)' }}>*</span>}
                          </label>

                          {questionType === 'text' && (
                            <>
                            <textarea
                              value={templateResponses[qId] || ''}
                              onChange={(e) => {
                                setTemplateResponses({ ...templateResponses, [qId]: e.target.value });
                                if (isInvalid) setInvalidFields((p) => ({ ...p, [`question_${qId}`]: false }));
                              }}
                              rows={3}
                              placeholder="Enter your response..."
                              style={{
                                ...(isInvalid ? invalidInputStyle : inputStyle),
                                resize: 'vertical',
                                fontFamily: 'inherit',
                              }}
                            />
                            {isInvalid && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>This field is required.</span>}
                            </>
                          )}

                          {(questionType === 'numeric' || questionType === 'number') && (
                            <>
                            <input
                              type="number"
                              value={templateResponses[qId] || ''}
                              onChange={(e) => {
                                setTemplateResponses({ ...templateResponses, [qId]: e.target.value });
                                if (isInvalid) setInvalidFields((p) => ({ ...p, [`question_${qId}`]: false }));
                              }}
                              placeholder="Enter a number"
                              style={isInvalid ? invalidInputStyle : inputStyle}
                            />
                            {isInvalid && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>This field is required.</span>}
                            </>
                          )}

                          {questionType === 'date' && (
                            <>
                            <input
                              type="date"
                              value={templateResponses[qId] || ''}
                              onChange={(e) => {
                                setTemplateResponses({ ...templateResponses, [qId]: e.target.value });
                                if (isInvalid) setInvalidFields((p) => ({ ...p, [`question_${qId}`]: false }));
                              }}
                              style={isInvalid ? invalidInputStyle : inputStyle}
                            />
                            {isInvalid && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>This field is required.</span>}
                            </>
                          )}

                          {questionType === 'boolean' && (
                            <>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                              {['Yes', 'No'].map((opt) => (
                                <label key={opt} style={{
                                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                                  padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer',
                                  border: templateResponses[qId] === (opt === 'Yes')
                                    ? '2px solid var(--color-asrs-orange)' : '1px solid var(--color-bg-tertiary)',
                                  backgroundColor: templateResponses[qId] === (opt === 'Yes')
                                    ? '#fdf4e8' : 'var(--color-bg-primary)',
                                }}>
                                  <input type="radio" name={`question_${qId}`} value={opt}
                                    checked={templateResponses[qId] === (opt === 'Yes')}
                                    onChange={() => {
                                      setTemplateResponses({ ...templateResponses, [qId]: opt === 'Yes' });
                                      if (isInvalid) setInvalidFields((p) => ({ ...p, [`question_${qId}`]: false }));
                                    }}
                                    style={{ accentColor: 'var(--color-asrs-orange)' }}
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                            {isInvalid && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>This field is required.</span>}
                            </>
                          )}

                          {questionType === 'rating' && (
                            <>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button key={n} type="button" onClick={() => {
                                  setTemplateResponses({ ...templateResponses, [qId]: n });
                                  if (isInvalid) setInvalidFields((p) => ({ ...p, [`question_${qId}`]: false }));
                                }} style={{
                                  width: '48px', height: '48px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 600,
                                  cursor: 'pointer', transition: 'all 0.15s ease',
                                  border: templateResponses[qId] === n
                                    ? '2px solid var(--color-asrs-orange)' : '1px solid var(--color-bg-tertiary)',
                                  backgroundColor: templateResponses[qId] === n
                                    ? '#fdf4e8' : 'var(--color-bg-primary)',
                                  color: templateResponses[qId] === n
                                    ? 'var(--color-asrs-orange)' : 'var(--color-text-secondary)',
                                }}>
                                  {n}
                                </button>
                              ))}
                            </div>
                            {isInvalid && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Please select a rating.</span>}
                            </>
                          )}

                          {(questionType === 'choice' || questionType === 'select') && questionOptions.length > 0 && (
                            <>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                              ...(isInvalid ? { border: '1.5px solid #ef4444', borderRadius: '8px', padding: '0.5rem', backgroundColor: '#fef2f2' } : {}),
                            }}>
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
                                    onChange={(e) => {
                                      setTemplateResponses({ ...templateResponses, [qId]: e.target.value });
                                      if (isInvalid) setInvalidFields((p) => ({ ...p, [`question_${qId}`]: false }));
                                    }}
                                    style={{ accentColor: 'var(--color-asrs-orange)' }}
                                  />
                                  <span style={{ fontSize: '0.92rem', color: 'var(--color-text-primary)' }}>
                                    {option}
                                  </span>
                                </label>
                              ))}
                            </div>
                            {isInvalid && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Please select an option.</span>}
                            </>
                          )}

                          {questionType === 'multiselect' && questionOptions.length > 0 && (
                            <>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                              ...(isInvalid ? { border: '1.5px solid #ef4444', borderRadius: '8px', padding: '0.5rem', backgroundColor: '#fef2f2' } : {}),
                            }}>
                              {questionOptions.map((option) => (
                                <label
                                  key={option}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.65rem',
                                    padding: '0.6rem 0.85rem',
                                    borderRadius: '8px',
                                    border: (templateResponses[qId] || []).includes(option)
                                      ? '2px solid var(--color-asrs-orange)'
                                      : '1px solid var(--color-bg-tertiary)',
                                    backgroundColor: (templateResponses[qId] || []).includes(option)
                                      ? '#fdf4e8'
                                      : 'var(--color-bg-primary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    value={option}
                                    checked={(templateResponses[qId] || []).includes(option)}
                                    onChange={(e) => {
                                      const prev = templateResponses[qId] || [];
                                      const updated = e.target.checked
                                        ? [...prev, option]
                                        : prev.filter((v) => v !== option);
                                      setTemplateResponses({ ...templateResponses, [qId]: updated });
                                      if (isInvalid) setInvalidFields((p) => ({ ...p, [`question_${qId}`]: false }));
                                    }}
                                    style={{ accentColor: 'var(--color-asrs-orange)' }}
                                  />
                                  <span style={{ fontSize: '0.92rem', color: 'var(--color-text-primary)' }}>{option}</span>
                                </label>
                              ))}
                            </div>
                            {isInvalid && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Please select at least one option.</span>}
                            </>
                          )}

                          {questionType === 'yesno' && questionSubQuestions.length > 0 && (
                            <>
                            <table style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              fontSize: '0.92rem',
                              ...(isInvalid ? { border: '1.5px solid #ef4444', borderRadius: '8px' } : {}),
                            }}>
                              <thead>
                                <tr>
                                  <th style={{ textAlign: 'left', padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--color-bg-tertiary)', width: '60%' }}></th>
                                  <th style={{ textAlign: 'center', padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>Yes</th>
                                  <th style={{ textAlign: 'center', padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--color-bg-tertiary)' }}>No</th>
                                </tr>
                              </thead>
                              <tbody>
                                {questionSubQuestions.map((sub, sIdx) => (
                                  <tr key={sIdx} style={{ backgroundColor: sIdx % 2 === 0 ? 'var(--color-bg-secondary)' : 'transparent' }}>
                                    <td style={{ padding: '0.5rem', color: 'var(--color-text-primary)' }}>{sub}</td>
                                    <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                                      <input
                                        type="radio"
                                        name={`question_${qId}_${sIdx}`}
                                        value="yes"
                                        checked={(templateResponses[qId]?.[sIdx]) === 'yes'}
                                        onChange={() => {
                                          const prev = templateResponses[qId] || {};
                                          setTemplateResponses({ ...templateResponses, [qId]: { ...prev, [sIdx]: 'yes' } });
                                          if (isInvalid) setInvalidFields((p) => ({ ...p, [`question_${qId}`]: false }));
                                        }}
                                        style={{ accentColor: 'var(--color-asrs-orange)' }}
                                      />
                                    </td>
                                    <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                                      <input
                                        type="radio"
                                        name={`question_${qId}_${sIdx}`}
                                        value="no"
                                        checked={(templateResponses[qId]?.[sIdx]) === 'no'}
                                        onChange={() => {
                                          const prev = templateResponses[qId] || {};
                                          setTemplateResponses({ ...templateResponses, [qId]: { ...prev, [sIdx]: 'no' } });
                                          if (isInvalid) setInvalidFields((p) => ({ ...p, [`question_${qId}`]: false }));
                                        }}
                                        style={{ accentColor: 'var(--color-asrs-orange)' }}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {isInvalid && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Please answer all sub-questions.</span>}
                            </>
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
                      <div id="field-initiativeRating" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        ...(invalidFields.initiativeRating ? { border: '1.5px solid #ef4444', borderRadius: '8px', padding: '0.5rem', backgroundColor: '#fef2f2' } : {}),
                      }}>
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
                              onChange={(e) => {
                                setInitiativeRating(e.target.value);
                                if (invalidFields.initiativeRating) setInvalidFields((p) => ({ ...p, initiativeRating: false }));
                              }}
                              style={{ accentColor: 'var(--color-asrs-orange)' }}
                            />
                            <span style={{ fontSize: '1.15rem' }}>{option.emoji}</span>
                            <span style={{ fontSize: '0.92rem', color: 'var(--color-text-primary)' }}>
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                      {invalidFields.initiativeRating && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Please select a rating.</span>}
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
                </fieldset>

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
            <div className="asrs-card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-asrs-dark)' }}>Survey Management</h2>
              <p style={{ margin: '0.4rem 0 0.85rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                Manage templates and your saved survey QR distributors in one place.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-bg-tertiary)', borderRadius: '8px', padding: '0.65rem 0.8rem', minWidth: '160px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Templates</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{staffLoading ? '...' : staffTemplates.length}</div>
                </div>
                <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-bg-tertiary)', borderRadius: '8px', padding: '0.65rem 0.8rem', minWidth: '160px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Saved Survey QR Codes</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                    {staffLoading ? '...' : staffQrCodes.length}
                  </div>
                </div>
              </div>
              {staffError && (
                <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.85rem' }}>{staffError}</p>
              )}
              {!staffLoading && !staffError && (
                <div style={{ overflowX: 'auto', marginTop: '0.25rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                        {['Survey', 'QR Key', 'Status', 'Scans', 'Submissions', 'Created', 'Actions'].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: 'left',
                              padding: '0.5rem',
                              color: 'var(--color-text-secondary)',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              letterSpacing: '0.03em',
                              textTransform: 'uppercase',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staffQrCodes.map((qr) => {
                        const isExpired = Boolean(qr.isExpired);
                        const isActive = Boolean(qr.isActive) && !isExpired;
                        return (
                          <tr key={qr.qrCodeKey} style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                            <td style={{ padding: '0.5rem', color: 'var(--color-text-primary)' }}>
                              <div style={{ fontWeight: 600 }}>{qr.templateTitle || 'General Survey'}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-light)' }}>
                                {qr.description || 'No description'}
                              </div>
                            </td>
                            <td style={{ padding: '0.5rem', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>{qr.qrCodeKey}</td>
                            <td style={{ padding: '0.5rem' }}>
                              <span style={{
                                fontSize: '0.75rem',
                                borderRadius: '999px',
                                padding: '0.2rem 0.6rem',
                                border: '1px solid',
                                backgroundColor: isActive ? '#d1fae5' : '#fee2e2',
                                borderColor: isActive ? '#a7f3d0' : '#fecaca',
                                color: isActive ? '#065f46' : '#991b1b',
                              }}>
                                {isActive ? 'active' : 'inactive'}
                              </span>
                            </td>
                            <td style={{ padding: '0.5rem', color: 'var(--color-text-secondary)' }}>{qr.stats.totalScans}</td>
                            <td style={{ padding: '0.5rem', color: 'var(--color-text-secondary)' }}>{qr.stats.conversions}</td>
                            <td style={{ padding: '0.5rem', color: 'var(--color-text-secondary)' }}>
                              {new Date(qr.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <a href={qr.targetUrl} target="_blank" rel="noreferrer" className="asrs-btn-secondary" style={{ textDecoration: 'none', padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}>
                                  Open
                                </a>
                                <button
                                  type="button"
                                  className="asrs-btn-secondary"
                                  style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                                  onClick={() => handleCopyQrUrl(qr)}
                                >
                                  {copiedQrKey === qr.qrCodeKey ? 'Copied' : 'Copy URL'}
                                </button>
                                <a
                                  href={`/api/qr-codes/download?qrCodeKey=${encodeURIComponent(qr.qrCodeKey)}&format=png&size=400&download=true`}
                                  className="asrs-btn-secondary"
                                  style={{ textDecoration: 'none', padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                                >
                                  PNG
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {staffQrCodes.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ padding: '0.75rem', color: 'var(--color-text-light)', textAlign: 'center' }}>
                            No survey QR codes yet. Generate your first one below.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

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