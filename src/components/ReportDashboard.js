/**
 * ============================================================================
 * REPORT DASHBOARD — The main content area displaying the selected report.
 * ============================================================================
 * This is the "brain" of the report page. It assembles all the sub-components:
 * - Report header (title, UUID, date)
 * - Summary statistics cards
 * - Filter and Sort panels
 * - Chart display (pie, bar, line)
 * - Data table
 * - Trend display
 * - Export and Share panels (conditional on user role)
 *
 * Props:
 * - reportData: Object — The full report data from dataService
 * - trendData: Array — The trend data for this initiative
 * - selectedInitiative: Object — The currently selected initiative
 * - userRole: string — 'public', 'staff', or 'admin'
 * ============================================================================
 */
'use client';

import { useState, useMemo } from 'react';
import FilterPanel from './FilterPanel';
import SortPanel from './SortPanel';
import ChartDisplay from './ChartDisplay';
import DataTable from './DataTable';
import TrendDisplay from './TrendDisplay';
import ExportPanel from './ExportPanel';
import SharePanel from './SharePanel';
import { getFilteredReportData, getSortedReportData } from '@/lib/dataService';

export default function ReportDashboard({ reportData, trendData, selectedInitiative, userRole }) {
  // ---- STATE for filters and sorts ----
  // activeFilters stores the user's current filter selections as key-value pairs
  // Example: { grade: "7th", school: "Lincoln MS" }
  const [activeFilters, setActiveFilters] = useState({});

  // activeSorts stores the user's sorting preferences as an array of objects
  // Example: [{ attribute: "Grade", direction: "asc" }]
  const [activeSorts, setActiveSorts] = useState([]);

  // Track which view tab is active: 'charts', 'table', or 'both'
  const [activeView, setActiveView] = useState('both');

  /**
   * useMemo — Recalculates filtered & sorted table data only when
   * the filters, sorts, or base report data change. This prevents
   * unnecessary recalculations on every render.
   */
  const processedTableData = useMemo(() => {
    if (!reportData?.tableData) return [];

    // Step 1: Apply filters (simulates database WHERE clause per REP020)
    let data = [...reportData.tableData];

    // Apply each active filter
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value && value !== 'All') {
        data = data.filter(row => {
          // Find the matching key in the row object
          const rowKeys = Object.keys(row);
          const matchKey = rowKeys.find(k =>
            k.toLowerCase() === key.toLowerCase().replace(/\s/g, '')
          );
          if (matchKey) {
            return String(row[matchKey]).toLowerCase().includes(String(value).toLowerCase());
          }
          return true;
        });
      }
    });

    // Step 2: Apply sorts (simulates database ORDER BY per REP021)
    // Per REP022, filtering happens BEFORE sorting
    if (activeSorts.length > 0) {
      data = getSortedReportData(data, activeSorts);
    }

    return data;
  }, [reportData, activeFilters, activeSorts]);

  // If no report data exists, show a message
  if (!reportData) {
    return (
      <div className="asrs-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>No report data available for this initiative.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ---- REPORT HEADER ---- */}
      {/* Shows the report title, UUID, and generation date (per REP030) */}
      <div className="asrs-card" style={{
        borderLeft: '4px solid var(--color-asrs-orange)'
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '700', margin: 0 }}>
              {reportData.initiativeName}
            </h2>
            <p style={{
              fontSize: '0.8rem', color: 'var(--color-text-light)',
              margin: '0.25rem 0 0 0', fontFamily: 'monospace'
            }}>
              {/* Per REP030: Report UUID displayed in header */}
              Report ID: {reportData.reportId}
            </p>
          </div>
          <span style={{
            fontSize: '0.85rem', color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-bg-secondary)',
            padding: '0.35rem 0.75rem', borderRadius: '20px'
          }}>
            Generated: {reportData.generatedDate}
          </span>
        </div>
      </div>

      {/* ---- SUMMARY STATISTICS ---- */}
      {/* Three cards showing key metrics at a glance */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <div className="asrs-card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', margin: 0 }}>
            Total Participants
          </p>
          <p style={{
            fontSize: '2rem', fontWeight: '700',
            color: 'var(--color-asrs-red)', margin: '0.25rem 0 0 0'
          }}>
            {reportData.summary.totalParticipants}
          </p>
        </div>
        <div className="asrs-card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', margin: 0 }}>
            Average Rating
          </p>
          <p style={{
            fontSize: '2rem', fontWeight: '700',
            color: 'var(--color-asrs-orange)', margin: '0.25rem 0 0 0'
          }}>
            {reportData.summary.averageRating}/5
          </p>
        </div>
        <div className="asrs-card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', margin: 0 }}>
            Completion Rate
          </p>
          <p style={{
            fontSize: '2rem', fontWeight: '700',
            color: 'var(--color-asrs-yellow)', margin: '0.25rem 0 0 0'
          }}>
            {reportData.summary.completionRate}%
          </p>
        </div>
      </div>

      {/* ---- VIEW TOGGLE + FILTER/SORT ROW ---- */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem'
      }}>
        {/* View toggle: Charts / Table / Both */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['charts', 'table', 'both'].map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={activeView === view ? 'asrs-btn-primary' : 'asrs-btn-secondary'}
              style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}
            >
              {view === 'both' ? 'Charts & Table' : view === 'charts' ? 'Charts Only' : 'Table Only'}
            </button>
          ))}
        </div>

        {/* Export and Share panels — only visible to Staff and Admin (per REP033) */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(userRole === 'staff' || userRole === 'admin') && (
            <ExportPanel reportData={reportData} />
          )}
          <SharePanel reportId={reportData.reportId} />
        </div>
      </div>

      {/* ---- FILTER & SORT PANELS ---- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem'
      }}>
        {/* Filter Panel — up to 7 attribute filters (per REP001/REP020) */}
        <FilterPanel
          attributes={selectedInitiative?.attributes || []}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
          tableData={reportData.tableData}
        />
        {/* Sort Panel — up to 7 sorting levels (per REP002/REP021) */}
        <SortPanel
          attributes={selectedInitiative?.attributes || []}
          activeSorts={activeSorts}
          onSortsChange={setActiveSorts}
        />
      </div>

      {/* ---- CHARTS ---- */}
      {/* Displayed for Public (website view) per REP016 — graphical displays */}
      {(activeView === 'charts' || activeView === 'both') && (
        <ChartDisplay chartData={reportData.chartData} />
      )}

      {/* ---- DATA TABLE ---- */}
      {(activeView === 'table' || activeView === 'both') && (
        <DataTable
          data={processedTableData}
          columns={reportData.tableData.length > 0 ? Object.keys(reportData.tableData[0]) : []}
        />
      )}

      {/* ---- TREND DISPLAY ---- */}
      {/* Only shows trends that have enabledDisplay === true (per REP010/REP011) */}
      {trendData && trendData.length > 0 && (
        <TrendDisplay trends={trendData} />
      )}
    </div>
  );
}