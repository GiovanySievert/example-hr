import { describe, expect, it } from 'vitest';

import { TimeOffRequestStatus } from './enums';
import { groupRequestsByEmployee, teamConflictSummary } from './team-conflict';
import type { TimeOffRequest } from './types';

function request(overrides: Partial<TimeOffRequest> & { id: string }): TimeOffRequest {
  return {
    employeeId: 'e1',
    locationId: 'us',
    startDate: '2026-06-08',
    endDate: '2026-06-12',
    days: 5,
    status: TimeOffRequestStatus.Pending,
    createdAt: '2026-06-03T00:00:00.000Z',
    updatedAt: '2026-06-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('groupRequestsByEmployee', () => {
  it('groups requests by employee and sorts the groups by id', () => {
    const groups = groupRequestsByEmployee([
      request({ id: 'r1', employeeId: 'e2' }),
      request({ id: 'r2', employeeId: 'e1' }),
      request({ id: 'r3', employeeId: 'e2' }),
    ]);

    expect(groups.map((group) => group.employeeId)).toEqual(['e1', 'e2']);
    expect(groups[1].requests.map((r) => r.id)).toEqual(['r1', 'r3']);
  });

  it('returns an empty array for no requests', () => {
    expect(groupRequestsByEmployee([])).toEqual([]);
  });
});

describe('teamConflictSummary', () => {
  const target = request({ id: 'r1', employeeId: 'e1' });

  it('returns undefined when no other employee overlaps', () => {
    expect(teamConflictSummary(target, [target])).toBeUndefined();
  });

  it('ignores the same employee, denied/cancelled requests, and non-overlapping ranges', () => {
    const others = [
      request({ id: 'r2', employeeId: 'e1' }),
      request({ id: 'r3', employeeId: 'e2', status: TimeOffRequestStatus.Denied }),
      request({ id: 'r4', employeeId: 'e2', status: TimeOffRequestStatus.Cancelled }),
      request({ id: 'r5', employeeId: 'e3', startDate: '2026-07-01', endDate: '2026-07-03' }),
    ];
    expect(teamConflictSummary(target, [target, ...others])).toBeUndefined();
  });

  it('reports a single overlapping employee with "has" and the date range', () => {
    const other = request({ id: 'r2', employeeId: 'e2' });
    const summary = teamConflictSummary(target, [target, other]);
    expect(summary).toBe('Employee e2 has overlapping time off during Jun 8 - Jun 12.');
  });

  it('reports multiple overlapping employees with "have" and dedupes', () => {
    const others = [
      request({ id: 'r2', employeeId: 'e2' }),
      request({ id: 'r3', employeeId: 'e2' }),
      request({ id: 'r4', employeeId: 'e3', status: TimeOffRequestStatus.Approved }),
    ];
    const summary = teamConflictSummary(target, [target, ...others]);
    expect(summary).toBe(
      'Employee e2 and Employee e3 have overlapping time off during Jun 8 - Jun 12.',
    );
  });
});
