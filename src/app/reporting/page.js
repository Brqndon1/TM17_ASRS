/**
 * ============================================================================
 * REPORTING PAGE — Displays reports generated from the Report Creation page.
 * ============================================================================
 * Access at: /reporting
 *
 * Each initiative can have one assigned report (the most recent one created
 * for that initiative in Report Creation). Selecting an initiative shows
 * its assigned report snapshot.
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

export default function ReportingPage() {
  const [selectedInitiative, setSelectedInitiative] = useState(null);
  const [initiatives, setInitiatives] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [userRole, setUserRole] = useState('public');
  const [isLoading, setIsLoading] = useState(true);
  const [noReport, setNoReport] = useState(false);

  // Map of initiative_id → most recent report row (built once on load)
  const [reportMap, setReportMap] = useState({});

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [initiativesRes, reportsRes] = await Promise.all([
          fetch('/api/initiatives'),
          fetch('/api/reports'),
        ]);
        const initiativesData = await initiativesRes.json();
        const reportsData = await reportsRes.json();

        const initiativesList = initiativesData.initiatives || [];
        setInitiatives(initiativesList);

        // Build map: initiative_id → most recent report (reports come sorted by created_at DESC)
        const map = {};
        for (const r of (reportsData.reports || [])) {
          if (!map[r.initiative_id]) {
            map[r.initiative_id] = r;
          }
        }
        setReportMap(map);

        if (initiativesList.length > 0) {
          setSelectedInitiative(initiativesList[0]);
          loadReportForInitiative(initiativesList[0], map);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  function loadReportForInitiative(initiative, map) {
    const rMap = map || reportMap;
    const report = rMap[initiative.id];

    if (!report) {
      setReportData(null);
      setTrendData([]);
      setNoReport(true);
      return;
    }

    setNoReport(false);

    let parsed = null;
    try {
      parsed = typeof report.report_data === 'string'
        ? JSON.parse(report.report_data)
        : report.report_data;
    } catch {
      parsed = null;
    }

    if (parsed && parsed.version) {
      const results = parsed.results;
      setReportData({
        reportId: results.reportId,
        initiativeId: parsed.config.initiativeId,
        initiativeName: results.initiativeName,
        generatedDate: results.generatedDate,
        summary: results.summary,
        chartData: results.chartData,
        tableData: results.filteredTableData,
      });
      setTrendData(results.trendData || []);
    } else {
      setReportData(null);
      setTrendData([]);
      setNoReport(true);
    }
  }

  async function handleInitiativeSelect(initiative) {
    setIsLoading(true);
    setSelectedInitiative(initiative);
    loadReportForInitiative(initiative);
    setIsLoading(false);
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
      <div className="page-section-top">
        <BackButton />
      </div>

      {/* ---- INITIATIVE SELECTOR ---- */}
      <section className="page-section">
        <InitiativeSelector
          initiatives={initiatives}
          selectedInitiative={selectedInitiative}
          onSelect={handleInitiativeSelect}
        />
      </section>

      {/* ---- REPORT DASHBOARD ---- */}
      <section className="page-section-bottom">
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
        ) : noReport ? (
          <div className="asrs-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--color-text-light)', fontSize: '1.1rem' }}>
              No report has been assigned to this initiative yet.
            </p>
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Create one in Report Creation to see it here.
            </p>
          </div>
        ) : reportData ? (
          <>
            {/* ---- DOWNLOAD BAR ---- */}
            <div
              className="asrs-card"
              style={{
                marginBottom: '1.5rem',
                padding: '1rem 1.5rem',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-bg-tertiary)'
              }}
            >
              {/* Inner row — label left, buttons right; stacks on mobile */}
              <div className="download-bar-inner">
                <div style={{ fontWeight: 600 }}>Download Report</div>
                <div className="download-btn-group">
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
