const state = vi.hoisted(() => ({ db: null }));
const dbProxy = vi.hoisted(() => ({
  prepare: (...args) => state.db.prepare(...args),
  exec: (...args) => state.db.exec(...args),
}));

vi.mock('@/lib/db', () => ({
  db: dbProxy,
  default: dbProxy,
  initializeDatabase: vi.fn(),
}));

import { DELETE, GET, POST } from '@/app/api/initiative-categories/route';
import {
  closeTestDb,
  createAuthedRequestHeaders,
  createSessionForRank,
  createTestDb,
  insertCategory,
  insertInitiative,
} from '@/test/integration/api-test-harness';

describe('/api/initiative-categories integration', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    state.db = createTestDb();
  });

  afterEach(() => {
    closeTestDb(state.db);
    state.db = null;
    process.env.NODE_ENV = originalNodeEnv;
  });

  test('GET returns relationships with optional filters', async () => {
    const initiativeId = insertInitiative(state.db, { initiative_name: 'I1' });
    const categoryId = insertCategory(state.db, 'Attendance');
    state.db.prepare('INSERT INTO initiative_category (initiative_id, category_id) VALUES (?, ?)').run(initiativeId, categoryId);

    process.env.NODE_ENV = 'development';
    const tokens = createSessionForRank(state.db, { rank: 50 });

    const allRes = await GET(new Request('http://localhost:3000/api/initiative-categories', {
      headers: createAuthedRequestHeaders(tokens),
    }));
    const filteredRes = await GET(new Request(`http://localhost:3000/api/initiative-categories?initiative_id=${initiativeId}`, {
      headers: createAuthedRequestHeaders(tokens),
    }));

    expect(allRes.status).toBe(200);
    expect((await allRes.json()).total).toBe(1);
    expect((await filteredRes.json()).total).toBe(1);
  });

  test('POST returns 401 without auth', async () => {
    process.env.NODE_ENV = 'development';

    const res = await POST(new Request('http://localhost:3000/api/initiative-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initiative_id: 1, category_id: 1 }),
    }));

    expect(res.status).toBe(401);
  });

  test('POST validates foreign entities and duplicate relationships', async () => {
    process.env.NODE_ENV = 'development';
    const tokens = createSessionForRank(state.db, { rank: 50 });

    const missingRes = await POST(new Request('http://localhost:3000/api/initiative-categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...createAuthedRequestHeaders(tokens, { csrf: true }),
      },
      body: JSON.stringify({ initiative_id: 999, category_id: 999 }),
    }));
    expect(missingRes.status).toBe(404);

    const initiativeId = insertInitiative(state.db, { initiative_name: 'I2' });
    const categoryId = insertCategory(state.db, 'Wellness');

    const okRes = await POST(new Request('http://localhost:3000/api/initiative-categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...createAuthedRequestHeaders(tokens, { csrf: true }),
      },
      body: JSON.stringify({ initiative_id: initiativeId, category_id: categoryId }),
    }));
    expect(okRes.status).toBe(201);

    const duplicateRes = await POST(new Request('http://localhost:3000/api/initiative-categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...createAuthedRequestHeaders(tokens, { csrf: true }),
      },
      body: JSON.stringify({ initiative_id: initiativeId, category_id: categoryId }),
    }));
    expect(duplicateRes.status).toBe(409);
  });

  test('DELETE removes relationship and returns 404 for missing row', async () => {
    process.env.NODE_ENV = 'development';
    const tokens = createSessionForRank(state.db, { rank: 50 });
    const initiativeId = insertInitiative(state.db, { initiative_name: 'I3' });
    const categoryId = insertCategory(state.db, 'Safety');

    const missRes = await DELETE(new Request('http://localhost:3000/api/initiative-categories', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...createAuthedRequestHeaders(tokens, { csrf: true }),
      },
      body: JSON.stringify({ initiative_id: initiativeId, category_id: categoryId }),
    }));
    expect(missRes.status).toBe(404);

    state.db.prepare('INSERT INTO initiative_category (initiative_id, category_id) VALUES (?, ?)').run(initiativeId, categoryId);

    const okRes = await DELETE(new Request('http://localhost:3000/api/initiative-categories', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...createAuthedRequestHeaders(tokens, { csrf: true }),
      },
      body: JSON.stringify({ initiative_id: initiativeId, category_id: categoryId }),
    }));

    expect(okRes.status).toBe(200);
    const count = state.db.prepare('SELECT COUNT(*) AS c FROM initiative_category WHERE initiative_id = ? AND category_id = ?').get(initiativeId, categoryId).c;
    expect(count).toBe(0);
  });
});
