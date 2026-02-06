/**
 * ============================================================================
 * MAIN PAGE — The front page / landing page of the ASRS Reporting System.
 * ============================================================================
 * This is what users see when they visit the root URL (http://localhost:3000).
 *
 * "use client" is required because this component uses React hooks
 * (useState, useEffect) for managing which initiative is selected
 * and what data is being displayed.
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
import InitiativeSelector from '@/components/InitiativeSelector';
import ReportDashboard from '@/components/ReportDashboard';
import { getInitiatives, getReportData, getTrendData } from '@/lib/dataService';

export default function HomePage() {
  // ---- STATE VARIABLES ----
  // These track what the user has selected and what data we're displaying.

  // Which initiative the user has clicked on (null means none selected yet)
  const [selectedInitiative, setSelectedInitiative] = useState(null);

  // The list of all available initiatives (loaded from JSON/API on page load)
  const [initiatives, setInitiatives] = useState([]);

  // The report data for the currently selected initiative
  const [reportData, setReportData] = useState(null);

  // The trend data for the currently selected initiative
  const [trendData, setTrendData] = useState([]);

  // The current user role — determines what UI elements are visible
  // Public users see reports only; Staff/Admin see export & management options
  const [userRole, setUserRole] = useState('public');

  // Loading state to show a spinner while data is being fetched
  const [isLoading, setIsLoading] = useState(true);

  /**
   * useEffect — Runs ONCE when the page first loads.
   * Fetches the list of initiatives and selects the first one by default.
   *
   * [API ADJUSTMENT] This will work the same way when you switch to real APIs
   * because getInitiatives() in dataService.js handles the switch internally.
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
      {/* Shows the ASRS logo, system title, and a role selector dropdown */}
      <Header userRole={userRole} onRoleChange={setUserRole} />

      {/* ---- INITIATIVE SELECTOR ---- */}
      {/* Row of clickable cards for each of the 7 ASRS initiatives */}
      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 1.5rem' }}>
        <InitiativeSelector
          initiatives={initiatives}
          selectedInitiative={selectedInitiative}
          onSelect={handleInitiativeSelect}
        />
      </section>

      {/* ---- REPORT DASHBOARD ---- */}
      {/* The main content area: charts, filters, data table, trends, export */}
      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem 2rem' }}>
        {isLoading ? (
          // Simple loading indicator while data is being fetched
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
          // Fallback message if no data is available
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