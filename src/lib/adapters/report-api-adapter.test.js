import { toReportMapByInitiative, toReportingViewModel } from '@/lib/adapters/report-api-adapter';

describe('report-api-adapter', () => {
  test('builds first-report map by initiative id', () => {
    const map = toReportMapByInitiative([
      { id: 10, initiative_id: 1 },
      { id: 11, initiative_id: 1 },
      { id: 12, initiative_id: 2 },
    ]);

    expect(map[1].id).toBe(10);
    expect(map[2].id).toBe(12);
  });

  test('normalizes report snapshot into dashboard view model', () => {
    const snapshot = {
      version: 2,
      config: { initiativeId: 7 },
      results: {
        reportId: 'RPT-db-7',
        initiativeName: 'Example Initiative',
        generatedDate: '2026-03-03',
        summary: { totalParticipants: 1 },
        chartData: { rating: [] },
        filteredTableData: [{ id: 1 }],
        trendData: [{ id: 't1' }],
        explainability: {
          inputRowCount: 1,
          afterFilterCount: 1,
          afterExpressionCount: 1,
          outputRowCount: 1,
          droppedByStep: { filters: 0, expressions: 0, sorting: 0 },
        },
      },
      generatedAt: '2026-03-03T00:00:00.000Z',
    };

    const model = toReportingViewModel({ report_data: JSON.stringify(snapshot) });

    expect(model.reportData.initiativeId).toBe(7);
    expect(model.reportData.reportId).toBe('RPT-db-7');
    expect(model.trendData).toHaveLength(1);
  });
});
