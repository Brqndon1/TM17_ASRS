'use client';

import Header from '@/components/Header';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { apiFetch } from '@/lib/api/client';

const STEPS = ['upload', 'preview', 'result'];

export default function AdminImportPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const fileInputRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  // Auth guard
  useEffect(() => {
    setIsMounted(true);
    if (user === undefined) return;
    if (!user) { router.push('/login'); return; }
    if (user.user_type !== 'admin') { router.push('/'); }
  }, [router, user]);

  // State
  const [tables, setTables] = useState([]);
  const [step, setStep] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Upload step
  const [selectedTable, setSelectedTable] = useState('');
  const [conflictMode, setConflictMode] = useState('skip');
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileType, setFileType] = useState('');

  // Preview step
  const [previewData, setPreviewData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});

  // Result step
  const [result, setResult] = useState(null);

  // Fetch available tables
  useEffect(() => {
    if (!user || user.user_type !== 'admin') return;
    apiFetch('/api/admin/import')
      .then((r) => r.json())
      .then((data) => { if (data.success) setTables(data.tables); })
      .catch(() => {});
  }, [user]);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    let type = '';
    if (name.endsWith('.csv')) type = 'csv';
    else if (name.endsWith('.json')) type = 'json';
    else {
      setError('Please select a .csv or .json file');
      return;
    }

    setError('');
    setFileName(file.name);
    setFileType(type);

    const reader = new FileReader();
    reader.onload = (evt) => setFileContent(evt.target.result);
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  }

  async function handlePreview() {
    if (!selectedTable) { setError('Please select a target table'); return; }
    if (!fileContent) { setError('Please select a file'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/admin/import?action=preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: selectedTable, fileContent, fileType, conflictMode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Preview failed'); setLoading(false); return; }

      setPreviewData(data);
      setColumnMapping(data.autoMapping || {});
      setStep('preview');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleExecute() {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/admin/import?action=execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: selectedTable,
          fileContent,
          fileType,
          conflictMode,
          columnMapping,
          previewToken: previewData.previewToken,
        }),
      });
      const data = await res.json();
      if (!res.ok && !data.validationErrors) {
        setError(data.error || 'Import failed');
        setLoading(false);
        return;
      }
      setResult(data);
      setStep('result');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  function handleReset() {
    setStep('upload');
    setError('');
    setFileName('');
    setFileContent('');
    setFileType('');
    setPreviewData(null);
    setColumnMapping({});
    setResult(null);
    setSelectedTable('');
    setConflictMode('skip');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  if (!isMounted || !user || user.user_type !== 'admin') return null;

  return (
    <>
      <Header />
      <main style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>Data Import</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Import CSV or JSON files into the database. Select a table, upload your file, preview, and confirm.
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {STEPS.map((s, i) => (
            <div
              key={s}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: step === s ? 700 : 500,
                backgroundColor: step === s ? '#2C2C2C' : '#e8e8e8',
                color: step === s ? 'white' : '#666',
              }}
            >
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}>
            {error}
          </div>
        )}

        {/* UPLOAD STEP */}
        {step === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Table selection */}
            <div>
              <label style={labelStyle}>Target Table</label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                style={inputStyle}
              >
                <option value="">-- Select a table --</option>
                {tables.map((t) => (
                  <option key={t.name} value={t.name}>{t.label} ({t.name})</option>
                ))}
              </select>
              {selectedTable && tables.find((t) => t.name === selectedTable) && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                  Columns:{' '}
                  {tables.find((t) => t.name === selectedTable).columns.map((c) => (
                    <span key={c.name} style={{
                      display: 'inline-block',
                      padding: '0.15rem 0.5rem',
                      margin: '0.15rem',
                      backgroundColor: c.required ? '#dbeafe' : '#f3f4f6',
                      border: `1px solid ${c.required ? '#93c5fd' : '#d1d5db'}`,
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                    }}>
                      {c.name}{c.required ? '*' : ''} <span style={{ opacity: 0.6 }}>({c.type})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Conflict mode */}
            <div>
              <label style={labelStyle}>Conflict Mode</label>
              <select
                value={conflictMode}
                onChange={(e) => setConflictMode(e.target.value)}
                style={inputStyle}
              >
                <option value="skip">Skip duplicates</option>
                <option value="fail">Fail on any conflict</option>
                <option value="upsert">Upsert (update or insert)</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.3rem' }}>
                {conflictMode === 'skip' && 'Rows that conflict with existing data will be silently skipped.'}
                {conflictMode === 'fail' && 'The entire import will be rejected if any row conflicts.'}
                {conflictMode === 'upsert' && 'Existing rows will be updated; new rows will be inserted.'}
              </p>
            </div>

            {/* File upload */}
            <div>
              <label style={labelStyle}>File (CSV or JSON)</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#fafafa',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#9ca3af'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                {fileName ? (
                  <div>
                    <span style={{ fontSize: '1.5rem' }}>&#128196;</span>
                    <p style={{ margin: '0.5rem 0 0', fontWeight: 600 }}>{fileName}</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#666' }}>
                      {fileType.toUpperCase()} file loaded. Click to change.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: '#555' }}>
                      Click to select a file
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#888' }}>
                      Supports .csv and .json (max 500 rows)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handlePreview}
              disabled={loading || !selectedTable || !fileContent}
              style={{
                ...btnPrimary,
                opacity: (loading || !selectedTable || !fileContent) ? 0.5 : 1,
              }}
            >
              {loading ? 'Processing...' : 'Preview Import'}
            </button>
          </div>
        )}

        {/* PREVIEW STEP */}
        {step === 'preview' && previewData && (
          <div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem',
            }}>
              <div>
                <span style={{ fontWeight: 600 }}>
                  {previewData.totalRows} row{previewData.totalRows !== 1 ? 's' : ''} found
                </span>
                <span style={{ color: '#666', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                  (showing first {Math.min(previewData.previewRows.length, 10)})
                </span>
              </div>
              <button onClick={() => setStep('upload')} style={btnSecondary}>
                Back
              </button>
            </div>

            {/* Column mapping */}
            <div style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
            }}>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>Column Mapping</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.5rem' }}>
                {previewData.fileColumns.map((fileCol) => (
                  <div key={fileCol} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 600, minWidth: '100px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {fileCol}
                    </span>
                    <span style={{ color: '#999', fontSize: '0.8rem' }}>&rarr;</span>
                    <select
                      value={columnMapping[fileCol] || '__skip__'}
                      onChange={(e) => setColumnMapping((prev) => ({ ...prev, [fileCol]: e.target.value }))}
                      style={{ ...inputStyle, flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                    >
                      <option value="__skip__">(skip this column)</option>
                      {previewData.dbColumns.map((dbCol) => (
                        <option key={dbCol.name} value={dbCol.name}>
                          {dbCol.name}{dbCol.required ? ' *' : ''} ({dbCol.type})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview table */}
            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    {previewData.fileColumns.map((col) => (
                      <th key={col} style={thStyle}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.previewRows.map((row, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{i + 1}</td>
                      {previewData.fileColumns.map((col) => (
                        <td key={col} style={tdStyle}>
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleExecute}
                disabled={loading}
                style={{ ...btnPrimary, opacity: loading ? 0.5 : 1 }}
              >
                {loading ? 'Importing...' : `Import ${previewData.totalRows} Rows`}
              </button>
              <button onClick={() => setStep('upload')} style={btnSecondary}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* RESULT STEP */}
        {step === 'result' && result && (
          <div>
            <div style={{
              padding: '1.5rem',
              borderRadius: '8px',
              backgroundColor: result.success ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`,
              marginBottom: '1rem',
            }}>
              <h3 style={{
                margin: '0 0 0.75rem',
                fontSize: '1.1rem',
                fontWeight: 700,
                color: result.success ? '#166534' : '#dc2626',
              }}>
                {result.success ? 'Import Complete' : 'Import Failed'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                <StatCard label="Total Rows" value={result.totalRows} />
                <StatCard label="Inserted" value={result.inserted} color="#16a34a" />
                {result.updated > 0 && <StatCard label="Updated" value={result.updated} color="#2563eb" />}
                <StatCard label="Skipped" value={result.skipped} color="#d97706" />
              </div>
            </div>

            {result.validationErrors && result.validationErrors.length > 0 && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                marginBottom: '1rem',
                maxHeight: '200px',
                overflowY: 'auto',
              }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#92400e' }}>
                  Errors ({result.validationErrors.length})
                </h4>
                {result.validationErrors.slice(0, 50).map((err, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: '#92400e', padding: '0.15rem 0' }}>
                    {err}
                  </div>
                ))}
                {result.validationErrors.length > 50 && (
                  <div style={{ fontSize: '0.8rem', color: '#92400e', fontStyle: 'italic', marginTop: '0.25rem' }}>
                    ...and {result.validationErrors.length - 50} more
                  </div>
                )}
              </div>
            )}

            <button onClick={handleReset} style={btnPrimary}>
              Import Another File
            </button>
          </div>
        )}
      </main>
    </>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: color || '#333' }}>
        {value ?? 0}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#666' }}>{label}</div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  marginBottom: '0.35rem',
  color: '#333',
};

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.9rem',
  backgroundColor: 'white',
};

const btnPrimary = {
  padding: '0.6rem 1.5rem',
  backgroundColor: '#2C2C2C',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSecondary = {
  padding: '0.6rem 1.5rem',
  backgroundColor: 'white',
  color: '#333',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const thStyle = {
  textAlign: 'left',
  padding: '0.5rem 0.75rem',
  backgroundColor: '#f3f4f6',
  borderBottom: '2px solid #e5e7eb',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '0.4rem 0.75rem',
  borderBottom: '1px solid #e5e7eb',
  maxWidth: '200px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
