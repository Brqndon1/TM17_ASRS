import { db } from '@/lib/db';

export const PREDEFINED_REASONS = [
  'Data correction',
  'Duplicate',
  'User request',
  'Security',
  'Other',
];

export function validateReason(reasonType, reasonText) {
  if (!reasonType) return { valid: false, error: 'reasonType is required' };
  if (!PREDEFINED_REASONS.includes(reasonType)) return { valid: false, error: 'Invalid reasonType' };
  if (reasonType === 'Other' && (!reasonText || String(reasonText).trim() === '')) {
    return { valid: false, error: 'reasonText is required when reasonType is Other' };
  }
  return { valid: true };
}

export function recordAudit(event, userEmail, targetType, targetId, reasonType, reasonText, payload) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_log (event, user_email, target_type, target_id, reason_type, reason_text, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(event, userEmail || null, targetType || null, targetId == null ? null : String(targetId), reasonType || null, reasonText || null, payload ? JSON.stringify(payload) : null);
  } catch (err) {
    // Don't throw - auditing should not block normal flow; log and continue
    console.error('[audit] failed to record audit entry:', err);
  }
}
