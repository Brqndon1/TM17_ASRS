import {
  computeTrendData,
  processReportData,
  validateTrendConfig,
} from '@/lib/report-engine';

describe('report-engine', () => {
  const rows = [
    { id: 1, grade: '7th', score: 10, attendanceRate: '80%' },
    { id: 2, grade: '7th', score: 20, attendanceRate: '82%' },
    { id: 3, grade: '8th', score: 30, attendanceRate: '85%' },
    { id: 4, grade: '8th', score: 40, attendanceRate: '90%' },
  ];

  test('processReportData returns explainability counts', () => {
    const result = processReportData(
      rows,
      { Grade: '7th' },
      [],
      [],
      ['Grade', 'Score', 'Attendance Rate']
    );
    expect(result.explainability.inputRowCount).toBe(4);
    expect(result.explainability.afterFilterCount).toBe(2);
    expect(result.explainability.outputRowCount).toBe(2);
  });

  test('validateTrendConfig enforces max variables', () => {
    const valid = validateTrendConfig(
      { variables: ['A', 'B'], method: 'linear_slope', thresholdPct: 3 },
      ['A', 'B', 'C']
    );
    expect(valid.valid).toBe(true);

    const invalid = validateTrendConfig(
      { variables: ['A', 'B', 'C', 'D', 'E', 'F'] },
      ['A', 'B', 'C', 'D', 'E', 'F']
    );
    expect(invalid.valid).toBe(false);
  });

  test('computeTrendData produces deterministic trend id and confidence', () => {
    const configResult = validateTrendConfig({
      variables: ['Score', 'Attendance Rate'],
      enabledCalc: true,
      enabledDisplay: true,
      method: 'delta_halves',
      thresholdPct: 2,
    }, ['Grade', 'Score', 'Attendance Rate']);
    expect(configResult.valid).toBe(true);

    const first = computeTrendData(rows, configResult.normalized, { initiativeId: 1, reportName: 'R1' });
    const second = computeTrendData(rows, configResult.normalized, { initiativeId: 1, reportName: 'R1' });
    expect(first[0].trendId).toBe(second[0].trendId);
    expect(first[0].confidenceScore).toBeGreaterThanOrEqual(0);
    expect(first[0].confidenceScore).toBeLessThanOrEqual(100);
  });
});
