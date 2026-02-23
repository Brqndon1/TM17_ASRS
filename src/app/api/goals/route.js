import { NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';

// Compute individual score for a goal based on its scoring method
function computeGoalScore(goal) {
  const { current_value, target_value, scoring_method } = goal;

  switch (scoring_method) {
    case 'linear':
      if (target_value === 0) return 0;
      return Math.min((current_value / target_value) * 100, 100);

    case 'threshold':
      return current_value >= target_value ? 100 : 0;

    case 'binary':
      return current_value > 0 ? 100 : 0;

    default:
      return 0;
  }
}

// Compute overall weighted score across all goals
function computeOverallScore(goals) {
  if (goals.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const goal of goals) {
    const score = computeGoalScore(goal);
    weightedSum += score * goal.weight;
    totalWeight += goal.weight;
  }

  if (totalWeight === 0) return 0;
  return parseFloat((weightedSum / totalWeight).toFixed(2));
}

// Calculate days until deadline
function getDaysUntilDeadline(deadline) {
  if (!deadline) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  
  const diffTime = deadlineDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

// GET - Fetch goals for an initiative with computed scores
export async function GET(request) {
  try {
    initializeDatabase();

    const { searchParams } = new URL(request.url);
    const initiativeId = searchParams.get('initiativeId');

    if (!initiativeId) {
      return NextResponse.json(
        { error: 'Missing required parameter: initiativeId' },
        { status: 400 }
      );
    }

    const goals = db.prepare(`
      SELECT g.*, i.initiative_name
      FROM initiative_goal g
      JOIN initiative i ON g.initiative_id = i.initiative_id
      WHERE g.initiative_id = ?
      ORDER BY g.created_at ASC
    `).all(initiativeId);

    const goalsWithScores = goals.map((goal) => ({
      ...goal,
      score: parseFloat(computeGoalScore(goal).toFixed(2)),
      daysUntilDeadline: getDaysUntilDeadline(goal.deadline),
    }));

    const overallScore = computeOverallScore(goals);

    return NextResponse.json({
      goals: goalsWithScores,
      overallScore,
      initiativeId: parseInt(initiativeId),
    });
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new goal
export async function POST(request) {
  try {
    initializeDatabase();

    const body = await request.json();
    const {
      initiative_id,
      goal_name,
      description,
      target_metric,
      target_value,
      current_value,
      weight,
      scoring_method,
      deadline,
    } = body;

    // Validate required fields
    if (!initiative_id || !goal_name || !target_metric || target_value == null || !weight || !scoring_method) {
      return NextResponse.json(
        { error: 'Missing required fields: initiative_id, goal_name, target_metric, target_value, weight, scoring_method' },
        { status: 400 }
      );
    }

    // Validate scoring_method value
    if (!['linear', 'threshold', 'binary'].includes(scoring_method)) {
      return NextResponse.json(
        { error: 'Invalid scoring_method. Must be: linear, threshold, or binary' },
        { status: 400 }
      );
    }

    // Validate weight is positive
    if (weight <= 0) {
      return NextResponse.json(
        { error: 'Weight must be a positive number' },
        { status: 400 }
      );
    }

    // Verify initiative exists
    const initiative = db.prepare(
      'SELECT initiative_id FROM initiative WHERE initiative_id = ?'
    ).get(initiative_id);

    if (!initiative) {
      return NextResponse.json(
        { error: 'Initiative not found' },
        { status: 404 }
      );
    }

    const result = db.prepare(`
      INSERT INTO initiative_goal (initiative_id, goal_name, description, target_metric, target_value, current_value, weight, scoring_method, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      initiative_id,
      goal_name.trim(),
      (description || '').trim(),
      target_metric.trim(),
      target_value,
      current_value || 0,
      weight,
      scoring_method,
      deadline || null
    );

    const newGoal = db.prepare('SELECT * FROM initiative_goal WHERE goal_id = ?').get(result.lastInsertRowid);

    return NextResponse.json({
      success: true,
      goal: {
        ...newGoal,
        score: parseFloat(computeGoalScore(newGoal).toFixed(2)),
        daysUntilDeadline: getDaysUntilDeadline(newGoal.deadline),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { error: 'Failed to create goal', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update an existing goal
export async function PUT(request) {
  try {
    initializeDatabase();

    const body = await request.json();
    const { goal_id, ...updates } = body;

    if (!goal_id) {
      return NextResponse.json(
        { error: 'Missing required field: goal_id' },
        { status: 400 }
      );
    }

    // Verify goal exists
    const existing = db.prepare('SELECT * FROM initiative_goal WHERE goal_id = ?').get(goal_id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    // Validate scoring_method if provided
    if (updates.scoring_method && !['linear', 'threshold', 'binary'].includes(updates.scoring_method)) {
      return NextResponse.json(
        { error: 'Invalid scoring_method. Must be: linear, threshold, or binary' },
        { status: 400 }
      );
    }

    // Build dynamic update
    const allowedFields = ['goal_name', 'description', 'target_metric', 'target_value', 'current_value', 'weight', 'scoring_method', 'deadline'];
    const setClauses = [];
    const values = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Always update the updated_at timestamp
    setClauses.push("updated_at = datetime('now')");
    values.push(goal_id);

    db.prepare(`
      UPDATE initiative_goal
      SET ${setClauses.join(', ')}
      WHERE goal_id = ?
    `).run(...values);

    const updatedGoal = db.prepare('SELECT * FROM initiative_goal WHERE goal_id = ?').get(goal_id);

    return NextResponse.json({
      success: true,
      goal: {
        ...updatedGoal,
        score: parseFloat(computeGoalScore(updatedGoal).toFixed(2)),
        daysUntilDeadline: getDaysUntilDeadline(updatedGoal.deadline),
      },
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { error: 'Failed to update goal', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove a goal
export async function DELETE(request) {
  try {
    initializeDatabase();

    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goalId');

    if (!goalId) {
      return NextResponse.json(
        { error: 'Missing required parameter: goalId' },
        { status: 400 }
      );
    }

    const existing = db.prepare('SELECT * FROM initiative_goal WHERE goal_id = ?').get(goalId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    db.prepare('DELETE FROM initiative_goal WHERE goal_id = ?').run(goalId);

    return NextResponse.json({
      success: true,
      message: `Goal ${goalId} deleted`,
    });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal', details: error.message },
      { status: 500 }
    );
  }
}
