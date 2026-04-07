"use client";

import { useState, useEffect } from 'react';

export default function ReasonModal({ open, onClose, onSubmit }) {
  const [reasonType, setReasonType] = useState('manual');
  const [reasonText, setReasonText] = useState('');

  useEffect(() => {
    if (open) {
      setReasonText('');
      setReasonType('manual');
    }
  }, [open]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />

      <div style={{ position: 'relative', width: 'min(640px, 95%)', background: 'white', borderRadius: 8, padding: '1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Why are you creating this initiative?</h3>
        <p style={{ marginTop: 0, color: '#666', marginBottom: '0.75rem' }}>Provide a reason or context for auditing purposes.</p>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Type</label>
          <select value={reasonType} onChange={(e) => setReasonType(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 6 }}>
            <option value="manual">Manual</option>
            <option value="import">Import</option>
            <option value="migration">Migration</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Details (optional)</label>
          <textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} rows={4} style={{ width: '100%', padding: '0.5rem', borderRadius: 6 }} placeholder="Optional details about why this initiative is being created." />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" onClick={onClose} style={{ padding: '0.5rem 0.75rem', borderRadius: 6, background: '#efefef', border: 'none', cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={() => onSubmit({ reasonType, reasonText })} style={{ padding: '0.5rem 0.75rem', borderRadius: 6, background: '#2b6cb0', color: 'white', border: 'none', cursor: 'pointer' }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
