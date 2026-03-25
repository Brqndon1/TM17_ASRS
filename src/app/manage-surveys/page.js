'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ManageSurveysPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

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

  const getCsrfToken = () => {
    const match = document.cookie.match(/(^|;)\s*asrs_csrf\s*=\s*([^;]+)/);
    return match ? decodeURIComponent(match[2]) : '';
  };

  const fetchSurveys = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/surveys');
      if (!res.ok) throw new Error('Failed to load surveys');
      const data = await res.json();
      setSurveys(Array.isArray(data.surveys) ? data.surveys : []);
    } catch (err) {
      setError(err.message || 'Unable to load surveys');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/surveys/templates');
      if (!res.ok) throw new Error('Failed to load survey templates');
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load survey templates');
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchSurveys();
  }, []);

  const selectedSurvey = surveys.find((s) => String(s.id) === String(selectedSurveyId));
  const selectedTemplate = templates.find((t) => String(t.id) === String(selectedTemplateId));

  const filteredSurveys = selectedTemplateId
    ? surveys.filter((s) => String(s.responses?.templateId || '') === String(selectedTemplateId))
    : surveys;

  const deleteSurvey = async (surveyId) => {
    if (!confirm('Delete this survey submission (not template) permanently?')) return;

    try {
      const res = await fetch(`/api/surveys?surveyId=${surveyId}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': getCsrfToken(),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete survey submission');

      setSuccessMessage(`Survey submission #${surveyId} deleted successfully.`);
      setSelectedSurveyId('');
      await fetchSurveys();
    } catch (err) {
      setError(err.message || 'Unable to delete survey submission');
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!templateId || !confirm('Delete this survey template and all its submissions?')) return;

    try {
      const res = await fetch(`/api/surveys/templates?templateId=${templateId}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': getCsrfToken(),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete survey template');

      setSuccessMessage(`Survey template #${templateId} and related submissions deleted successfully.`);
      setSelectedTemplateId('');
      setSelectedSurveyId('');
      await fetchTemplates();
      await fetchSurveys();
    } catch (err) {
      setError(err.message || 'Unable to delete survey template');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
        Manage Surveys
      </h1>

      <button
        className="asrs-btn-secondary"
        style={{ marginBottom: '1rem', padding: '0.6rem 1rem', fontSize: '0.95rem' }}
        onClick={() => router.push('/survey')}
      >
        Back to Survey Page
      </button>

      {successMessage && (
        <div style={{ marginBottom: '1rem', padding: '0.8rem', border: '1px solid #c8e6c9', backgroundColor: '#e8f5e9', color: '#2e7d32' }}>
          {successMessage}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.8rem', border: '1px solid #ffcdd2', backgroundColor: '#ffebee', color: '#c62828' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '1.2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Select survey template to filter submissions:</label>
        <select
          value={selectedTemplateId}
          onChange={(e) => {
            setSelectedTemplateId(e.target.value);
            setSelectedSurveyId('');
          }}
          style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }}
        >
          <option value="">-- All templates and submissions --</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              #{template.id} - {template.title}
            </option>
          ))}
        </select>
      </div>

      {selectedTemplate && (
        <div style={{ marginBottom: '1.2rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>Selected template:</span>
          <span>{selectedTemplate.title}</span>
          <button
            className="asrs-btn-danger"
            style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
            onClick={() => deleteTemplate(selectedTemplate.id)}
          >
            Delete template + submissions
          </button>
        </div>
      )}

      <div style={{ marginBottom: '1.2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Select specific submission (optional):</label>
        <select
          value={selectedSurveyId}
          onChange={(e) => setSelectedSurveyId(e.target.value)}
          style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--color-bg-tertiary)' }}
        >
          <option value="">-- Select a submission --</option>
          {filteredSurveys.map((survey) => (
            <option key={survey.id} value={survey.id}>
              #{survey.id} - {survey.name} ({survey.email})
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div>Loading surveys...</div>
      ) : !filteredSurveys.length ? (
        <div>No survey submissions found.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '2px solid var(--color-bg-tertiary)', textAlign: 'left', padding: '0.65rem' }}>ID</th>
                <th style={{ borderBottom: '2px solid var(--color-bg-tertiary)', textAlign: 'left', padding: '0.65rem' }}>Name</th>
                <th style={{ borderBottom: '2px solid var(--color-bg-tertiary)', textAlign: 'left', padding: '0.65rem' }}>Email</th>
                <th style={{ borderBottom: '2px solid var(--color-bg-tertiary)', textAlign: 'left', padding: '0.65rem' }}>Submitted At</th>
                <th style={{ borderBottom: '2px solid var(--color-bg-tertiary)', textAlign: 'left', padding: '0.65rem' }}>Template</th>
                <th style={{ borderBottom: '2px solid var(--color-bg-tertiary)', textAlign: 'left', padding: '0.65rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((survey) => {
                const parsedResponses = survey.responses || {};
                return (
                  <tr key={survey.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.55rem' }}>#{survey.id}</td>
                    <td style={{ padding: '0.55rem' }}>{survey.name}</td>
                    <td style={{ padding: '0.55rem' }}>{survey.email}</td>
                    <td style={{ padding: '0.55rem' }}>{survey.submittedAt ? `${formatEasternDateTime(survey.submittedAt)} (Eastern)` : '—'}</td>
                    <td style={{ padding: '0.55rem' }}>{parsedResponses.templateTitle || 'N/A'}</td>
                    <td style={{ padding: '0.55rem' }}>
                      <button className="asrs-btn-danger" style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }} onClick={() => deleteSurvey(survey.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedSurvey && (
        <div style={{ marginTop: '1.25rem', padding: '1rem', border: '1px solid var(--color-bg-tertiary)', borderRadius: '8px', backgroundColor: 'var(--color-bg-secondary)' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>Selected Survey Details</h2>
          <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '300px', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: 'white' }}>
            {JSON.stringify(selectedSurvey, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
