import { describe, expect, it } from 'vitest';

import {
  countBusinessDays,
  dateRangesOverlap,
  formatDateRange,
  formatDayCount,
} from './date-range';

describe('date-range', () => {
  it('counts weekdays inclusively and skips weekends', () => {
    expect(countBusinessDays('2026-06-08', '2026-06-12')).toBe(5);
    expect(countBusinessDays('2026-06-12', '2026-06-15')).toBe(2);
  });

  it('returns zero for invalid or weekend-only ranges', () => {
    expect(countBusinessDays('2026-06-13', '2026-06-14')).toBe(0);
    expect(countBusinessDays('2026-06-15', '2026-06-12')).toBe(0);
  });

  it('formats a date range for request labels', () => {
    expect(formatDateRange('2026-06-08', '2026-06-10')).toBe('Jun 8 - Jun 10');
    expect(formatDateRange('2026-06-08', '2026-06-08')).toBe('Jun 8');
  });

  it('formats day counts with natural pluralization', () => {
    expect(formatDayCount(1)).toBe('1 day');
    expect(formatDayCount(4)).toBe('4 days');
    expect(formatDayCount(1, 'business day')).toBe('1 business day');
    expect(formatDayCount(2, 'business day')).toBe('2 business days');
  });

  it('detects overlapping date ranges inclusively', () => {
    expect(dateRangesOverlap('2026-06-08', '2026-06-11', '2026-06-11', '2026-06-12')).toBe(
      true,
    );
    expect(dateRangesOverlap('2026-06-08', '2026-06-11', '2026-06-12', '2026-06-15')).toBe(
      false,
    );
  });
});
