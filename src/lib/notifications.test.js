import {
  buildNotificationsFeed,
  countUnreadNotifications,
  getReadTimestampForOpenedNotifications,
} from '@/lib/notifications';

describe('notifications helpers', () => {
  test('marks all currently fetched notifications as read using the latest notification timestamp', () => {
    const notifications = [
      { id: 'a', timestamp: '2026-04-11T15:00:00.000Z' },
      { id: 'b', timestamp: '2026-04-11T15:05:00.000Z' },
    ];

    const readTimestamp = getReadTimestampForOpenedNotifications(notifications, '2026-04-11T14:59:00.000Z');

    expect(readTimestamp).toBe('2026-04-11T15:05:00.000Z');
    expect(countUnreadNotifications(notifications, readTimestamp)).toBe(0);
  });

  test('returns only active surveys and published reports for public users', () => {
    const notifications = buildNotificationsFeed({
      userType: 'public',
      activeSurveys: [
        {
          distribution_id: 7,
          title: 'Spring Student Voice Survey',
          initiative_name: 'E-Gaming and Careers',
          created_at: '2026-04-11T10:00:00.000Z',
        },
      ],
      reports: [
        { id: 2, name: 'Published Report', status: 'published', created_at: '2026-04-11T09:00:00.000Z' },
        { id: 3, name: 'Draft Report', status: 'draft', created_at: '2026-04-11T11:00:00.000Z' },
      ],
      surveySubmissions: [
        { id: 1, name: 'Should Not Show', email: 'x@test.com', submitted_at: '2026-04-11T12:00:00.000Z' },
      ],
      initiatives: [
        { initiative_id: 9, initiative_name: 'Should Not Show' },
      ],
    });

    expect(notifications).toEqual([
      {
        id: 'survey-distribution-7',
        type: 'survey',
        title: 'New Survey Available',
        description: 'Spring Student Voice Survey — E-Gaming and Careers',
        timestamp: '2026-04-11T10:00:00.000Z',
      },
      {
        id: 'report-2',
        type: 'report',
        title: 'Published Report',
        description: 'Published Report',
        timestamp: '2026-04-11T09:00:00.000Z',
      },
    ]);
  });
});
