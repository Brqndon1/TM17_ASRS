'use client';

import Header from '@/components/Header';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SurveyDistributionPage() {
  const router = useRouter();

  // Auth state
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Form state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [recipientEmails, setRecipientEmails] = useState([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Distributions list
  const [distributions, setDistributions] = useState([]);
  const [loadingDistributions, setLoadingDistributions] = useState(true);

  // ── Auth check ───────────────────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (parsed.user_type === 'admin' || parsed.user_type === 'staff') {
        setUser(parsed);
      }
    }
    setAuthChecked(true);
  }, []);

  // ── Fetch survey templates + existing distributions ──
  useEffect(() => {
    if (!user) return;

    fetch('/api/surveys/templates')
      .then((res) => res.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]));

    fetchDistributions();
  }, [user]);

  const fetchDistributions = () => {
    setLoadingDistributions(true);
    fetch('/api/surveys/distributions')
      .then((res) => res.json())
      .then((data) => setDistributions(data.distributions || []))
      .catch(() => setDistributions([]))
      .finally(() => setLoadingDistributions(false));
  };

  // ── Email chip helpers ───────────────────────────────
  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (recipientEmails.includes(trimmed)) {
      setError('This email has already been added.');
      return;
    }
    setRecipientEmails([...recipientEmails, trimmed]);
    setEmailInput('');
    setError('');
  };

  const removeEmail = (emailToRemove) => {
    setRecipientEmails(recipientEmails.filter((e) => e !== emailToRemove));
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
  };

  // ── Submit distribution ──────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!selectedTemplateId || !title.trim() || !startDate || !endDate) {
      setError('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/surveys/distributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_template_id: selectedTemplateId,
          title: title.trim(),
          start_date: startDate,
          end_date: endDate,
          recipient_emails: recipientEmails,
          created_by_user_id: user?.user_id || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create distribution.');
      }

      setSuccessMessage(data.message || 'Distribution created successfully!');
      // Reset form
      setSelectedTemplateId('');
      setTitle('');
      setStartDate('');
      setEndDate('');
      setEmailInput('');
      setRecipientEmails([]);
      // Refresh list
      fetchDistributions();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Today's date for min attribute ───────────────────
  const todayStr = new Date().toISOString().split('T')[0];

  // ── Style objects ────────────────────────────────────
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

  const statusBadge = (status) => {
    const colors = {
      pending: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
      active: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
      closed: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
    };
    const c = colors[status] || colors.pending;
    return {
      display: 'inline-block',
      padding: '0.2rem 0.65rem',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      backgroundColor: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
    };
  };

  // ── Render ───────────────────────────────────────────

  // Not authorized
  if (authChecked && !user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
        <Header />
        <main style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 1.5rem', textAlign: 'center' }}>
          <div className="asrs-card">
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔒</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
              Access Restricted
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
              Only admin and staff users can distribute surveys. Please log in with an authorized account.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="asrs-btn-primary"
              style={{ padding: '0.65rem 2rem', fontSize: '0.95rem' }}
            >
              Go to Login
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Loading auth
  if (!authChecked) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* ── Page Title ── */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
            Distribute Survey
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Select a survey template, set the distribution window, and add recipients.
          </p>
        </div>

        {/* ── Distribution Form ── */}
        <div className="asrs-card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--color-asrs-dark)', marginBottom: '1.25rem' }}>
            New Distribution
          </h2>

          {/* Success banner */}
          {successMessage && (
            <div style={{
              backgroundColor: '#d1fae5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              color: '#065f46',
              fontSize: '0.9rem',
              fontWeight: '500',
            }}>
              ✅ {successMessage}
            </div>
          )}

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

          <form onSubmit={handleSubmit}>
            {/* Survey Template Dropdown */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>
                Survey Template <span style={{ color: 'var(--color-asrs-red)' }}>*</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
                required
              >
                <option value="">— Select a template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              {templates.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginTop: '0.35rem' }}>
                  No templates found. Create one on the Survey page first.
                </p>
              )}
            </div>

            {/* Distribution Title */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>
                Distribution Title <span style={{ color: 'var(--color-asrs-red)' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Spring 2026 Campus Feedback"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            {/* Dates – side by side */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ ...fieldGroupStyle, flex: '1 1 45%', minWidth: '200px' }}>
                <label style={labelStyle}>
                  Start Date <span style={{ color: 'var(--color-asrs-red)' }}>*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  min={todayStr}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div style={{ ...fieldGroupStyle, flex: '1 1 45%', minWidth: '200px' }}>
                <label style={labelStyle}>
                  End Date <span style={{ color: 'var(--color-asrs-red)' }}>*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || todayStr}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            {/* Recipient Emails */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>
                Recipient Emails
              </label>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
                Type an email and press <strong>Enter</strong> or <strong>comma</strong> to add it.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleEmailKeyDown}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={addEmail}
                  className="asrs-btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Add
                </button>
              </div>

              {/* Email chips */}
              {recipientEmails.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.65rem' }}>
                  {recipientEmails.map((em) => (
                    <span
                      key={em}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.3rem 0.7rem',
                        borderRadius: '999px',
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-bg-tertiary)',
                        fontSize: '0.82rem',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {em}
                      <button
                        type="button"
                        onClick={() => removeEmail(em)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          color: 'var(--color-text-light)',
                          padding: 0,
                          lineHeight: 1,
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
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
                {isSubmitting ? 'Creating…' : 'Create Distribution'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Existing Distributions (tracking dashboard) ── */}
        <div className="asrs-card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--color-asrs-dark)', marginBottom: '1rem' }}>
            Distribution Tracker
          </h2>

          {loadingDistributions ? (
            <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: '1rem' }}>
              Loading distributions…
            </p>
          ) : distributions.length === 0 ? (
            <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: '1.5rem' }}>
              No distributions yet. Create your first one above.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-bg-tertiary)' }}>
                    {['Title', 'Start', 'End', 'Status', 'Recipients', 'Responses'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '0.6rem 0.75rem',
                          fontWeight: '600',
                          color: 'var(--color-text-secondary)',
                          fontSize: '0.8rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {distributions.map((d) => (
                    <tr
                      key={d.distribution_id}
                      style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}
                    >
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                        {d.title}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                        {d.start_date}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                        {d.end_date}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span style={statusBadge(d.status)}>{d.status}</span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                        {d.recipient_emails.length}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                        {d.response_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
