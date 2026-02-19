import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const filePath = path.join(process.cwd(), 'src', 'data', 'trendData.json');
    const trendDataFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const allTrends = trendDataFile.trends[String(id)] || [];
    const trends = allTrends.filter(t => t.enabledDisplay);

    return NextResponse.json({ trends });
  } catch (error) {
    console.error('Error fetching trend data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trend data', details: error.message },
      { status: 500 }
    );
  }
}
