'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import InitiativeSelector from '@/components/InitiativeSelector';
import ReportDashboard from '@/components/ReportDashboard';
import { normalizeSnapshot } from '@/lib/report-snapshot';

const PDF_DISPLAY_OPTIONS = [
  { value: 'charts', label: 'Charts only' },
  { value: 'table', label: 'Data table only' },
  { value: 'both', label: 'Both' },
];

const PDF_LAYOUT_OPTIONS = [
  { value: 'side-by-side', label: 'Side-by-side' },
  { value: 'sequential', label: 'Sequential' },
];

const SOCIAL_PLATFORMS = ['Website', 'Instagram', 'Facebook', 'LinkedIn'];
const DOWNLOAD_FORMATS = ['csv', 'xlsx', 'html'];
const LABEL_KEY_PRIORITY = ['label', 'name', 'category', 'platform', 'period', 'date', 'month', 'metric', 'type'];
const CHART_POINT_LIMIT = 12;

export default function ReportingPage() {
  const [selectedInitiative, setSelectedInitiative] = useState(null);
  const [initiatives, setInitiatives] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [reportDbId, setReportDbId] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [userRole, setUserRole] = useState('public');
  const [isLoading, setIsLoading] = useState(true);
  const [noReport, setNoReport] = useState(false);
  const [reportMap, setReportMap] = useState({});
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSocialMenu, setShowSocialMenu] = useState(false);
  const [pdfDisplayMode, setPdfDisplayMode] = useState('both');
  const [pdfLayoutMode, setPdfLayoutMode] = useState('side-by-side');

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
        for (const r of reportsData.reports || []) {
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
      setReportDbId(null);
      setAiInsights(null);
      setNoReport(true);
      return;
    }

    setNoReport(false);
    setReportDbId(report.id ?? null);

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
      setAiInsights(results.aiInsights || null);
    } else {
      setReportData(null);
      setTrendData([]);
      setAiInsights(null);
      setNoReport(true);
    }
  }

  async function handleInitiativeSelect(initiative) {
    setIsLoading(true);
    setSelectedInitiative(initiative);
    loadReportForInitiative(initiative);
    setIsLoading(false);
  }

  function togglePlatform(platform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
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
        .then(() => {
          alert('Shareable link copied to clipboard!');
        })
        .catch(() => {
          window.prompt('Copy this shareable report link:', shareableUrl);
        });
    } else {
      window.prompt('Copy this shareable report link:', shareableUrl);
    }
  }

  function formatLabel(value) {
    return String(value || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function displayValue(value) {
    if (value == null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function escapeHtml(value) {
    return displayValue(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toNumberOrNull(value) {
    const number = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function sortByPriority(values, priority) {
    return [...values].sort((a, b) => {
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      const aRank = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const bRank = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

      if (aRank !== bRank) return aRank - bRank;
      return String(a).localeCompare(String(b));
    });
  }

  function sortPoints(points) {
    return [...points].sort((a, b) => {
      const aValue = Math.abs(a.value);
      const bValue = Math.abs(b.value);
      if (aValue !== bValue) return bValue - aValue;
      return String(a.label).localeCompare(String(b.label));
    });
  }

  function getLabelKey(rows) {
    const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const orderedKeys = sortByPriority(keys, LABEL_KEY_PRIORITY);
    return orderedKeys.find((key) => rows.some((row) => typeof row[key] === 'string')) || orderedKeys[0];
  }

  function getSectionsFromArray(data, fallbackTitle) {
    const rows = data.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
    if (!rows.length) return [];

    const labelKey = getLabelKey(rows);
    const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const numericKeys = keys.filter((key) => key !== labelKey && rows.some((row) => toNumberOrNull(row[key]) !== null));

    return sortByPriority(numericKeys, []).map((key) => {
      const title = numericKeys.length === 1
        ? (formatLabel(key) === 'Value' ? formatLabel(fallbackTitle) : formatLabel(key))
        : `${formatLabel(fallbackTitle)} — ${formatLabel(key)}`;

      return {
        title,
        points: sortPoints(
          rows
            .map((row, index) => ({
              label: row[labelKey] ?? `Item ${index + 1}`,
              value: toNumberOrNull(row[key]),
            }))
            .filter((point) => point.value !== null)
        ),
      };
    }).filter((section) => section.points.length > 0);
  }

  function getSectionsFromObject(data, fallbackTitle) {
    const entries = Object.entries(data || {}).filter(([, value]) => value != null);
    if (!entries.length) return [];

    if (entries.every(([, value]) => toNumberOrNull(value) !== null)) {
      return [
        {
          title: formatLabel(fallbackTitle),
          points: sortPoints(
            entries
              .map(([label, value]) => ({
                label,
                value: toNumberOrNull(value),
              }))
              .filter((point) => point.value !== null)
          ),
        },
      ];
    }

    if (entries.every(([, value]) => Array.isArray(value))) {
      return entries.flatMap(([key, value]) => getSectionsFromData(value, key));
    }

    if (entries.every(([, value]) => value && typeof value === 'object' && !Array.isArray(value))) {
      const numericKeys = [
        ...new Set(
          entries.flatMap(([, value]) =>
            Object.keys(value).filter((key) => toNumberOrNull(value[key]) !== null)
          )
        ),
      ];

      return sortByPriority(numericKeys, []).map((key) => ({
        title: `${formatLabel(fallbackTitle)} — ${formatLabel(key)}`,
        points: sortPoints(
          entries
            .map(([label, value]) => ({
              label,
              value: toNumberOrNull(value[key]),
            }))
            .filter((point) => point.value !== null)
        ),
      })).filter((section) => section.points.length > 0);
    }

    return [];
  }

  function getSectionsFromData(data, fallbackTitle) {
    if (!data) return [];
    if (Array.isArray(data)) return getSectionsFromArray(data, fallbackTitle);
    if (typeof data === 'object') return getSectionsFromObject(data, fallbackTitle);
    return [];
  }

  function getChartSections() {
    const sections = [
      ...getSectionsFromData(reportData?.chartData, 'Charts'),
      ...getSectionsFromData(trendData, 'Trends'),
    ];

    const seen = new Set();

    return sections.filter((section) => {
      const key = `${section.title}:${section.points.map((point) => `${point.label}-${point.value}`).join('|')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.title.localeCompare(b.title));
  }

  function buildChartsHtml() {
    const sections = getChartSections();

    if (!sections.length) {
      return `
        <div class="card">
          <h2>Charts</h2>
          <p class="muted">No chart data available.</p>
        </div>
      `;
    }

    return `
      <div class="card">
        <h2>Charts</h2>
        ${sections.map((section) => {
          const visiblePoints = section.points.slice(0, CHART_POINT_LIMIT);
          const maxValue = Math.max(...visiblePoints.map((point) => Math.abs(point.value)), 0);
          const hiddenCount = section.points.length - visiblePoints.length;

          return `
            <section class="chart-block">
              <h3>${escapeHtml(section.title)}</h3>
              ${visiblePoints.map((point) => {
                const width = maxValue === 0 ? 0 : Math.max((Math.abs(point.value) / maxValue) * 100, 2);
                return `
                  <div class="bar-row">
                    <div class="bar-label">${escapeHtml(point.label)}</div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${width}%"></div>
                    </div>
                    <div class="bar-value">${escapeHtml(point.value)}</div>
                  </div>
                `;
              }).join('')}
              ${hiddenCount > 0 ? `<p class="muted">Showing first ${visiblePoints.length} of ${section.points.length} values.</p>` : ''}
            </section>
          `;
        }).join('')}
      </div>
    `;
  }

  function buildTableHtml() {
    const rows = Array.isArray(reportData?.tableData) ? reportData.tableData : [];

    if (!rows.length) {
      return `
        <div class="card">
          <h2>Data Table</h2>
          <p class="muted">No table data available.</p>
        </div>
      `;
    }

    const normalizedRows = rows.map((row) =>
      row && typeof row === 'object' && !Array.isArray(row) ? row : { value: row }
    );
    const columns = sortByPriority(
      [...new Set(normalizedRows.flatMap((row) => Object.keys(row)))],
      LABEL_KEY_PRIORITY
    );

    return `
      <div class="card">
        <h2>Data Table</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                ${columns.map((column) => `<th>${escapeHtml(formatLabel(column))}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${normalizedRows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join('')}</tr>`).join('\n')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function buildPdfHtml(fileName) {
    const showCharts = pdfDisplayMode === 'charts' || pdfDisplayMode === 'both';
    const showTable = pdfDisplayMode === 'table' || pdfDisplayMode === 'both';
    const contentClass = showCharts && showTable && pdfLayoutMode === 'side-by-side' ? 'split' : 'stack';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(fileName)}</title>
          <style>
            @page {
              margin: 0.55in;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              background: #ffffff;
            }

            .page {
              width: 100%;
            }

            .page-header {
              display: flex;
              justify-content: space-between;
              gap: 1.5rem;
              align-items: flex-start;
              padding-bottom: 1rem;
              margin-bottom: 1rem;
              border-bottom: 2px solid #111827;
            }

            .eyebrow {
              margin: 0 0 0.35rem;
              font-size: 0.75rem;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #4b5563;
            }

            .page-header h1 {
              margin: 0;
              font-size: 1.7rem;
              line-height: 1.2;
            }

            .meta-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 0.75rem;
              min-width: 320px;
            }

            .meta-item {
              border: 1px solid #d1d5db;
              border-radius: 10px;
              padding: 0.75rem;
            }

            .meta-item span {
              display: block;
              font-size: 0.72rem;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              color: #6b7280;
              margin-bottom: 0.25rem;
            }

            .meta-item strong {
              font-size: 0.95rem;
            }

            .card {
              border: 1px solid #d1d5db;
              border-radius: 12px;
              padding: 1rem;
              margin-bottom: 1rem;
              break-inside: avoid;
            }

            .card h2 {
              margin: 0 0 0.85rem;
              font-size: 1.1rem;
            }

            .card h3 {
              margin: 0 0 0.75rem;
              font-size: 0.95rem;
            }

            .card p {
              margin: 0;
              line-height: 1.5;
              font-size: 0.92rem;
            }

            .muted {
              color: #6b7280;
              font-size: 0.82rem;
              margin-top: 0.75rem;
            }

            .content.split {
              display: block;
            }

            .content.stack {
              display: block;
            }

            .chart-block {
              padding: 0.9rem 0;
              border-top: 1px solid #e5e7eb;
            }

            .chart-block:first-of-type {
              border-top: none;
              padding-top: 0;
            }

            .bar-row {
              display: grid;
              grid-template-columns: minmax(110px, 180px) minmax(0, 1fr) 72px;
              gap: 0.75rem;
              align-items: center;
              margin-bottom: 0.55rem;
            }

            .bar-label,
            .bar-value {
              font-size: 0.84rem;
            }

            .bar-value {
              text-align: right;
              font-weight: 600;
            }

            .bar-track {
              width: 100%;
              height: 10px;
              border-radius: 999px;
              background: #e5e7eb;
              overflow: hidden;
            }

            .bar-fill {
              height: 100%;
              border-radius: 999px;
              background: #111827;
            }

            .table-wrap {
              width: 100%;
              overflow-x: auto;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 0.75rem;
              table-layout: auto;
            }

            th,
            td {
              border: 1px solid #d1d5db;
              padding: 0.4rem 0.5rem;
              text-align: left;
              vertical-align: top;
              white-space: nowrap;
            }

            th {
              background: #f3f4f6;
              font-weight: 700;
              white-space: nowrap;
            }

            tr {
              break-inside: avoid;
            }

            @media print {
              .page-header {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <header class="page-header">
              <div>
                <p class="eyebrow">Report Export</p>
                <h1>${escapeHtml(selectedInitiative?.name || 'Report')}</h1>
              </div>
              <div class="meta-grid">
                <div class="meta-item">
                  <span>Generated</span>
                  <strong>${escapeHtml(reportData?.generatedDate || 'N/A')}</strong>
                </div>
                <div class="meta-item">
                  <span>Display</span>
                  <strong>${escapeHtml(formatLabel(pdfDisplayMode))}</strong>
                </div>
                <div class="meta-item">
                  <span>Layout</span>
                  <strong>${escapeHtml(showCharts && showTable ? formatLabel(pdfLayoutMode) : 'Single section')}</strong>
                </div>
                <div class="meta-item">
                  <span>Initiative</span>
                  <strong>${escapeHtml(reportData?.initiativeName || selectedInitiative?.name || 'N/A')}</strong>
                </div>
              </div>
            </header>

            <section class="card">
              <h2>Summary</h2>
              ${reportData?.summary && typeof reportData.summary === 'object' ? `
                <div style="display:flex;gap:1.5rem;flex-wrap:wrap">
                  <div><strong>Total Participants:</strong> ${escapeHtml(reportData.summary.totalParticipants)}</div>
                  <div><strong>Average Rating:</strong> ${escapeHtml(reportData.summary.averageRating)}/5</div>
                  <div><strong>Completion Rate:</strong> ${escapeHtml(reportData.summary.completionRate)}%</div>
                </div>
              ` : `<p>${escapeHtml(reportData?.summary || 'No summary available.')}</p>`}
            </section>

            ${reportData?.explainability ? `
              <section class="card">
                <h2>Explainability</h2>
                <p>${escapeHtml(reportData.explainability)}</p>
              </section>
            ` : ''}

            <section class="content ${contentClass}">
              ${showCharts ? buildChartsHtml() : ''}
              ${showTable ? buildTableHtml() : ''}
            </section>
          </div>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
              window.onafterprint = function () {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;
  }

  function handleDownload(format) {
    if (!reportData || !selectedInitiative) return;

    const fileName = `${selectedInitiative.name.replace(/\s+/g, '_')}_Report`;

    if (format === 'csv') {
      const rows = reportData.tableData || [];
      if (rows.length === 0) return;
      const columns = Object.keys(rows[0]);
      const csvLines = [
        columns.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','),
        ...rows.map((row) =>
          columns.map((c) => {
            const val = row[c] == null ? '' : String(row[c]);
            return `"${val.replace(/"/g, '""')}"`;
          }).join(',')
        ),
      ];
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    if (format === 'html') {
      const rows = Array.isArray(reportData.tableData) ? reportData.tableData : [];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      const tableHtml = rows.length > 0 ? `
        <table>
          <thead>
            <tr>${columns.map((c) => `<th>${escapeHtml(formatLabel(c))}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(row[c])}</td>`).join('')}</tr>`).join('\n            ')}
          </tbody>
        </table>` : '<p>No table data available.</p>';

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(fileName)}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; margin: 2rem; color: #111827; }
      h1 { font-size: 1.6rem; margin-bottom: 0.25rem; }
      .meta { font-size: 0.85rem; color: #6b7280; margin-bottom: 1.5rem; }
      .summary { display: flex; gap: 1.5rem; margin-bottom: 2rem; flex-wrap: wrap; }
      .summary-card { border: 1px solid #d1d5db; border-radius: 10px; padding: 1rem 1.5rem; text-align: center; min-width: 150px; }
      .summary-card .label { font-size: 0.75rem; text-transform: uppercase; color: #6b7280; margin: 0 0 0.25rem; }
      .summary-card .value { font-size: 1.6rem; font-weight: 700; margin: 0; }
      table { width: 100%; border-collapse: collapse; font-size: 0.88rem; margin-top: 1rem; }
      th, td { border: 1px solid #d1d5db; padding: 0.5rem 0.65rem; text-align: left; }
      th { background: #f3f4f6; font-weight: 600; }
      h2 { font-size: 1.15rem; margin-top: 2rem; margin-bottom: 0.5rem; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(selectedInitiative?.name || 'Report')}</h1>
    <p class="meta">Generated: ${escapeHtml(reportData.generatedDate || 'N/A')} &middot; Report ID: ${escapeHtml(reportData.reportId || '')}</p>

    <div class="summary">
      <div class="summary-card">
        <p class="label">Total Participants</p>
        <p class="value">${escapeHtml(reportData.summary?.totalParticipants)}</p>
      </div>
      <div class="summary-card">
        <p class="label">Average Rating</p>
        <p class="value">${escapeHtml(reportData.summary?.averageRating)}/5</p>
      </div>
      <div class="summary-card">
        <p class="label">Completion Rate</p>
        <p class="value">${escapeHtml(reportData.summary?.completionRate)}%</p>
      </div>
    </div>

    <h2>Data Table</h2>
    ${tableHtml}
  </body>
</html>`;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.html`;
      link.click();
    }

    if (format === 'pdf') {
      const printWindow = window.open('', '_blank', 'width=1200,height=900');
      if (!printWindow) return;
      printWindow.document.open();
      printWindow.document.write(buildPdfHtml(fileName));
      printWindow.document.close();
    }

    if (format === 'xlsx') {
      const worksheet = Object.entries(reportData)
        .map(([key, value]) => `${key}\t${value}`)
        .join('\n');

      const blob = new Blob([worksheet], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.xlsx`;
      link.click();
    }
  }

  return (
    <PageLayout title="Reports">
      <section style={{ marginBottom: '1.5rem' }}>
        <InitiativeSelector
          initiatives={initiatives}
          selectedInitiative={selectedInitiative}
          onSelect={handleInitiativeSelect}
        />
      </section>

      {reportData && (
        <>
          {(userRole === 'staff' || userRole === 'admin') && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 600 }}>Download Report</div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>PDF Content</span>
                    <select
                      value={pdfDisplayMode}
                      onChange={(e) => setPdfDisplayMode(e.target.value)}
                      style={{
                        padding: '0.5rem 0.65rem',
                        fontSize: '0.9rem',
                        borderRadius: '6px',
                        border: '1px solid #E5E7EB',
                        backgroundColor: '#fff',
                        outline: 'none',
                      }}
                    >
                      {PDF_DISPLAY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>PDF Layout</span>
                    <select
                      value={pdfLayoutMode}
                      onChange={(e) => setPdfLayoutMode(e.target.value)}
                      disabled={pdfDisplayMode !== 'both'}
                      style={{
                        padding: '0.5rem 0.65rem',
                        fontSize: '0.9rem',
                        borderRadius: '6px',
                        border: '1px solid #E5E7EB',
                        backgroundColor: '#fff',
                        opacity: pdfDisplayMode === 'both' ? 1 : 0.6,
                        outline: 'none',
                      }}
                    >
                      {PDF_LAYOUT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    className="btn-primary"
                    onClick={() => handleDownload('pdf')}
                  >
                    PDF
                  </button>

                  {DOWNLOAD_FORMATS.map((format) => (
                    <button
                      key={format}
                      className="btn-outline"
                      onClick={() => handleDownload(format)}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}

                  <button
                    className="btn-outline"
                    onClick={handleCreateShareableLink}
                  >
                    Share Link
                  </button>

                  {userRole === 'admin' && (
                    <div style={{ position: 'relative' }}>
                      <button
                        className="btn-outline"
                        onClick={() => setShowSocialMenu(!showSocialMenu)}
                      >
                        Share ▾
                      </button>

                      {showSocialMenu && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '110%',
                            right: 0,
                            backgroundColor: '#fff',
                            border: '1px solid #E5E7EB',
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

                          {SOCIAL_PLATFORMS.map((platform) => (
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
                            className="btn-primary"
                            onClick={handlePostToSocialMedia}
                            disabled={isUploading || selectedPlatforms.length === 0}
                            style={{
                              marginTop: '0.5rem',
                              width: '100%',
                              cursor: isUploading ? 'not-allowed' : 'pointer',
                              opacity: (isUploading || selectedPlatforms.length === 0) ? 0.6 : 1,
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
            </div>
          )}

          <ReportDashboard
            reportData={reportData}
            trendData={trendData}
            selectedInitiative={selectedInitiative}
            userRole={userRole}
            reportDbId={reportDbId}
            preloadedInsights={aiInsights}
          />
        </>
      )}

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
        <Link href="/report-creation">
          <button className="btn-primary">
            Report Creation
          </button>
        </Link>
        <Link href="/manage-reports">
          <button className="btn-primary">
            Manage Reports
          </button>
        </Link>
      </div>
    </PageLayout>
  );
}
