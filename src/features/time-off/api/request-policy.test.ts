import { describe, expect, it } from 'vitest';

import { addCalendarDays, validateTimeOffPolicy } from './request-policy';

describe('request-policy', () => {
  it('adds calendar days to date-only strings', () => {
    expect(addCalendarDays('2026-06-05', 3)).toBe('2026-06-08');
  });

  it('requires advance notice', () => {
    expect(
      validateTimeOffPolicy({
        startDate: '2026-06-07',
        endDate: '2026-06-08',
        today: '2026-06-05',
      })?.message,
    ).toBe('Requests must start at least 3 days from today.');
  });

  it('blocks fiscal-year crossings', () => {
    expect(
      validateTimeOffPolicy({
        startDate: '2026-12-30',
        endDate: '2027-01-02',
        today: '2026-06-05',
      })?.message,
    ).toBe('Requests cannot cross the fiscal year boundary.');
  });

  it('blocks requests longer than ten business days', () => {
    expect(
      validateTimeOffPolicy({
        startDate: '2026-06-12',
        endDate: '2026-06-27',
        days: 11,
        today: '2026-06-05',
      })?.message,
    ).toBe('Requests cannot exceed 10 business days.');
  });
});
