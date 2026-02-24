/**
 * ============================================================================
 * REPORTING PAGE — Displays reports generated from the Report Creation page.
 * ============================================================================
 */
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import InitiativeSelector from '@/components/InitiativeSelector';
import ReportDashboard from '@/components/ReportDashboard';
import { normalizeSnapshot } from '@/lib/report-snapshot';

export default function ReportingPage() {
  const [selectedInitiative, setSelectedInitiative] = useState(null);
  const [initiatives, setInitiatives] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [userRole, setUserRole] = useState('public');
  const [isLoading, setIsLoading] = useState(true);
  const [noReport, setNoReport] = useState(false);

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

    const normalized = normalizeSnapshot(parsed);
    if (normalized) {
      const results = normalized.results;
      setReportData({
        reportId: results.reportId,
        initiativeId: normalized.config.initiativeId,
        initiativeName: results.initiativeName,
        generatedDate: results.generatedDate,
        summary: results.summary,
        chartData: results.chartData,
        tableData: results.filteredTableData,
        explainability: results.explainability,
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
   * Create shareable link
   */
  function handleCreateShareableLink() {
    if (!reportData || !selectedInitiative) return;

    const shareableUrl = `${window.location.origin}/reporting?reportId=${reportData.reportId}&initiativeId=${selectedInitiative.id}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareableUrl)
        .then(() => {
          alert("Shareable link copied to clipboard!");
        })
        .catch(() => {
          window.prompt("Copy this shareable report link:", shareableUrl);
        });
    } else {
      window.prompt("Copy this shareable report link:", shareableUrl);
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
      <Header userRole={userRole} onRoleChange={setUserRole} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 1.5rem 0' }}>
        <BackButton />
      </div>

      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 1.5rem' }}>
        <InitiativeSelector
          initiatives={initiatives}
          selectedInitiative={selectedInitiative}
          onSelect={handleInitiativeSelect}
        />
      </section>

      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem 2rem' }}>
        {reportData && (
          <>
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
                      cursor: 'pointer'
                    }}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}

                <button
                  onClick={handleCreateShareableLink}
                  style={{
                    padding: '0.5rem 0.9rem',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    borderRadius: '6px',
                    border: '1px solid var(--color-bg-tertiary)',
                    backgroundColor: 'var(--color-bg-primary)',
                    cursor: 'pointer'
                  }}
                >
                  Create Shareable Link
                </button>
              </div>
            </div>

            <ReportDashboard
              reportData={reportData}
              trendData={trendData}
              selectedInitiative={selectedInitiative}
              userRole={userRole}
            />
          </>
        )}
      </section>
    </main>
  );
}
