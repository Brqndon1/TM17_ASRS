'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import { getInitiatives, getReportData } from '@/lib/data-service';

import StepIndicator from '@/components/report-steps/StepIndicator';
import StepConfig from '@/components/report-steps/StepConfig';
import StepFilters from '@/components/report-steps/StepFilters';
import StepExpressions from '@/components/report-steps/StepExpressions';
import StepSorting from '@/components/report-steps/StepSorting';
import StepPreview from '@/components/report-steps/StepPreview';

const TOTAL_STEPS = 5;

export default function ReportCreationPage() {
  const [userRole, setUserRole] = useState('staff');

  // ---- DATA ----
  const [initiatives, setInitiatives] = useState([]);
  const [tableData, setTableData] = useState([]);

  // ---- REPORT CONFIG ----
  const [currentStep, setCurrentStep] = useState(0);
  const [reportConfig, setReportConfig] = useState({
    selectedInitiative: null,
    reportName: '',
    description: '',
    filters: {},
    expressions: [],
    sorts: [],
  });

  // ---- UI STATE ----
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // ---- REPORT HISTORY ----
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // Load initiatives on mount
  useEffect(() => {
    async function loadInitiatives() {
      const data = await getInitiatives();
      setInitiatives(data);
      if (data.length > 0) {
        setReportConfig(prev => ({ ...prev, selectedInitiative: data[0] }));
      }
    }
    loadInitiatives();
    fetchReports();
  }, []);

  // Load table data when initiative changes
  useEffect(() => {
    async function loadTableData() {
      if (!reportConfig.selectedInitiative) {
        setTableData([]);
        return;
      }
      const data = await getReportData(reportConfig.selectedInitiative.id);
      setTableData(data?.tableData || []);
    }
    loadTableData();
  }, [reportConfig.selectedInitiative]);

  async function fetchReports() {
    setLoadingReports(true);
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  }

  // ---- STEP NAVIGATION ----
  function updateConfig(partial) {
    setReportConfig(prev => ({ ...prev, ...partial }));
  }

  function canProceed() {
    if (currentStep === 0) {
      return reportConfig.selectedInitiative && reportConfig.reportName.trim().length > 0;
    }
    return true; // Steps 1-3 are optional, step 4 is the last
  }

  function handleNext() {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(prev => prev + 1);
      setErrorMessage('');
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setErrorMessage('');
    }
  }

  function handleSkip() {
    // Steps 1-3 can be skipped
    if (currentStep >= 1 && currentStep <= 3) {
      handleNext();
    }
  }

  // ---- GENERATE REPORT ----
  async function handleGenerate() {
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiativeId: reportConfig.selectedInitiative.id,
          name: reportConfig.reportName,
          description: reportConfig.description,
          createdBy: userRole,
          filters: reportConfig.filters,
          expressions: reportConfig.expressions,
          sorts: reportConfig.sorts,
        }),
      });

      if (!res.ok) throw new Error();

      // Reset form
      setCurrentStep(0);
      setReportConfig({
        selectedInitiative: initiatives.length > 0 ? initiatives[0] : null,
        reportName: '',
        description: '',
        filters: {},
        expressions: [],
        sorts: [],
      });
      setSuccessMessage('Report generated and published to Reporting.');
      fetchReports();
    } catch {
      setErrorMessage('Failed to generate report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---- HELPERS ----
  function formatDate(dateStr) {
    if (!dateStr) return '\u2014';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const statusBadge = (status) => {
    const colors = {
      completed: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
      generating: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
      failed: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
    };
    const c = colors[status] || colors.completed;
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

  // ---- RENDER CURRENT STEP ----
  function renderStep() {
    switch (currentStep) {
      case 0:
        return (
          <StepConfig
            initiatives={initiatives}
            reportConfig={reportConfig}
            onChange={updateConfig}
          />
        );
      case 1:
        return (
          <StepFilters
            reportConfig={reportConfig}
            onChange={updateConfig}
            tableData={tableData}
          />
        );
      case 2:
        return (
          <StepExpressions
            reportConfig={reportConfig}
            onChange={updateConfig}
            tableData={tableData}
          />
        );
      case 3:
        return (
          <StepSorting
            reportConfig={reportConfig}
            onChange={updateConfig}
          />
        );
      case 4:
        return (
          <StepPreview
            reportConfig={reportConfig}
            tableData={tableData}
            onGenerate={handleGenerate}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  }

  const isOptionalStep = currentStep >= 1 && currentStep <= 3;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header userRole={userRole} onRoleChange={setUserRole} />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <BackButton />
        <div className="asrs-card">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            Report Creation
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Create and publish reports from collected survey data.
          </p>

          {/* Step Indicator */}
          <StepIndicator currentStep={currentStep} />

          {/* Active Step Content */}
          <div style={{ marginBottom: '1.5rem' }}>
            {renderStep()}
          </div>

          {/* Navigation Buttons (not shown on preview step — it has its own Generate button) */}
          {currentStep < TOTAL_STEPS - 1 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', paddingTop: '1rem',
              borderTop: '1px solid var(--color-bg-tertiary)',
            }}>
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className="asrs-btn-secondary"
                style={{
                  opacity: currentStep === 0 ? 0.4 : 1,
                  cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Back
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {isOptionalStep && (
                  <button
                    onClick={handleSkip}
                    className="asrs-btn-secondary"
                    style={{ color: 'var(--color-text-light)' }}
                  >
                    Skip
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  style={{
                    padding: '0.6rem 1.5rem',
                    backgroundColor: canProceed() ? 'var(--color-asrs-orange)' : 'var(--color-bg-tertiary)',
                    color: canProceed() ? '#fff' : 'var(--color-text-light)',
                    borderRadius: '8px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: canProceed() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Back button on preview step */}
          {currentStep === TOTAL_STEPS - 1 && (
            <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-bg-tertiary)' }}>
              <button onClick={handleBack} className="asrs-btn-secondary">
                Back
              </button>
            </div>
          )}

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

        {/* ── Report History ── */}
        <div className="asrs-card" style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--color-asrs-dark)', marginBottom: '1rem' }}>
            Report History
          </h2>

          {loadingReports ? (
            <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: '1rem' }}>
              Loading reports...
            </p>
          ) : reports.length === 0 ? (
            <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: '1.5rem' }}>
              No reports yet. Generate your first one above.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-bg-tertiary)' }}>
                    {['Report Name', 'Initiative', 'Created By', 'Date', 'Status'].map((h) => (
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
                  {reports.map((r) => (
                    <tr
                      key={r.id}
                      style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}
                    >
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: '500' }}>
                        <Link
                          href={`/report-creation/${r.id}`}
                          style={{
                            color: 'var(--color-asrs-orange)',
                            textDecoration: 'none',
                            fontWeight: '600',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {r.name || '(Untitled)'}
                        </Link>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                        {r.initiative_name || '\u2014'}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                        {r.created_by || '\u2014'}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-text-secondary)' }}>
                        {formatDate(r.created_at)}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span style={statusBadge(r.status)}>{r.status}</span>
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
