/**
 * ============================================================================
 * CHART DISPLAY — Renders pie charts, bar charts, and line charts.
 * ============================================================================
 * Per REP016/REP034:
 * - PDF and Website outputs include graphical displays (pie, bar, line charts).
 * - This component renders all three chart types using the "recharts" library.
 *
 * Props:
 * - chartData: Object containing:
 *   - gradeDistribution: Array (for pie chart)
 *   - monthlyParticipation: Array (for bar + line chart)
 *   - interestLevels: Array (for bar chart)
 * ============================================================================
 */
'use client';

import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line,
  ResponsiveContainer
} from 'recharts';

// Brand colors used for chart segments/bars
const COLORS = ['#C0392B', '#E67E22', '#F39C12', '#27AE60', '#2980B9'];

export default function ChartDisplay({ chartData }) {
  if (!chartData) return null;

  return (
    /* Responsive chart grid — 2 columns on desktop, 1 on mobile via .chart-grid */
    <div className="chart-grid">
      {/* ---- PIE CHART: Grade Distribution ---- */}
      <div className="asrs-card">
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
          Grade Distribution
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData.gradeDistribution}
              cx="50%"
              cy="50%"
              outerRadius={90}
              dataKey="value"
            >
              {chartData.gradeDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [value, name]} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem 1rem', marginTop: '0.5rem' }}>
          {(() => {
            const total = chartData.gradeDistribution.reduce((sum, d) => sum + d.value, 0);
            return chartData.gradeDistribution.map((entry, index) => (
              <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length], flexShrink: 0 }} />
                {entry.name} ({total > 0 ? Math.round((entry.value / total) * 100) : 0}%)
              </div>
            ));
          })()}
        </div>
      </div>

      {/* ---- BAR CHART: Monthly Participation ---- */}
      <div className="asrs-card">
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
          Monthly Participation
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData.monthlyParticipation}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bg-tertiary)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
            <Bar dataKey="participants" fill="#E67E22" name="Enrolled" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" fill="#27AE60" name="Completed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ---- LINE CHART: Monthly Participation Trend ---- */}
      <div className="asrs-card">
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
          Participation Trend
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData.monthlyParticipation}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bg-tertiary)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
            <Line
              type="monotone" dataKey="participants" stroke="#C0392B"
              strokeWidth={2} dot={{ r: 4 }} name="Enrolled"
            />
            <Line
              type="monotone" dataKey="completed" stroke="#2980B9"
              strokeWidth={2} dot={{ r: 4 }} name="Completed"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ---- BAR CHART: Interest Levels ---- */}
      <div className="asrs-card">
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
          Interest Levels
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData.interestLevels} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-bg-tertiary)" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
            <Tooltip />
            <Bar dataKey="value" name="Students" radius={[0, 4, 4, 0]}>
              {chartData.interestLevels.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
