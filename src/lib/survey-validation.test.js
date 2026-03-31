import { validateTemplateAnswers } from './survey-validation';

describe('validateTemplateAnswers', () => {
  const fields = [
    { field_id: 1, field_type: 'text', required: 1, field_rules: '{"maxLength":10}', form_field_rules: null },
    { field_id: 2, field_type: 'number', required: 1, field_rules: '{"min":0,"max":100}', form_field_rules: null },
    { field_id: 3, field_type: 'text', required: 0, field_rules: null, form_field_rules: null },
  ];

  test('returns no errors for valid answers', () => {
    const errors = validateTemplateAnswers({ 1: 'hello', 2: 50 }, fields);
    expect(errors).toHaveLength(0);
  });

  test('returns error for required missing field', () => {
    const errors = validateTemplateAnswers({ 2: 50 }, fields);
    expect(errors).toHaveLength(1);
    expect(errors[0].field_id).toBe(1);
  });

  test('returns error for text exceeding maxLength', () => {
    const errors = validateTemplateAnswers({ 1: 'this is way too long', 2: 50 }, fields);
    expect(errors).toHaveLength(1);
    expect(errors[0].field_id).toBe(1);
  });

  test('returns error for number out of range', () => {
    const errors = validateTemplateAnswers({ 1: 'ok', 2: 150 }, fields);
    expect(errors).toHaveLength(1);
    expect(errors[0].field_id).toBe(2);
  });

  test('skips validation for optional empty fields', () => {
    const errors = validateTemplateAnswers({ 1: 'ok', 2: 50, 3: '' }, fields);
    expect(errors).toHaveLength(0);
  });
});
