'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import ReportDashboard from '@/components/ReportDashboard';
import { getInitiatives, getReportData, getTrendData } from '@/lib/data-service';
import { normalizeSnapshot } from '@/lib/report-snapshot';

export default function ReportViewPage() {
  const { id } = useParams();
  const [userRole, setUserRole] = useState('staff');

  const [report, setReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [selectedInitiative, setSelectedInitiative] = useState(null);
  const [snapshotConfig, setSnapshotConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadReport() {
      try {
        // 1. Fetch report metadata from DB
        const res = await fetch(`/api/reports/${id}`);
        if (!res.ok) {
          setError('Report not found.');
          return;
        }
        const { report: row } = await res.json();
        setReport(row);

        // 2. Parse report_data to check for snapshot format
        let parsed = null;
        try {
          parsed = typeof row.report_data === 'string'
            ? JSON.parse(row.report_data)
            : row.report_data;
        } catch {
          parsed = null;
        }

        // 3. Find the matching initiative
        const initiatives = await getInitiatives();
        const initiative = initiatives.find(i => i.id === row.initiative_id) || null;
        setSelectedInitiative(initiative);

        const normalized = normalizeSnapshot(parsed);
        if (normalized) {
          // ── New snapshot format ──
          // Shape the snapshot results into the format ReportDashboard expects
          const results = normalized.results;
          const shaped = {
            reportId: results.reportId,
            initiativeId: normalized.config.initiativeId,
            initiativeName: results.initiativeName,
            generatedDate: results.generatedDate,
            summary: results.summary,
            chartData: results.chartData,
            tableData: results.filteredTableData,
            explainability: results.explainability,
          };
          setReportData(shaped);
          setTrendData(results.trendData || []);
          setSnapshotConfig(normalized.config);
        } else {
          // ── Legacy format — load from static JSON ──
          const data = await getReportData(row.initiative_id);
          setReportData(data);
          const trends = await getTrendData(row.initiative_id);
          setTrendData(trends);
        }
      } catch {
        setError('Failed to load report.');
      } finally {
        setIsLoading(false);
      }
    }
    loadReport();
  }, [id]);

  // Helper to render snapshot config summary
  function renderConfigSummary() {
    if (!snapshotConfig) return null;

    const filterEntries = Object.entries(snapshotConfig.filters || {}).filter(([, v]) => v && v !== 'All');
    const expressions = snapshotConfig.expressions || [];
    const sorts = snapshotConfig.sorts || [];
    const trendConfig = snapshotConfig.trendConfig || null;
    const hasTrendVariables = (trendConfig?.variables || []).length > 0;

    if (filterEntries.length === 0 && expressions.length === 0 && sorts.length === 0 && !hasTrendVariables) {
      return null;
    }

    return (
      <div className="asrs-card" style={{
        borderLeft: '4px solid var(--color-asrs-orange)',
        marginBottom: '1rem',
      }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: '600', margin: '0 0 0.5rem 0', color: 'var(--color-asrs-dark)' }}>
          Report Configuration
        </h3>
        <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {filterEntries.length > 0 && (
            <div>
              <span style={{ fontWeight: '600', color: 'var(--color-text-secondary)' }}>Filters: </span>
              {filterEntries.map(([k, v]) => `${k} = "${v}"`).join(', ')}
            </div>
          )}
          {expressions.length > 0 && (
            <div>
              <span style={{ fontWeight: '600', color: 'var(--color-text-secondary)' }}>Expressions: </span>
              {expressions.map((e, i) =>
                `${i > 0 ? (e.connector || 'AND') + ' ' : ''}${e.attribute} ${e.operator} "${e.value}"`
              ).join(' ')}
            </div>
          )}
          {sorts.length > 0 && (
            <div>
              <span style={{ fontWeight: '600', color: 'var(--color-text-secondary)' }}>Sort: </span>
              {sorts.map((s, i) => `${i + 1}. ${s.attribute} (${s.direction === 'desc' ? 'Z\u2192A' : 'A\u2192Z'})`).join(', ')}
            </div>
          )}
          {hasTrendVariables && (
            <div>
              <span style={{ fontWeight: '600', color: 'var(--color-text-secondary)' }}>Trends: </span>
              Variables ({trendConfig.variables.join(', ')}), method {trendConfig.method || 'delta_halves'}, threshold {trendConfig.thresholdPct ?? 2}%,
              display {trendConfig.enabledDisplay === false ? 'off' : 'on'}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      <Header userRole={userRole} onRoleChange={setUserRole} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 1.5rem 0' }}>
        <BackButton />
      </div>

      {/* Report name + description header */}
      {report && (
        <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem 1rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
            {report.name || 'Untitled Report'}
          </h1>
          {report.description && (
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
              {report.description}
            </p>
          )}
        </section>
      )}

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
            <span style={{ marginLeft: '1rem', fontSize: '1.1rem' }}>Loading report...</span>
          </div>
        ) : error ? (
          <div className="asrs-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--color-error)', fontSize: '1.1rem' }}>{error}</p>
          </div>
        ) : reportData ? (
          <>
            {renderConfigSummary()}
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
              No report data available for this initiative.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
