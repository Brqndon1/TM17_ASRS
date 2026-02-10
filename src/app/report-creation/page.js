'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { getInitiatives } from '@/lib/data-service';

export default function ReportCreationPage() {
  const [userRole, setUserRole] = useState('staff');

  // ---- DATA ----
  const [initiatives, setInitiatives] = useState([]);
  const [selectedInitiative, setSelectedInitiative] = useState(null);

  // ---- REPORT CONFIG ----
  const [reportName, setReportName] = useState('');
  const [description, setDescription] = useState('');

  // ---- UI STATE ----
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
        }),
      });

      if (!res.ok) throw new Error();

      setReportName('');
      setDescription('');
      setSuccessMessage('Report generated and published to Reporting.');

    } catch {
      setErrorMessage('Report generated and published to Reporting.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header userRole={userRole} onRoleChange={setUserRole} />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="asrs-card">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            Report Creation
          </h1>

          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            Create and publish reports from collected survey data.
          </p>

          {/* ---- FORM GRID ---- */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            {/* Initiative */}
            <div>
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
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            {/* Report Name */}
            <div>
              <label className="asrs-label">Report Name</label>
              <input
                className="asrs-input"
                placeholder="e.g. Q2 Safety Trends"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '2rem' }}>
            <label className="asrs-label">Description</label>
            <textarea
              className="asrs-input"
              rows={4}
              placeholder="Optional description for reporting dashboard"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* ---- ACTIONS ---- */}
          <button
            onClick={handleCreateReport}
            disabled={isSubmitting}
            style={{
              padding: '0.85rem 1.5rem',
              backgroundColor: 'var(--color-asrs-orange)',
              color: '#fff',
              borderRadius: '10px',
              fontWeight: 600,
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? 'Generating…' : 'Generate Report'}
          </button>

          {/* Messages */}
          {errorMessage && (
            <p style={{ marginTop: '1rem', color: 'var(--color-error)' }}>
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p style={{ marginTop: '1rem', color: 'var(--color-success)' }}>
              {successMessage}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}