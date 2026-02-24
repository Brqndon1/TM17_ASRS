'use client';

import { useMemo } from 'react';
import DataTable from '@/components/DataTable';
import { computeTrendData, processReportData, validateTrendConfig } from '@/lib/report-engine';

export default function StepPreview({ reportConfig, tableData, onGenerate, isSubmitting }) {
  const selectedAttributes = reportConfig.selectedInitiative?.attributes;
  const rawTrendConfig = reportConfig.trendConfig;

  // Run the full pipeline client-side for preview
  const { filteredData, metrics, trendData } = useMemo(() => {
    const attributes = selectedAttributes || [];
    const trendConfig = rawTrendConfig || { variables: [], enabledCalc: true, enabledDisplay: true };

    if (!tableData || tableData.length === 0) {
      return {
        filteredData: [],
        metrics: { totalRows: 0, totalRowsUnfiltered: 0, filterMatchRate: 0, numericAverages: {}, categoryCounts: {} },
        trendData: [],
      };
    }
    const processed = processReportData(
      tableData,
      reportConfig.filters,
      reportConfig.expressions,
      reportConfig.sorts,
      attributes
    );
    const trendValidation = validateTrendConfig(trendConfig, attributes);
    return {
      ...processed,
      trendData: trendValidation.valid ? computeTrendData(processed.filteredData, trendValidation.normalized) : [],
    };
  }, [tableData, reportConfig.filters, reportConfig.expressions, reportConfig.sorts, selectedAttributes, rawTrendConfig]);

  // Build human-readable config summary
  const activeFilterEntries = Object.entries(reportConfig.filters).filter(([, v]) => v && v !== 'All');
  const hasExpressions = reportConfig.expressions.length > 0;
  const hasSorts = reportConfig.sorts.length > 0;

  // Preview limited to 20 rows
  const previewData = filteredData.slice(0, 20);
  const previewColumns = previewData.length > 0 ? Object.keys(previewData[0]) : [];

  return (
    <div>
      <h2 style={{ fontSize: '1.15rem', fontWeight: '600', marginBottom: '0.5rem' }}>
        Step 6: Preview & Generate
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Review your configuration and preview the results before generating the report.
      </p>

      {/* Config Summary Card */}
      <div className="asrs-card" style={{ marginBottom: '1.25rem', borderLeft: '4px solid var(--color-asrs-orange)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 0.75rem 0' }}>
          Report Configuration
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.88rem' }}>
          <div>
            <span style={{ color: 'var(--color-text-light)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Initiative</span>
            <p style={{ margin: '0.15rem 0 0 0', fontWeight: '500' }}>{reportConfig.selectedInitiative?.name || '—'}</p>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-light)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Report Name</span>
            <p style={{ margin: '0.15rem 0 0 0', fontWeight: '500' }}>{reportConfig.reportName || '—'}</p>
          </div>
          {reportConfig.description && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--color-text-light)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Description</span>
              <p style={{ margin: '0.15rem 0 0 0' }}>{reportConfig.description}</p>
            </div>
          )}
          {activeFilterEntries.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--color-text-light)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Filters</span>
              <p style={{ margin: '0.15rem 0 0 0' }}>
                {activeFilterEntries.map(([k, v]) => `${k} = "${v}"`).join(', ')}
              </p>
            </div>
          )}
          {hasExpressions && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--color-text-light)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Expressions</span>
              <p style={{ margin: '0.15rem 0 0 0' }}>
                {reportConfig.expressions.map((e, i) =>
                  `${i > 0 ? (e.connector || 'AND') + ' ' : ''}${e.attribute} ${e.operator} "${e.value}"`
                ).join(' ')}
              </p>
            </div>
          )}
          {hasSorts && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--color-text-light)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Sort Order</span>
              <p style={{ margin: '0.15rem 0 0 0' }}>
                {reportConfig.sorts.map((s, i) => `${i + 1}. ${s.attribute} (${s.direction === 'desc' ? 'Z→A' : 'A→Z'})`).join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem', marginBottom: '1.25rem',
      }}>
        {/* Record Count */}
        <div className="asrs-card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', margin: 0, textTransform: 'uppercase' }}>
            Matching Records
          </p>
          <p style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-asrs-red)', margin: '0.2rem 0 0 0' }}>
            {metrics.totalRows}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', margin: '0.15rem 0 0 0' }}>
            of {metrics.totalRowsUnfiltered} total ({metrics.filterMatchRate}%)
          </p>
        </div>

        {/* Numeric Averages */}
        {Object.entries(metrics.numericAverages).map(([attr, avg]) => (
          <div key={attr} className="asrs-card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', margin: 0, textTransform: 'uppercase' }}>
              Avg {attr}
            </p>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-asrs-orange)', margin: '0.2rem 0 0 0' }}>
              {avg}
            </p>
          </div>
        ))}
      </div>

      {/* Category Distributions */}
      {Object.keys(metrics.categoryCounts).length > 0 && (
        <div className="asrs-card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '600', margin: '0 0 0.75rem 0' }}>
            Category Distributions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {Object.entries(metrics.categoryCounts).map(([attr, counts]) => (
              <div key={attr}>
                <p style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-secondary)', margin: '0 0 0.35rem 0' }}>
                  {attr}
                </p>
                {Object.entries(counts).map(([val, count]) => (
                  <div key={val} style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.8rem', padding: '0.15rem 0',
                    borderBottom: '1px solid var(--color-bg-secondary)',
                  }}>
                    <span>{val}</span>
                    <span style={{ fontWeight: '600', color: 'var(--color-asrs-dark)' }}>{count}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Table Preview */}
      <div style={{ marginBottom: '1.5rem' }}>
        {filteredData.length > 20 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
            Showing first 20 of {filteredData.length} records
          </p>
        )}
        <DataTable data={previewData} columns={previewColumns} />
      </div>

      {trendData.length > 0 && (
        <div className="asrs-card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '600', margin: '0 0 0.75rem 0' }}>
            Trend Preview
          </h3>
          {trendData.map((trend) => (
            <div key={trend.trendId} style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 0.4rem 0' }}>
                <strong>Variables:</strong> {trend.attributes.join(', ')}
              </p>
              <p style={{ margin: '0 0 0.4rem 0' }}>
                <strong>Direction:</strong> {trend.direction} ({trend.magnitude}%)
              </p>
              <p style={{ margin: 0 }}>
                {trend.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Generate Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={onGenerate}
          disabled={isSubmitting}
          style={{
            padding: '0.85rem 2.5rem',
            backgroundColor: 'var(--color-asrs-orange)',
            color: '#fff',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '1rem',
            border: 'none',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? 'Generating...' : 'Generate Report'}
        </button>
      </div>
    </div>
  );
}
