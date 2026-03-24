'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api/client';

const SENTIMENT_COLORS = {
  positive: { bg: '#dcfce7', text: '#166534' },
  neutral: { bg: '#f3f4f6', text: '#374151' },
  negative: { bg: '#fee2e2', text: '#991b1b' },
};

function SentimentBadge({ sentiment }) {
  const colors = SENTIMENT_COLORS[sentiment] || SENTIMENT_COLORS.neutral;
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: '999px',
      fontSize: '0.8rem',
      fontWeight: 600,
      backgroundColor: colors.bg,
      color: colors.text,
      textTransform: 'capitalize',
    }}>
      {sentiment}
    </span>
  );
}

function BulletList({ items, style }) {
  if (!items || items.length === 0) return null;
  return (
    <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', ...style }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: '0.35rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function AIInsightsPanel({ reportDbId, userRole, preloadedInsights }) {
  const [insights, setInsights] = useState(preloadedInsights || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [notConfigured, setNotConfigured] = useState(false);

  // Check cache on mount if no preloaded insights
  useEffect(() => {
    if (preloadedInsights || !reportDbId) return;

    let cancelled = false;
    async function checkCache() {
      try {
        const res = await apiFetch(`/api/reports/ai-insights?reportId=${reportDbId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.insights && data.insights.aiGenerated) {
          setInsights(data.insights);
        }
      } catch {
        // Silently fail cache check
      }
    }
    checkCache();
    return () => { cancelled = true; };
  }, [reportDbId, preloadedInsights]);

  if (userRole !== 'staff' && userRole !== 'admin') return null;

  async function handleGenerate(regenerate = false) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/reports/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: reportDbId, regenerate }),
      });

      const data = await res.json();

      if (data.success) {
        setInsights(data.insights);
        setIsExpanded(true);
      } else if (data.code === 'AI_NOT_CONFIGURED') {
        setNotConfigured(true);
      } else {
        setError(data.error || 'Failed to generate insights');
      }
    } catch (err) {
      setError('Network error — please try again');
    } finally {
      setIsLoading(false);
    }
  }

  // Not configured state
  if (notConfigured) {
    return (
      <div className="asrs-card" style={{
        borderLeft: '4px solid var(--color-bg-tertiary)',
        opacity: 0.6,
      }}>
        <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--color-text-light)' }}>
          AI Insights not available — OpenAI API key not configured.
        </p>
      </div>
    );
  }

  // No insights yet — show generate button
  if (!insights) {
    return (
      <div className="asrs-card" style={{
        borderLeft: '4px solid var(--color-asrs-orange)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>AI Insights</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', margin: '0.25rem 0 0' }}>
            Generate a narrative analysis of this report using GPT-4o
          </p>
        </div>

        {error && (
          <p style={{ fontSize: '0.85rem', color: '#dc2626', margin: 0, width: '100%' }}>
            {error}
          </p>
        )}

        <button
          onClick={() => handleGenerate(false)}
          disabled={isLoading}
          className="asrs-btn-primary"
          style={{
            padding: '0.5rem 1.25rem',
            fontSize: '0.9rem',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? 'Generating…' : 'Generate AI Insights'}
        </button>
      </div>
    );
  }

  // Insights loaded — render full panel
  return (
    <div className="asrs-card" style={{ borderLeft: '4px solid var(--color-asrs-orange)' }}>
      {/* Header with collapse toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>
          AI Insights
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <SentimentBadge sentiment={insights.sentiment} />
          <span style={{
            fontSize: '1.1rem',
            color: 'var(--color-text-light)',
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
            ▾
          </span>
        </div>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '1rem' }}>
          {/* Summary */}
          {insights.summary && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-light)', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Summary
              </h4>
              <p style={{ fontSize: '0.92rem', lineHeight: '1.6', margin: 0, color: 'var(--color-text-primary)' }}>
                {insights.summary}
              </p>
            </div>
          )}

          {/* Key Insights */}
          {insights.insights?.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-light)', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Key Insights
              </h4>
              <BulletList items={insights.insights} />
            </div>
          )}

          {/* Recommendations */}
          {insights.recommendations?.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-light)', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Recommendations
              </h4>
              <BulletList items={insights.recommendations} />
            </div>
          )}

          {/* Concerns */}
          {insights.concerns?.length > 0 && (
            <div style={{
              marginBottom: '1.25rem',
              padding: '0.75rem',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              border: '1px solid #fecaca',
            }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#991b1b', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Concerns
              </h4>
              <BulletList items={insights.concerns} style={{ color: '#7f1d1d' }} />
            </div>
          )}

          {/* Trends */}
          {insights.trends?.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-light)', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Trend Observations
              </h4>
              <BulletList items={insights.trends} />
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--color-bg-tertiary)',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-light)' }}>
              Generated by {insights.model || 'GPT-4o'} at{' '}
              {insights.generatedAt
                ? new Date(insights.generatedAt).toLocaleString()
                : 'unknown'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleGenerate(true); }}
              disabled={isLoading}
              style={{
                padding: '0.3rem 0.75rem',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--color-bg-tertiary)',
                backgroundColor: 'transparent',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 0.8,
              }}
            >
              {isLoading ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
