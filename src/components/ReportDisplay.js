'use client';

import { useState, useEffect } from 'react';

export default function ReportDisplay() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/reports');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reports');
      }

      setReports(data.reports || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Loading / Error / Empty states ----------

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="text-center text-zinc-600 dark:text-zinc-400">
          Loading reports...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md">
          Error: {error}
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="text-center text-zinc-600 dark:text-zinc-400">
          No reports available yet. Submit a survey to generate reports.
        </div>
      </div>
    );
  }

  // ---------- Render reports ----------

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-black dark:text-zinc-50">
          Survey Reports
        </h2>
        <button
          onClick={fetchReports}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-6">
        {reports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
}

// ---------- Individual report card ----------

function ReportCard({ report }) {
  const rd = report.reportData || {};

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 border border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2">
          Report #{report.id}
        </h3>
        <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-0.5">
          <p>Survey ID: {report.surveyId}</p>
          <p>
            Submitted by: {report.surveyName} ({report.surveyEmail})
          </p>
          <p>Created: {new Date(report.createdAt).toLocaleString()}</p>
          {rd.aiGenerated && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              AI-Enhanced (GPT-4)
            </span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
            Completion Rate
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {rd.completionRate ?? '—'}%
          </div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
            Questions Answered
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {rd.answeredQuestions ?? '?'} / {rd.totalQuestions ?? '?'}
          </div>
        </div>
      </div>

      {/* Response Types */}
      {rd.responseTypes && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-md mb-4">
          <div className="text-sm font-medium text-black dark:text-zinc-50 mb-2">
            Response Types
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">Text:</span>{' '}
              <span className="font-semibold text-black dark:text-zinc-50">
                {rd.responseTypes.text || 0}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">
                Numeric:
              </span>{' '}
              <span className="font-semibold text-black dark:text-zinc-50">
                {rd.responseTypes.numeric || 0}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">
                Choice:
              </span>{' '}
              <span className="font-semibold text-black dark:text-zinc-50">
                {rd.responseTypes.choice || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sentiment badge */}
      {rd.sentiment && (
        <div className="mb-4">
          <span
            className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
              rd.sentiment === 'positive'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : rd.sentiment === 'negative'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
            }`}
          >
            Sentiment: {rd.sentiment}
          </span>
        </div>
      )}

      {/* AI Summary */}
      {rd.aiSummary && (
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-md mb-4">
          <div className="text-sm font-medium text-black dark:text-zinc-50 mb-1">
            AI Summary
          </div>
          <div className="text-sm text-zinc-700 dark:text-zinc-300">
            {rd.aiSummary}
          </div>
        </div>
      )}

      {/* Fallback: plain summary (non-AI) */}
      {!rd.aiSummary && rd.summary && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-md mb-4">
          <div className="text-sm font-medium text-black dark:text-zinc-50 mb-1">
            Summary
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {rd.summary}
          </div>
        </div>
      )}

      {/* Insights */}
      {rd.insights?.length > 0 && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-md mb-4">
          <div className="text-sm font-medium text-black dark:text-zinc-50 mb-2">
            Key Insights
          </div>
          <ul className="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
            {rd.insights.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {rd.recommendations?.length > 0 && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-md mb-4">
          <div className="text-sm font-medium text-black dark:text-zinc-50 mb-2">
            Recommendations
          </div>
          <ul className="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
            {rd.recommendations.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Trends */}
      {rd.trends?.length > 0 && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-md mb-4">
          <div className="text-sm font-medium text-black dark:text-zinc-50 mb-2">
            Trends
          </div>
          <ul className="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
            {rd.trends.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Concerns */}
      {rd.concerns?.length > 0 && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-md mb-4">
          <div className="text-sm font-medium text-black dark:text-zinc-50 mb-2">
            Concerns
          </div>
          <ul className="list-disc list-inside text-sm text-orange-700 dark:text-orange-300 space-y-1">
            {rd.concerns.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* AI unavailable fallback notice */}
      {rd.aiGenerated === false && rd.error && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-sm text-yellow-700 dark:text-yellow-300">
          Note: {rd.error}. Showing basic statistics only.
        </div>
      )}
    </div>
  );
}
