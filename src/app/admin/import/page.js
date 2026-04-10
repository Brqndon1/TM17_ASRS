'use client';

import PageLayout from '@/components/PageLayout';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { apiFetch } from '@/lib/api/client';

const STEPS = ['upload', 'preview', 'result'];

export default function AdminImportPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();
  const fileInputRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  // Auth guard
  useEffect(() => {
    setIsMounted(true);
    if (!hydrated) return;
    if (!user) { router.push('/login'); return; }
    if (user.user_type !== 'admin') { router.push('/'); }
  }, [router, user, hydrated]);

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

  const inputSt = {
    width: '100%',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '9px 14px',
    fontSize: '0.9rem',
    outline: 'none',
    backgroundColor: 'white',
    boxSizing: 'border-box',
  };

  const labelSt = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '600',
    marginBottom: '0.35rem',
    color: '#374151',
  };

  return (
    <PageLayout title="Data Import">
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
              backgroundColor: step === s ? '#E67E22' : '#F3F4F6',
              color: step === s ? 'white' : '#6B7280',
            }}
          >
            {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
          </div>
        ))}
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          color: '#DC2626',
          marginBottom: '1rem',
          fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      {/* UPLOAD STEP */}
      {step === 'upload' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">Upload Configuration</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
            {/* Table selection */}
            <div>
              <label style={labelSt}>Target Table</label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                style={inputSt}
              >
                <option value="">-- Select a table --</option>
                {tables.map((t) => (
                  <option key={t.name} value={t.name}>{t.label} ({t.name})</option>
                ))}
              </select>
              {selectedTable && tables.find((t) => t.name === selectedTable) && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#6B7280' }}>
                  Columns:{' '}
                  {tables.find((t) => t.name === selectedTable).columns.map((c) => (
                    <span key={c.name} style={{
                      display: 'inline-block',
                      padding: '0.15rem 0.5rem',
                      margin: '0.15rem',
                      backgroundColor: c.required ? '#DBEAFE' : '#F3F4F6',
                      border: `1px solid ${c.required ? '#93C5FD' : '#D1D5DB'}`,
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
              <label style={labelSt}>Conflict Mode</label>
              <select
                value={conflictMode}
                onChange={(e) => setConflictMode(e.target.value)}
                style={inputSt}
              >
                <option value="skip">Skip duplicates</option>
                <option value="fail">Fail on any conflict</option>
                <option value="upsert">Upsert (update or insert)</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.3rem' }}>
                {conflictMode === 'skip' && 'Rows that conflict with existing data will be silently skipped.'}
                {conflictMode === 'fail' && 'The entire import will be rejected if any row conflicts.'}
                {conflictMode === 'upsert' && 'Existing rows will be updated; new rows will be inserted.'}
              </p>
            </div>

            {/* File upload drag-and-drop zone */}
            <div>
              <label style={labelSt}>File (CSV or JSON)</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #E5E7EB',
                  borderRadius: '12px',
                  padding: '2.5rem 2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#F9FAFB',
                  transition: 'border-color 0.2s, background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E67E22'; e.currentTarget.style.backgroundColor = '#FEF9F0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#E67E22'; e.currentTarget.style.backgroundColor = '#FEF9F0'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.backgroundColor = '#F9FAFB'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const fakeEvent = { target: { files: [file] } };
                    handleFileSelect(fakeEvent);
                  }
                }}
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
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>&#128196;</div>
                    <p style={{ margin: '0', fontWeight: '600', color: '#111827' }}>{fileName}</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#6B7280' }}>
                      {fileType.toUpperCase()} file loaded. Click to change.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#9CA3AF' }}>&#8679;</div>
                    <p style={{ margin: 0, fontWeight: '600', color: '#374151' }}>
                      Click to select or drag & drop a file
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#9CA3AF' }}>
                      Supports .csv and .json (max 500 rows)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <button
                onClick={handlePreview}
                disabled={loading || !selectedTable || !fileContent}
                className="btn-primary"
                style={{ opacity: (loading || !selectedTable || !fileContent) ? 0.5 : 1, cursor: (loading || !selectedTable || !fileContent) ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Processing...' : 'Preview Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW STEP */}
      {step === 'preview' && previewData && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontWeight: 600, color: '#111827' }}>
                {previewData.totalRows} row{previewData.totalRows !== 1 ? 's' : ''} found
              </span>
              <span style={{ color: '#6B7280', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                (showing first {Math.min(previewData.previewRows.length, 10)})
              </span>
            </div>
            <button onClick={() => setStep('upload')} className="btn-outline">
              Back
            </button>
          </div>

          {/* Column mapping */}
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: '0.95rem' }}>Column Mapping</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.5rem', marginTop: '0.75rem' }}>
              {previewData.fileColumns.map((fileCol) => (
                <div key={fileCol} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#374151' }}>
                    {fileCol}
                  </span>
                  <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>&rarr;</span>
                  <select
                    value={columnMapping[fileCol] || '__skip__'}
                    onChange={(e) => setColumnMapping((prev) => ({ ...prev, [fileCol]: e.target.value }))}
                    style={{ border: '1px solid #E5E7EB', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.8rem', flex: 1, outline: 'none', backgroundColor: 'white' }}
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
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    {previewData.fileColumns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.previewRows.map((row, i) => (
                    <tr key={i}>
                      <td style={{ color: '#9CA3AF' }}>{i + 1}</td>
                      {previewData.fileColumns.map((col) => (
                        <td key={col} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleExecute}
              disabled={loading}
              className="btn-primary"
              style={{ opacity: loading ? 0.5 : 1 }}
            >
              {loading ? 'Importing...' : `Import ${previewData.totalRows} Rows`}
            </button>
            <button onClick={() => setStep('upload')} className="btn-outline">
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
            borderRadius: '12px',
            backgroundColor: result.success ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${result.success ? '#BBF7D0' : '#FECACA'}`,
            marginBottom: '1rem',
          }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, color: result.success ? '#166534' : '#DC2626' }}>
              {result.success ? 'Import Complete' : 'Import Failed'}
            </h3>
            <div className="stats-row">
              <div className="stat-card" style={{ background: 'white' }}>
                <div className="stat-label">Total Rows</div>
                <div className="stat-value" style={{ fontSize: '1.5rem' }}>{result.totalRows ?? 0}</div>
              </div>
              <div className="stat-card" style={{ background: 'white' }}>
                <div className="stat-label">Inserted</div>
                <div className="stat-value" style={{ fontSize: '1.5rem', color: '#16A34A' }}>{result.inserted ?? 0}</div>
              </div>
              {result.updated > 0 && (
                <div className="stat-card" style={{ background: 'white' }}>
                  <div className="stat-label">Updated</div>
                  <div className="stat-value" style={{ fontSize: '1.5rem', color: '#2563EB' }}>{result.updated ?? 0}</div>
                </div>
              )}
              <div className="stat-card" style={{ background: 'white' }}>
                <div className="stat-label">Skipped</div>
                <div className="stat-value" style={{ fontSize: '1.5rem', color: '#D97706' }}>{result.skipped ?? 0}</div>
              </div>
            </div>
          </div>

          {result.validationErrors && result.validationErrors.length > 0 && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '8px',
              marginBottom: '1rem',
              maxHeight: '200px',
              overflowY: 'auto',
            }}>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#92400E' }}>
                Errors ({result.validationErrors.length})
              </h4>
              {result.validationErrors.slice(0, 50).map((err, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: '#92400E', padding: '0.15rem 0' }}>
                  {err}
                </div>
              ))}
              {result.validationErrors.length > 50 && (
                <div style={{ fontSize: '0.8rem', color: '#92400E', fontStyle: 'italic', marginTop: '0.25rem' }}>
                  ...and {result.validationErrors.length - 50} more
                </div>
              )}
            </div>
          )}

          <button onClick={handleReset} className="btn-primary">
            Import Another File
          </button>
        </div>
      )}
    </PageLayout>
  );
}
