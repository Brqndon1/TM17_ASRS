const state = vi.hoisted(() => ({ db: null }));
const dbProxy = vi.hoisted(() => ({
  prepare: (...args) => state.db.prepare(...args),
  exec: (...args) => state.db.exec(...args),
}));
const queryTableDataMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: dbProxy,
  default: dbProxy,
  initializeDatabase: vi.fn(),
}));

vi.mock('@/lib/query-helpers', () => ({
  queryTableData: (...args) => queryTableDataMock(...args),
}));

import { GET } from '@/app/api/initiatives/[id]/report-data/route';
import { closeTestDb, createTestDb, insertInitiative } from '@/test/integration/api-test-harness';

describe('/api/initiatives/:id/report-data GET integration', () => {
  beforeEach(() => {
    state.db = createTestDb();
    queryTableDataMock.mockReset();
    queryTableDataMock.mockReturnValue([{ grade: '7th', score: 88 }]);
  });

  afterEach(() => {
    closeTestDb(state.db);
    state.db = null;
  });

  test('returns 404 when initiative does not exist', async () => {
    const res = await GET(new Request('http://localhost:3000/api/initiatives/99/report-data'), {
      params: Promise.resolve({ id: '99' }),
    });

    expect(res.status).toBe(404);
  });

  test('returns report payload for existing initiative', async () => {
    const initiativeId = insertInitiative(state.db, {
      initiative_name: 'Student Success',
    });

    state.db.prepare(
      'UPDATE initiative SET summary_json = ?, chart_data_json = ? WHERE initiative_id = ?'
    ).run(
      JSON.stringify({ completionRate: 92 }),
      JSON.stringify({ points: [1, 2, 3] }),
      initiativeId
    );

    const res = await GET(new Request(`http://localhost:3000/api/initiatives/${initiativeId}/report-data`), {
      params: Promise.resolve({ id: String(initiativeId) }),
    });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.initiativeName).toBe('Student Success');
    expect(payload.summary.completionRate).toBe(92);
    expect(payload.tableData).toEqual([{ grade: '7th', score: 88 }]);
  });

  test('returns 500 when initiative JSON payload is invalid', async () => {
    const initiativeId = insertInitiative(state.db, {
      initiative_name: 'Broken Initiative',
    });

    state.db.prepare(
      'UPDATE initiative SET summary_json = ? WHERE initiative_id = ?'
    ).run('not-json', initiativeId);

    const res = await GET(new Request(`http://localhost:3000/api/initiatives/${initiativeId}/report-data`), {
      params: Promise.resolve({ id: String(initiativeId) }),
    });

    expect(res.status).toBe(500);
  });
});
