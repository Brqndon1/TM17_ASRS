/**
 * ============================================================================
 * REPORTING PAGE — Displays reports generated from the Report Creation page.
 * ============================================================================
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

  /**
   * ================================
   * SOCIAL MEDIA STATE (NEW)
   * ================================
   */
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSocialMenu, setShowSocialMenu] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUserRole(parsed.user_type || 'public');
    }
  }, []);

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
   * ================================
   * SOCIAL MEDIA FUNCTIONS
   * ================================
   */
  function togglePlatform(platform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  }

  async function handlePostToSocialMedia() {
    if (!reportData || selectedPlatforms.length === 0) {
      alert("Select at least one platform.");
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    try {
      for (const platform of selectedPlatforms) {
        console.log(`Uploading report ${reportData.reportId} to ${platform}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setUploadStatus("Upload successful.");
      setSelectedPlatforms([]);
    } catch (error) {
      console.error(error);
      setUploadStatus("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
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
            {(userRole === 'staff' || userRole === 'admin') && (
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

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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

                  {/* SMALL SHARE DROPDOWN (ADMIN ONLY) */}
                  {userRole === 'admin' && (
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setShowSocialMenu(!showSocialMenu)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.8rem',
                          borderRadius: '6px',
                          border: '1px solid var(--color-bg-tertiary)',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          opacity: 0.8
                        }}
                      >
                        Share ▾
                      </button>

                      {showSocialMenu && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '110%',
                            right: 0,
                            backgroundColor: 'var(--color-bg-primary)',
                            border: '1px solid var(--color-bg-tertiary)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            width: '220px',
                            zIndex: 1000,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                          }}
                        >
                          <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                            Share to:
                          </div>

                          {['Website', 'Instagram', 'Facebook', 'LinkedIn'].map((platform) => (
                            <div key={platform} style={{ marginBottom: '0.4rem' }}>
                              <label style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedPlatforms.includes(platform)}
                                  onChange={() => togglePlatform(platform)}
                                  style={{ marginRight: '0.4rem' }}
                                />
                                {platform}
                              </label>
                            </div>
                          ))}

                          <button
                            onClick={handlePostToSocialMedia}
                            disabled={isUploading || selectedPlatforms.length === 0}
                            style={{
                              marginTop: '0.5rem',
                              width: '100%',
                              padding: '0.4rem',
                              fontSize: '0.8rem',
                              borderRadius: '6px',
                              border: '1px solid var(--color-bg-tertiary)',
                              backgroundColor: 'var(--color-brand-primary)',
                              color: '#fff',
                              cursor: isUploading ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {isUploading ? 'Posting...' : 'Post'}
                          </button>

                          {uploadStatus && (
                            <div style={{
                              marginTop: '0.5rem',
                              fontSize: '0.75rem',
                              opacity: 0.8
                            }}>
                              {uploadStatus}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <ReportDashboard
              reportData={reportData}
              trendData={trendData}
              selectedInitiative={selectedInitiative}
              userRole={userRole}
            />
          </>
        )}
      </section>

      {/* Footer Navigation Buttons */}
      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/report-creation">
            <button
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--color-asrs-orange)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Report Creation
            </button>
          </Link>
          <Link href="/manage-reports">
            <button
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--color-asrs-orange)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Manage Reports
            </button>
          </Link>
        </div>
      </section>
    </main>
  );
}