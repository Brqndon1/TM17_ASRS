import { NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';
import { requireAccess } from '@/lib/auth/server-auth';

export async function GET(request) {
  try {
    initializeDatabase();
    const auth = requireAccess(request, db, { minAccessRank: 50 });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const fiscalYear   = searchParams.get('fiscalYear');
    const department   = searchParams.get('department');
    const initiativeId = searchParams.get('initiativeId');

    // ── Drill-down: per-year breakdown + history for one initiative ───────────
    if (initiativeId) {
      const budgets = db.prepare(`
        SELECT
          budget_id, fiscal_year, department,
          personnel,       equipment,       operations,       travel,
          personnel_spent, equipment_spent, operations_spent, travel_spent,
          (personnel + equipment + operations + travel)                               AS total,
          (personnel_spent + equipment_spent + operations_spent + travel_spent)       AS total_spent,
          updated_at
        FROM initiative_budget
        WHERE initiative_id = ?
        ORDER BY fiscal_year DESC
      `).all(Number(initiativeId));

      const history = db.prepare(`
        SELECT
          ibh.history_id, ibh.fiscal_year, ibh.department,
          ibh.personnel, ibh.equipment, ibh.operations, ibh.travel,
          (ibh.personnel + ibh.equipment + ibh.operations + ibh.travel) AS total,
          ibh.created_at,
          u.first_name || ' ' || u.last_name AS changed_by_name
        FROM initiative_budget_history ibh
        LEFT JOIN user u ON u.user_id = ibh.changed_by_user_id
        WHERE ibh.initiative_id = ?
        ORDER BY ibh.created_at DESC
        LIMIT 20
      `).all(Number(initiativeId));

      return NextResponse.json({ budgets, history });
    }

    // ── Filter options (always full dataset) ──────────────────────────────────
    const fiscalYears = db.prepare(
      'SELECT DISTINCT fiscal_year FROM initiative_budget ORDER BY fiscal_year DESC'
    ).all().map(r => r.fiscal_year);

    const departments = db.prepare(
      'SELECT DISTINCT department FROM initiative_budget WHERE department IS NOT NULL ORDER BY department ASC'
    ).all().map(r => r.department);

    // ── Main listing ──────────────────────────────────────────────────────────
    const conditions = [];
    const params     = [];
    if (fiscalYear) { conditions.push('ib.fiscal_year = ?'); params.push(Number(fiscalYear)); }
    if (department) { conditions.push('ib.department = ?');  params.push(department); }
    const budgetWhere = conditions.length ? 'AND ' + conditions.join(' AND ') : '';

    const rows = db.prepare(`
      SELECT
        i.initiative_id,
        i.initiative_name,
        i.description,
        ib.budget_id,
        ib.fiscal_year,
        ib.department,
        ib.personnel,        ib.equipment,        ib.operations,        ib.travel,
        ib.personnel_spent,  ib.equipment_spent,  ib.operations_spent,  ib.travel_spent,
        (ib.personnel + ib.equipment + ib.operations + ib.travel)                         AS total,
        (ib.personnel_spent + ib.equipment_spent + ib.operations_spent + ib.travel_spent) AS total_spent,
        ib.updated_at
      FROM initiative i
      LEFT JOIN initiative_budget ib ON ib.initiative_id = i.initiative_id ${budgetWhere}
      ORDER BY i.initiative_name ASC, ib.fiscal_year DESC
    `).all(...params);

    // Group by initiative, summing across fiscal years
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.initiative_id)) {
        map.set(row.initiative_id, {
          initiative_id:   row.initiative_id,
          initiative_name: row.initiative_name,
          description:     row.description,
          budgets:         [],
          personnel: 0, equipment: 0, operations: 0, travel: 0, total: 0,
          personnel_spent: 0, equipment_spent: 0, operations_spent: 0, travel_spent: 0, total_spent: 0,
        });
      }
      if (row.budget_id != null) {
        const e = map.get(row.initiative_id);
        e.budgets.push({
          budget_id:        row.budget_id,
          fiscal_year:      row.fiscal_year,
          department:       row.department,
          personnel:        row.personnel        || 0,
          equipment:        row.equipment        || 0,
          operations:       row.operations       || 0,
          travel:           row.travel           || 0,
          total:            row.total            || 0,
          personnel_spent:  row.personnel_spent  || 0,
          equipment_spent:  row.equipment_spent  || 0,
          operations_spent: row.operations_spent || 0,
          travel_spent:     row.travel_spent     || 0,
          total_spent:      row.total_spent      || 0,
          updated_at:       row.updated_at,
        });
        e.personnel        += row.personnel        || 0;
        e.equipment        += row.equipment        || 0;
        e.operations       += row.operations       || 0;
        e.travel           += row.travel           || 0;
        e.total            += row.total            || 0;
        e.personnel_spent  += row.personnel_spent  || 0;
        e.equipment_spent  += row.equipment_spent  || 0;
        e.operations_spent += row.operations_spent || 0;
        e.travel_spent     += row.travel_spent     || 0;
        e.total_spent      += row.total_spent      || 0;
      }
    }

    return NextResponse.json({
      fiscalYears,
      departments,
      initiatives: Array.from(map.values()),
    });
  } catch (error) {
    console.error('Error fetching budget performance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget data', details: error.message },
      { status: 500 }
    );
  }
}