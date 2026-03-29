export const EVENTS = {
  REPORT_CREATED: 'report.created',
  USER_INVITED: 'user.invited',
  USER_VERIFIED: 'user.verified',
  QR_SCANNED: 'qr.scanned',
  AUTH_CHANGED: 'auth.changed',
  REPORT_UPDATED: 'report.updated',
  TOAST_REQUESTED: 'toast.requested',
  /** Emitted when a staff save conflicts with a newer server version; admins should review. */
  GOAL_EDIT_CONFLICT: 'goal.edit.conflict',
};

export default EVENTS;
