import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TimeOffRequestStatus } from './enums';
import { validateTimeOffRequest, type ExistingRequest } from './request-validation';

const VALID = {
  locationId: 'us',
  startDate: '2026-06-15',
  endDate: '2026-06-18',
  days: 4,
};

function existing(overrides: Partial<ExistingRequest> & { id: string }): ExistingRequest {
  return {
    employeeId: 'e1',
    locationId: 'us',
    startDate: '2026-06-15',
    endDate: '2026-06-18',
    days: 4,
    status: TimeOffRequestStatus.Pending,
    createdAt: '2026-06-03T00:00:00.000Z',
    updatedAt: '2026-06-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('validateTimeOffRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-05T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for a valid request', () => {
    expect(validateTimeOffRequest(VALID)).toBeNull();
  });

  it('requires a location', () => {
    expect(validateTimeOffRequest({ ...VALID, locationId: '' })).toBe('Select a location.');
  });

  it('requires both dates', () => {
    expect(validateTimeOffRequest({ ...VALID, startDate: '' })).toBe(
      'Select a start and end date.',
    );
  });

  it('rejects an end date before the start date', () => {
    expect(
      validateTimeOffRequest({ ...VALID, startDate: '2026-06-18', endDate: '2026-06-15' }),
    ).toBe('End date must be on or after start date.');
  });

  it('surfaces a policy violation message', () => {
    expect(
      validateTimeOffRequest({ ...VALID, startDate: '2026-06-06', endDate: '2026-06-06' }),
    ).toBe('Requests must start at least 3 days from today.');
  });

  it('blocks a range that overlaps an active request', () => {
    expect(validateTimeOffRequest({ ...VALID, existingRequests: [existing({ id: 'r1' })] })).toBe(
      'This date range overlaps an existing time-off request.',
    );
  });

  it('ignores reverted and inactive requests when checking overlap', () => {
    const requests = [
      existing({ id: 'r1', reverted: true }),
      existing({ id: 'r2', status: TimeOffRequestStatus.Denied }),
      existing({ id: 'r3', status: TimeOffRequestStatus.Cancelled }),
    ];
    expect(validateTimeOffRequest({ ...VALID, existingRequests: requests })).toBeNull();
  });

  it('requires at least one weekday', () => {
    expect(validateTimeOffRequest({ ...VALID, days: 0 })).toBe('Select at least one weekday.');
  });

  it('rejects more days than available', () => {
    expect(validateTimeOffRequest({ ...VALID, days: 4, maxDays: 3 })).toBe(
      'You only have 3 days available.',
    );
  });
});
