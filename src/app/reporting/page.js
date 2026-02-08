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
import Header from '@/frontend/asrs-reporting-ui/components/Header';
import InitiativeSelector from '@/frontend/asrs-reporting-ui/components/InitiativeSelector';
import ReportDashboard from '@/frontend/asrs-reporting-ui/components/ReportDashboard';
import { getInitiatives, getReportData, getTrendData } from '@/frontend/asrs-reporting-ui/lib/dataService';

export default function ReportingPage() {
  // ---- STATE VARIABLES ----
  // Which initiative the user has clicked on (null means none selected yet)
  const [selectedInitiative, setSelectedInitiative] = useState(null);

  // The list of all available initiatives (loaded from JSON/API on page load)
  const [initiatives, setInitiatives] = useState([]);

  // The report data for the currently selected initiative
  const [reportData, setReportData] = useState(null);

  // The trend data for the currently selected initiative
  const [trendData, setTrendData] = useState([]);

  // The current user role — determines what UI elements are visible
  const [userRole, setUserRole] = useState('public');

  // Loading state to show a spinner while data is being fetched
  const [isLoading, setIsLoading] = useState(true);

  /**
   * useEffect — Runs ONCE when the page first loads.
   * Fetches the list of initiatives and selects the first one by default.
   */
  useEffect(() => {
    async function loadInitialData() {
      try {
        const initiativesList = await getInitiatives();
        setInitiatives(initiativesList);

        // Automatically select the first initiative so the page isn't blank
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
   * handleInitiativeSelect — Called when the user clicks an initiative card.
   * Loads the report data and trend data for that initiative.
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

  return (
    <main
      style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* ---- HEADER ---- */}
      <Header userRole={userRole} onRoleChange={setUserRole} />

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
              width: '40px', height: '40px', border: '4px solid var(--color-bg-tertiary)',
              borderTop: '4px solid var(--color-asrs-orange)',
              borderRadius: '50%', animation: 'spin 1s linear infinite'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ marginLeft: '1rem', fontSize: '1.1rem' }}>Loading report data...</span>
          </div>
        ) : reportData ? (
          <ReportDashboard
            reportData={reportData}
            trendData={trendData}
            selectedInitiative={selectedInitiative}
            userRole={userRole}
          />
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
