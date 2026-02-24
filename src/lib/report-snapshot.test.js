import { normalizeSnapshot } from '@/lib/report-snapshot';

describe('report-snapshot', () => {
  test('migrates v1 snapshot to v2 defaults', () => {
    const v1 = {
      version: 1,
      config: { initiativeId: 1 },
      results: {
        filteredTableData: [{ id: 1, grade: '7th' }],
        trendData: [{ trendId: 'TRD-1' }],
      },
    };

    const normalized = normalizeSnapshot(v1);
    expect(normalized.version).toBe(2);
    expect(normalized.config.trendConfig.method).toBe('delta_halves');
    expect(normalized.results.explainability.outputRowCount).toBe(1);
    expect(normalized.results.trendData[0].confidenceScore).toBe(50);
  });

  test('returns null for invalid snapshots', () => {
    expect(normalizeSnapshot(null)).toBeNull();
    expect(normalizeSnapshot('bad')).toBeNull();
  });
});
