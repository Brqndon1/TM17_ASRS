import { derivePreviewAttributes } from '@/lib/report-preview';

describe('derivePreviewAttributes', () => {
  test('includes real table columns that are missing from initiative attribute metadata', () => {
    const attributes = ['Grade', 'School'];
    const tableData = [
      {
        id: 26,
        Grade: '9th',
        School: 'school',
        'How satisfied are you with campus facilities?': 3,
      },
    ];

    expect(derivePreviewAttributes(attributes, tableData)).toEqual([
      'Grade',
      'School',
      'How satisfied are you with campus facilities?',
    ]);
  });
});
