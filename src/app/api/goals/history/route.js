import { NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';
import { requireAccess } from '@/lib/auth/server-auth';

export async function GET(request) {
  try {
    initializeDatabase();
    const auth = requireAccess(request, db, { minAccessRank: 50 });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const initiativeId = searchParams.get('initiativeId');

    if (!initiativeId) {
      return NextResponse.json(
        { error: 'Missing required parameter: initiativeId' },
        { status: 400 }
      );
    }

    const initiative = db.prepare(
      'SELECT initiative_id, initiative_name FROM initiative WHERE initiative_id = ?'
    ).get(initiativeId);

    if (!initiative) {
      return NextResponse.json(
        { error: 'Initiative not found' },
        { status: 404 }
      );
    }

    const history = db.prepare(`
      SELECT 
        gph.history_id,
        gph.goal_id,
        g.goal_name,
        g.target_value AS current_target,
        g.weight,
        gph.recorded_value,
        gph.target_value,
        gph.score,
        gph.recorded_at
      FROM goal_progress_history gph
      JOIN initiative_goal g ON gph.goal_id = g.goal_id
      WHERE gph.initiative_id = ?
      ORDER BY gph.recorded_at ASC
    `).all(initiativeId);

    const dateMap = {};

    for (const record of history) {
      const date = record.recorded_at.split('T')[0];

      if (!dateMap[date]) {
        dateMap[date] = {
          date,
          recorded_at: record.recorded_at,
          goals: {},
        };
      }

      dateMap[date].goals[record.goal_id] = {
        goal_id: record.goal_id,
        goal_name: record.goal_name,
        recorded_value: record.recorded_value,
        target_value: record.target_value,
        score: record.score,
        weight: record.weight,
      };
    }

    const timeline = Object.values(dateMap).map((entry) => {
      const goals = Object.values(entry.goals);

      let weightedSum = 0;
      let totalWeight = 0;
      for (const goal of goals) {
        weightedSum += goal.score * goal.weight;
        totalWeight += goal.weight;
      }

      const overallScore = totalWeight > 0
        ? parseFloat((weightedSum / totalWeight).toFixed(2))
        : 0;

      return {
        date: entry.date,
        overallScore,
        targetScore: 100,
        goalBreakdown: goals,
      };
    });

    return NextResponse.json({
      initiative: initiative,
      timeline,
      totalSnapshots: history.length,
    });
  } catch (error) {
    console.error('Error fetching goal history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goal history', details: error.message },
      { status: 500 }
    );
  }
}
