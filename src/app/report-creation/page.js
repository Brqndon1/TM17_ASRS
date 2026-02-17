'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { getInitiatives } from '@/lib/data-service';

export default function ReportCreationPage() {
  const [userRole, setUserRole] = useState('staff');

  const [initiatives, setInitiatives] = useState([]);
  const [selectedInitiative, setSelectedInitiative] = useState(null);

  const [reportName, setReportName] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState('pdf');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadInitiatives() {
      const data = await getInitiatives();
      setInitiatives(data);
      if (data.length > 0) setSelectedInitiative(data[0]);
    }
    loadInitiatives();
  }, []);

  async function handleCreateReport() {
    if (!reportName) {
      setErrorMessage('Report name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiativeId: selectedInitiative.id,
          name: reportName,
          description,
          createdBy: userRole,
          format,
        }),
      });

      if (!res.ok) throw new Error();

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage(`Report generated as ${format.toUpperCase()}.`);
      setReportName('');
      setDescription('');
    } catch {
      setErrorMessage('Failed to generate report.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <Header userRole={userRole} onRoleChange={setUserRole} />

      <main
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '3rem 1.5rem',
        }}
      >
        <div
          className="asrs-card"
          style={{
            padding: '2.5rem',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
          }}
        >
          {/* Header */}
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}
            >
              Report Creation
            </h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Generate and export reports from collected survey data.
            </p>
          </div>

          {/* Form */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.75rem',
            }}
          >
            {/* Initiative */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="asrs-label">Initiative</label>
              <select
                className="asrs-input"
                value={selectedInitiative?.id || ''}
                onChange={(e) =>
                  setSelectedInitiative(
                    initiatives.find(i => i.id === Number(e.target.value))
                  )
                }
              >
                {initiatives.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Report Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="asrs-label">Report Name</label>
              <input
                className="asrs-input"
                placeholder="e.g. Q2 Safety Trends"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </div>

            {/* Export Format */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="asrs-label">Export Format</label>
              <select
                className="asrs-input"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="json">JSON</option>
              </select>
            </div>

            {/* Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="asrs-label">Description</label>
              <textarea
                className="asrs-input"
                rows={4}
                placeholder="Optional description for reporting dashboard"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Button */}
          <button
            onClick={handleCreateReport}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: 'var(--color-asrs-orange)',
              color: '#fff',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '1rem',
              border: 'none',
              cursor: 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {isSubmitting ? 'Generating…' : `Generate ${format.toUpperCase()} Report`}
          </button>

          {/* Messages */}
          {errorMessage && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                backgroundColor: 'rgba(255,0,0,0.08)',
                color: 'var(--color-error)',
                fontSize: '0.9rem',
              }}
            >
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                backgroundColor: 'rgba(0,180,0,0.08)',
                color: 'var(--color-success)',
                fontSize: '0.9rem',
              }}
            >
              {successMessage}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}