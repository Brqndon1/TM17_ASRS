/**
 * ============================================================================
 * SHARE PANEL — Social media sharing and QR code generation buttons.
 * ============================================================================
 * Per REP019/REP037:
 * - Share to: Website (embed code), Instagram (QR code), Facebook (share URL),
 *   LinkedIn (share URL).
 * - QR code generation creates PNG images linked to public report URLs.
 *
 * [API ADJUSTMENT] When the backend is ready:
 * - Replace the placeholder URLs with real report URLs from the API.
 * - The QR code generation should call an API endpoint that creates the PNG.
 * - Example: fetch(`/api/reports/${reportId}/qrcode`) → returns PNG blob
 * ============================================================================
 */
'use client';

import { useState } from 'react';

export default function SharePanel({ reportId }) {
  const [showShareMenu, setShowShareMenu] = useState(false);

  /**
   * The base URL where reports will be publicly accessible.
   * [API ADJUSTMENT] Replace this with your actual deployed domain:
   *   const reportUrl = `https://www.asrssuccess.org/reports/${reportId}`;
   */
  const reportUrl = `https://www.asrssuccess.org/reports/${reportId}`;

  /** handleShare — Opens a share action based on the selected platform. */
  function handleShare(platform) {
    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(reportUrl)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(reportUrl)}`, '_blank');
        break;
      case 'qrcode':
        // [API ADJUSTMENT] Replace with real QR code generation API call
        alert(`QR Code would be generated for:\n${reportUrl}\n\n[This will generate a PNG when the API is ready]`);
        break;
      case 'embed':
        // Copy embed code to clipboard
        const embedCode = `<iframe src="${reportUrl}" width="100%" height="600" frameborder="0"></iframe>`;
        navigator.clipboard.writeText(embedCode).then(() => {
          alert('Embed code copied to clipboard!');
        }).catch(() => {
          alert(`Embed code:\n${embedCode}`);
        });
        break;
    }
    setShowShareMenu(false);
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="asrs-btn-secondary"
        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
      >
        Share
      </button>

      {showShareMenu && (
        <div style={{
          position: 'absolute', top: '100%', right: 0,
          marginTop: '0.35rem', backgroundColor: 'white',
          border: '1px solid var(--color-bg-tertiary)',
          borderRadius: '8px', padding: '0.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 50, minWidth: '160px'
        }}>
          {[
            { key: 'facebook', label: 'Facebook' },
            { key: 'linkedin', label: 'LinkedIn' },
            { key: 'qrcode', label: 'QR Code (Instagram)' },
            { key: 'embed', label: 'Embed on Website' }
          ].map(item => (
            <button
              key={item.key}
              onClick={() => handleShare(item.key)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '0.4rem 0.5rem', fontSize: '0.8rem',
                background: 'none', border: 'none', cursor: 'pointer',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-bg-secondary)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}