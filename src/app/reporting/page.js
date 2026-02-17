/**
 * ============================================================================
 * REPORTING PAGE — The ASRS Initiatives Reporting System page.
 * ============================================================================
 * This page hosts the full reporting dashboard for ASRS initiatives.
 * Access at: /reporting
 *
 * LAYOUT STRUCTURE:
 * ┌─────────────────────────────────────────────────────┐
 * │ Header (Logo + Title + Role Selector)               │
 * ├─────────────────────────────────────────────────────┤
 * │ Initiative Selector (7 clickable cards)             │
 * ├─────────────────────────────────────────────────────┤
 * │ Report Dashboard (Charts + Filters + Table + Trends)│
 * └─────────────────────────────────────────────────────┘
 * ============================================================================
 */
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import InitiativeSelector from '@/components/InitiativeSelector';
import ReportDashboard from '@/components/ReportDashboard';
import { getInitiatives, getReportData, getTrendData } from '@/lib/data-service';

export default function ReportingPage() {
  // ---- STATE VARIABLES ----
  const [selectedInitiative, setSelectedInitiative] = useState(null);
  const [initiatives, setInitiatives] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [userRole, setUserRole] = useState('public');
  const [isLoading, setIsLoading] = useState(true);

  /**
   * useEffect — Runs ONCE when the page first loads.
   */
  useEffect(() => {
    async function loadInitialData() {
      try {
        const initiativesList = await getInitiatives();
        setInitiatives(initiativesList);

        if (initiativesList.length > 0) {
          setSelectedInitiative(initiativesList[0]);
          const report = await getReportData(initiativesList[0].id);
          const trends = await getTrendData(initiativesList[0].id);
          setReportData(report);
          setTrendData(trends);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  /**
   * handleInitiativeSelect
   */
  async function handleInitiativeSelect(initiative) {
    setIsLoading(true);
    setSelectedInitiative(initiative);

    try {
      const report = await getReportData(initiative.id);
      const trends = await getTrendData(initiative.id);
      setReportData(report);
      setTrendData(trends);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * handleDownload — Exports the current report
   */
  function handleDownload(format) {
    if (!reportData || !selectedInitiative) return;

    const fileName = `${selectedInitiative.name.replace(/\s+/g, '_')}_Report`;

    if (format === 'csv') {
      const csvContent =
        "data:text/csv;charset=utf-8," +
        Object.keys(reportData).join(",") +
        "\n" +
        Object.values(reportData).join(",");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    if (format === 'html') {
      const htmlContent = `
        <html>
          <head><title>${fileName}</title></head>
          <body>
            <h1>${selectedInitiative.name} Report</h1>
            <pre>${JSON.stringify(reportData, null, 2)}</pre>
          </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.html`;
      link.click();
    }

    if (format === 'pdf') {
      window.print();
    }

    if (format === 'xlsx') {
      const worksheet = Object.entries(reportData)
        .map(([key, value]) => `${key}\t${value}`)
        .join("\n");

      const blob = new Blob([worksheet], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.xlsx`;
      link.click();
    }
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      {/* ---- HEADER ---- */}
      <Header userRole={userRole} onRoleChange={setUserRole} />

      {/* ---- BACK BUTTON ---- */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 1.5rem 0' }}>
        <BackButton />
      </div>

      {/* ---- INITIATIVE SELECTOR ---- */}
      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 1.5rem' }}>
        <InitiativeSelector
          initiatives={initiatives}
          selectedInitiative={selectedInitiative}
          onSelect={handleInitiativeSelect}
        />
      </section>

      {/* ---- REPORT DASHBOARD ---- */}
      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem 2rem' }}>
        {isLoading ? (
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '4rem', color: 'var(--color-text-light)'
          }}>
            <div style={{
              width: '40px', height: '40px',
              border: '4px solid var(--color-bg-tertiary)',
              borderTop: '4px solid var(--color-asrs-orange)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ marginLeft: '1rem', fontSize: '1.1rem' }}>
              Loading report data...
            </span>
          </div>
        ) : reportData ? (
          <>
            {/* ---- DOWNLOAD BAR ---- */}
            <div
              className="asrs-card"
              style={{
                marginBottom: '1.5rem',
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-bg-tertiary)'
              }}
            >
              <div style={{ fontWeight: 600 }}>
                Download Report
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {['pdf', 'csv', 'xlsx', 'html'].map((format) => (
                  <button
                    key={format}
                    onClick={() => handleDownload(format)}
                    style={{
                      padding: '0.5rem 0.9rem',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      borderRadius: '6px',
                      border: '1px solid var(--color-bg-tertiary)',
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'var(--color-asrs-orange)';
                      e.target.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'var(--color-bg-primary)';
                      e.target.style.color = 'var(--color-text-primary)';
                    }}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <ReportDashboard
              reportData={reportData}
              trendData={trendData}
              selectedInitiative={selectedInitiative}
              userRole={userRole}
            />
          </>
        ) : (
          <div className="asrs-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--color-text-light)', fontSize: '1.1rem' }}>
              Select an initiative above to view its report.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}