import { validateTime, generateTimeOptions } from '../utils/timeUtils';

describe('TimeUtils', () => {
  test('validateTime should reject times after 21:00', () => {
    expect(validateTime('22:00')).toBe(false);
  });

  test('generateTimeOptions should not include past times', () => {
    const now = new Date('2024-01-01T14:30:00');
    const options = generateTimeOptions(now);
    expect(options[0].value).toBe('15:00');
  });
}); 