'use client';

import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#C0392B', '#E67E22', '#F39C12', '#27AE60', '#2980B9', '#8E44AD', '#1ABC9C', '#34495E'];

export default function ChartDisplay({ chartData }) {
  if (!chartData || typeof chartData !== 'object') return null;

  const entries = Object.entries(chartData).filter(
    ([, data]) => Array.isArray(data) && data.length > 0
  );

  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>
        No chart data available.
      </div>
    );
  }

  return (
    <div className="chart-grid">
      {entries.map(([label, data]) => {
        // Decide chart type: use pie for <= 8 items, bar for more
        const usePie = data.length <= 8;

        return (
          <div key={label} className="asrs-card">
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
              {label}
            </h3>

            {usePie ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      nameKey="name"
                    >
                      {data.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem 1rem', marginTop: '0.5rem' }}>
                  {(() => {
                    const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
                    return data.map((entry, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length], flexShrink: 0 }} />
                        {entry.name} ({total > 0 ? Math.round((entry.value / total) * 100) : 0}%)
                      </div>
                    ));
                  })()}
                </div>
              </>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, data.length * 35)}>
                <BarChart data={data} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                    {data.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        );
      })}
    </div>
  );
}
