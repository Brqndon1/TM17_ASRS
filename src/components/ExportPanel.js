/**
 * ============================================================================
 * EXPORT PANEL — Provides export buttons for Staff and Admin users.
 * ============================================================================
 * Per REP015/REP033:
 * - Export formats: CSV, XLSX, PDF, HTML
 * - Export is restricted to Staff and Admin users only.
 * - Per REP035: PDF export offers Charts Only, Data Table Only, or Both.
 *
 * [API ADJUSTMENT] When the backend is ready:
 * - Each export button should call an API endpoint that generates the file.
 * - Example: fetch(`https://your-api-url.com/api/reports/${reportId}/export?format=csv`)
 * - The API response should be a file download (blob).
 * - Replace the alert() calls below with actual fetch + download logic.
 * ============================================================================
 */
'use client';

import { useState } from 'react';

export default function ExportPanel({ reportData }) {
  // Controls whether the PDF options dropdown is visible
  const [showPdfOptions, setShowPdfOptions] = useState(false);

  /**
   * handleExport — Triggered when a user clicks an export format button.
   * Right now it shows an alert since there's no backend.
   *
   * [API ADJUSTMENT] Replace the alert with actual API calls:
   *   async function handleExport(format, pdfMode) {
   *     const response = await fetch(
   *       `/api/reports/${reportData.reportId}/export?format=${format}&mode=${pdfMode || 'both'}`
   *     );
   *     const blob = await response.blob();
   *     const url = window.URL.createObjectURL(blob);
   *     const a = document.createElement('a');
   *     a.href = url;
   *     a.download = `${reportData.reportId}.${format}`;
   *     a.click();
   *   }
   */
  function handleExport(format, pdfMode) {
    if (format === 'pdf' && !pdfMode) {
      setShowPdfOptions(!showPdfOptions);
      return;
    }
    alert(
      `Export triggered!\nFormat: ${format.toUpperCase()}\n` +
      (pdfMode ? `PDF Mode: ${pdfMode}\n` : '') +
      `Report: ${reportData.reportId}\n\n` +
      `[This will call the export API when the backend is ready]`
    );
    setShowPdfOptions(false);
  }

  const formats = ['csv', 'xlsx', 'pdf', 'html'];

  return (
    <div style={{ position: 'relative', display: 'flex', gap: '0.35rem' }}>
      {formats.map(format => (
        <button
          key={format}
          onClick={() => handleExport(format)}
          className="asrs-btn-secondary"
          style={{
            fontSize: '0.75rem',
            padding: '0.35rem 0.6rem',
            textTransform: 'uppercase',
            fontWeight: '600'
          }}
        >
          {format}
        </button>
      ))}

      {/* PDF Options Dropdown — per REP035 */}
      {showPdfOptions && (
        <div style={{
          position: 'absolute', top: '100%', right: 0,
          marginTop: '0.35rem', backgroundColor: 'white',
          border: '1px solid var(--color-bg-tertiary)',
          borderRadius: '8px', padding: '0.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 50, minWidth: '150px'
        }}>
          <p style={{ fontSize: '0.75rem', fontWeight: '600', margin: '0 0 0.35rem', color: 'var(--color-text-secondary)' }}>
            PDF Display Mode:
          </p>
          {['Charts Only', 'Data Table Only', 'Both'].map(mode => (
            <button
              key={mode}
              onClick={() => handleExport('pdf', mode.toLowerCase().replace(' ', '_'))}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '0.35rem 0.5rem', fontSize: '0.8rem',
                background: 'none', border: 'none', cursor: 'pointer',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-bg-secondary)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              {mode}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}