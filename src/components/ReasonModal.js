"use client";

import { useState } from 'react';

export default function ReasonModal({ visible, onClose, onSubmit, reasons }) {
  const PREDEFINED = reasons || [
    'Data correction',
    'Duplicate',
    'User request',
    'Security',
    'Other',
  ];

  const [reasonType, setReasonType] = useState(PREDEFINED[0]);
  const [reasonText, setReasonText] = useState('');
  const [error, setError] = useState('');

  if (!visible) return null;

  function handleSubmit() {
    setError('');
    if (!reasonType) {
      setError('Please select a reason');
      return;
    }
    if (reasonType === 'Other' && String(reasonText || '').trim() === '') {
      setError('Please provide details for "Other"');
      return;
    }
    onSubmit({ reasonType, reasonText: String(reasonText || '').trim() });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, width: '95%', maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Reason for change</h3>
        <p style={{ marginTop: 6, marginBottom: 12, color: '#666' }}>Please choose a predefined reason or select Other&quot; to provide details. This is required.</p>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Reason</label>
          <select value={reasonType} onChange={(e) => setReasonType(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid #ddd' }}>
            {PREDEFINED.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {reasonType === 'Other' && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Details</label>
            <textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} rows={4} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ddd' }} />
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 12, color: '#b00020' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #ddd', background: 'white' }}>Cancel</button>
          <button onClick={handleSubmit} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: '#1565c0', color: 'white' }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
