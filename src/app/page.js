'use client';

import { useState } from 'react';
import SurveyForm from '@/components/SurveyForm';
import ReportDisplay from '@/components/ReportDisplay';

export default function Home() {
  const [activeTab, setActiveTab] = useState('survey');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSurveySuccess = () => {
    // Refresh reports when a new survey is submitted
    setRefreshKey((prev) => prev + 1);
    setActiveTab('reports');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center text-black dark:text-zinc-50 mb-2">
            Survey & Reporting System
          </h1>
          <p className="text-center text-zinc-600 dark:text-zinc-400">
            Submit surveys and view generated reports
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white dark:bg-zinc-900 rounded-lg p-1 shadow-md">
            <button
              onClick={() => setActiveTab('survey')}
              className={`px-6 py-2 rounded-md transition-colors ${
                activeTab === 'survey'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Submit Survey
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-2 rounded-md transition-colors ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              View Reports
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === 'survey' && (
            <SurveyForm onSuccess={handleSurveySuccess} />
          )}
          {activeTab === 'reports' && (
            <ReportDisplay key={refreshKey} />
          )}
        </div>
      </main>
    </div>
  );
}
