'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import InitiativeSelector from '@/components/InitiativeSelector';
import ReportDashboard from '@/components/ReportDashboard';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { toReportMapByInitiative, toReportingViewModel } from '@/lib/adapters/report-api-adapter';
import { getUiEventBus } from '@/lib/events/ui-event-bus';
import EVENTS from '@/lib/events/event-types';

export default function ReportingPage() {
  const { user } = useAuthStore();
  const [selectedInitiative, setSelectedInitiative] = useState(null);
  const [initiatives, setInitiatives] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportMap, setReportMap] = useState({});

  // social sharing state
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSocialMenu, setShowSocialMenu] = useState(false);

  const userRole = user?.user_type || 'public';
  const canAccess = userRole === 'staff' || userRole === 'admin';

  useEffect(() => {
    if (!canAccess) {
      setIsLoading(false);
      return;
    }

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

        const nextMap = toReportMapByInitiative(reportsData.reports || []);
        setReportMap(nextMap);

        if (initiativesList.length > 0) {
          const first = initiativesList[0];
          setSelectedInitiative(first);
          loadReportForInitiative(first, nextMap);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, [canAccess]);

  useEffect(() => {
    const bus = getUiEventBus();
    const unsubscribe = bus.subscribe(EVENTS.REPORT_UPDATED, async () => {
      if (!canAccess) return;
      try {
        const res = await fetch('/api/reports');
        const data = await res.json();
        const nextMap = toReportMapByInitiative(data.reports || []);
        setReportMap(nextMap);
        if (selectedInitiative) {
          loadReportForInitiative(selectedInitiative, nextMap);
        }
      } catch (error) {
        console.error('Failed to refresh reports after update event:', error);
      }
    });
    return unsubscribe;
  }, [canAccess, selectedInitiative]);

  function loadReportForInitiative(initiative, mapOverride) {
    const currentMap = mapOverride || reportMap;
    const report = currentMap[initiative.id];

    if (!report) {
      setReportData(null);
      setTrendData([]);
      return;
    }

    const viewModel = toReportingViewModel(report);
    setReportData(viewModel.reportData);
    setTrendData(viewModel.trendData);
  }

  async function handleInitiativeSelect(initiative) {
    setIsLoading(true);
    setSelectedInitiative(initiative);
    setShowSocialMenu(false);
    loadReportForInitiative(initiative);
    setIsLoading(false);
  }

  function togglePlatform(platform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((item) => item !== platform)
        : [...prev, platform]
    );
  }

  async function handlePostToSocialMedia() {
    if (!reportData || selectedPlatforms.length === 0) {
      alert('Select at least one platform.');
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    try {
      for (const platform of selectedPlatforms) {
        console.log(`Uploading report ${reportData.reportId} to ${platform}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setUploadStatus('Upload successful.');
      setSelectedPlatforms([]);
    } catch (error) {
      console.error(error);
      setUploadStatus('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleCreateShareableLink() {
    if (!reportData || !selectedInitiative) return;

    const shareableUrl = `${window.location.origin}/reporting?reportId=${reportData.reportId}&initiativeId=${selectedInitiative.id}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareableUrl)
        .then(() => alert('Shareable link copied to clipboard!'))
        .catch(() => window.prompt('Copy this shareable report link:', shareableUrl));
      return;
    }

    window.prompt('Copy this shareable report link:', shareableUrl);
  }

  function handleDownload(format) {
    if (!reportData || !selectedInitiative) return;

    const fileName = `${selectedInitiative.name.replace(/\s+/g, '_')}_Report`;

    if (format === 'csv') {
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        Object.keys(reportData).join(',') +
        '\n' +
        Object.values(reportData).join(',');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${fileName}.csv`);
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
      const link = document.createElement('a');
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
        .join('\n');

      const blob = new Blob([worksheet], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.xlsx`;
      link.click();
    }
  }

  if (!canAccess) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
        <Header />
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem 1.5rem 0' }}>
          <BackButton />
        </div>
        <section style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem 1.5rem 2rem' }}>
          <div className="asrs-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Reporting Access Required
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Only staff and admin users can view this page.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />

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
        {isLoading && (
          <div className="asrs-card" style={{ textAlign: 'center', padding: '2rem' }}>
            Loading reports...
          </div>
        )}

        {!isLoading && !reportData && selectedInitiative && (
          <div className="asrs-card" style={{ textAlign: 'center', padding: '2rem' }}>
            No generated report found for this initiative yet.
          </div>
        )}

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
                  border: '1px solid var(--color-bg-tertiary)',
                }}
              >
                <div style={{ fontWeight: 600 }}>Download Report</div>

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
                        cursor: 'pointer',
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
                      cursor: 'pointer',
                    }}
                  >
                    Create Shareable Link
                  </button>

                  {userRole === 'admin' && (
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setShowSocialMenu((prev) => !prev)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.8rem',
                          borderRadius: '6px',
                          border: '1px solid var(--color-bg-tertiary)',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          opacity: 0.8,
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
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
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
                              backgroundColor: 'var(--color-asrs-orange)',
                              color: '#fff',
                              cursor: isUploading ? 'not-allowed' : 'pointer',
                              opacity: isUploading ? 0.8 : 1,
                            }}
                          >
                            {isUploading ? 'Posting...' : 'Post'}
                          </button>

                          {uploadStatus && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.8 }}>
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
    </main>
  );
}
