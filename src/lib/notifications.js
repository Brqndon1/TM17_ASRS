function notificationSort(left, right) {
  if (!left.timestamp && !right.timestamp) return 0;
  if (!left.timestamp) return 1;
  if (!right.timestamp) return -1;
  return new Date(right.timestamp) - new Date(left.timestamp);
}

export function getReadTimestampForOpenedNotifications(notifications, fallbackTimestamp = null) {
  const timestamps = notifications
    .map((notification) => notification.timestamp)
    .filter(Boolean)
    .sort((left, right) => new Date(right) - new Date(left));

  return timestamps[0] || fallbackTimestamp;
}

export function countUnreadNotifications(notifications, lastCheckedAt) {
  if (!lastCheckedAt) return notifications.length;
  const lastCheckedMs = new Date(lastCheckedAt).getTime();

  return notifications.filter((notification) => {
    if (!notification.timestamp) return false;
    return new Date(notification.timestamp).getTime() > lastCheckedMs;
  }).length;
}

export function buildNotificationsFeed({
  userType,
  surveySubmissions = [],
  reports = [],
  initiatives = [],
  activeSurveys = [],
}) {
  if (userType === 'public') {
    return [
      ...activeSurveys.map((survey) => ({
        id: `survey-distribution-${survey.distribution_id}`,
        type: 'survey',
        title: 'New Survey Available',
        description: survey.initiative_name
          ? `${survey.title} — ${survey.initiative_name}`
          : survey.title,
        timestamp: survey.created_at,
      })),
      ...reports
        .filter((report) => String(report.status || '').toLowerCase() === 'published')
        .map((report) => ({
          id: `report-${report.id}`,
          type: 'report',
          title: 'Published Report',
          description: report.name || 'Untitled report',
          timestamp: report.created_at,
        })),
    ].sort(notificationSort);
  }

  return [
    ...surveySubmissions.map((survey) => ({
      id: `survey-${survey.id}`,
      type: 'survey',
      title: 'New Survey Submission',
      description: `${survey.name || survey.email} submitted a survey`,
      timestamp: survey.submitted_at,
    })),
    ...reports.map((report) => ({
      id: `report-${report.id}`,
      type: 'report',
      title: 'Report Created',
      description: `${report.name || 'Untitled report'} — ${report.status}`,
      timestamp: report.created_at,
    })),
    ...initiatives.map((initiative) => ({
      id: `initiative-${initiative.initiative_id}`,
      type: 'initiative',
      title: 'Initiative Created',
      description: initiative.initiative_name,
      timestamp: null,
    })),
  ].sort(notificationSort);
}
