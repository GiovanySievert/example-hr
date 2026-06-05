import { dateRangesOverlap, formatDateRange } from './date-range';
import { TimeOffRequestStatus } from './enums';
import type { TimeOffRequest } from './types';

export type EmployeeRequestGroup = {
  employeeId: string;
  requests: TimeOffRequest[];
};

export function groupRequestsByEmployee(requests: TimeOffRequest[]): EmployeeRequestGroup[] {
  const grouped = new Map<string, TimeOffRequest[]>();

  for (const request of requests) {
    const employeeRequests = grouped.get(request.employeeId) ?? [];
    employeeRequests.push(request);
    grouped.set(request.employeeId, employeeRequests);
  }

  return [...grouped.entries()]
    .sort(([employeeIdA], [employeeIdB]) => employeeIdA.localeCompare(employeeIdB))
    .map(([employeeId, employeeRequests]) => ({
      employeeId,
      requests: employeeRequests,
    }));
}

function isActiveRequest(request: TimeOffRequest) {
  return (
    request.status === TimeOffRequestStatus.Pending ||
    request.status === TimeOffRequestStatus.Approved
  );
}

export function teamConflictSummary(
  request: TimeOffRequest,
  allRequests: TimeOffRequest[],
): string | undefined {
  const conflicts = allRequests.filter(
    (other) =>
      other.id !== request.id &&
      other.employeeId !== request.employeeId &&
      isActiveRequest(other) &&
      dateRangesOverlap(request.startDate, request.endDate, other.startDate, other.endDate),
  );

  if (conflicts.length === 0) return undefined;

  const employees = [...new Set(conflicts.map((conflict) => `Employee ${conflict.employeeId}`))];
  const range = formatDateRange(request.startDate, request.endDate);
  const employeeLabel =
    employees.length === 1
      ? employees[0]
      : `${employees.slice(0, -1).join(', ')} and ${employees.at(-1)}`;
  return `${employeeLabel} ${employees.length === 1 ? 'has' : 'have'} overlapping time off${range ? ` during ${range}` : ''}.`;
}
