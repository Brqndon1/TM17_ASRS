'use client';

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
        const normalizedData = data
          .map((entry, index) => ({
            name: String(entry?.name ?? `Item ${index + 1}`),
            value: Number(entry?.value),
          }))
          .filter((entry) => Number.isFinite(entry.value));

        if (normalizedData.length === 0) return null;

        // Use bar chart when values are numeric/ordered or there are many items
        const allNumeric = normalizedData.every((d) => !isNaN(Number(d.name)));
        const looksNumeric = /\b(score|rating|count|size|number|hours|days|amount)\b/i.test(label);
        const usePie = !allNumeric && !looksNumeric && normalizedData.length <= 6;
        const total = normalizedData.reduce((sum, d) => sum + d.value, 0);
        const maxValue = Math.max(...normalizedData.map((d) => d.value), 0);

        return (
          <div key={label} className="asrs-card">
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
              {label}
            </h3>

            {usePie ? (
              <>
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                  {normalizedData.map((entry, index) => {
                    const percent = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                    return (
                      <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) minmax(0, 3fr) auto', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ fontSize: '0.82rem', color: '#374151' }}>{entry.name}</div>
                        <div style={{ height: '10px', borderRadius: '999px', backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', backgroundColor: COLORS[index % COLORS.length] }} />
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#6B7280', minWidth: '44px', textAlign: 'right' }}>{percent}%</div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : allNumeric ? (
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                {normalizedData.map((entry, index) => {
                  const width = maxValue > 0 ? Math.max((entry.value / maxValue) * 100, 2) : 0;
                  return (
                    <div key={index} style={{ display: 'grid', gap: '0.25rem' }}>
                      <div style={{ fontSize: '0.82rem', color: '#374151', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{entry.name}</span>
                        <span>{entry.value}</span>
                      </div>
                      <div style={{ height: '10px', borderRadius: '999px', backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
                        <div style={{ width: `${width}%`, height: '100%', backgroundColor: COLORS[index % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                {normalizedData.map((entry, index) => {
                  const width = maxValue > 0 ? Math.max((entry.value / maxValue) * 100, 2) : 0;
                  return (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) minmax(0, 3fr) auto', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ fontSize: '0.82rem', color: '#374151' }}>{entry.name}</div>
                      <div style={{ height: '10px', borderRadius: '999px', backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
                        <div style={{ width: `${width}%`, height: '100%', backgroundColor: COLORS[index % COLORS.length] }} />
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#6B7280', minWidth: '44px', textAlign: 'right' }}>{entry.value}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}