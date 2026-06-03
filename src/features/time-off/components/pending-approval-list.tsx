'use client';

import { Typography } from '@/shared/components';

import type { TimeOffRequest } from '../api/types';
import { PendingApprovalItem } from './pending-approval-item';

type PendingApprovalListProps = {
  requests: TimeOffRequest[];
  locationLabels?: Record<string, string>;
};

type EmployeeRequestGroup = {
  employeeId: string;
  requests: TimeOffRequest[];
};

function groupRequestsByEmployee(requests: TimeOffRequest[]): EmployeeRequestGroup[] {
  const grouped = new Map<string, TimeOffRequest[]>();

  for (const request of requests) {
    const employeeRequests = grouped.get(request.employeeId) ?? [];
    employeeRequests.push(request);
    grouped.set(request.employeeId, employeeRequests);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([employeeId, employeeRequests]) => ({
      employeeId,
      requests: employeeRequests,
    }));
}

function pendingLabel(count: number) {
  return count === 1 ? '1 pending request' : `${count} pending requests`;
}

export function PendingApprovalList({ requests, locationLabels }: PendingApprovalListProps) {
  if (requests.length === 0) {
    return <Typography variant="muted">No pending requests.</Typography>;
  }

  const groups = groupRequestsByEmployee(requests);

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => {
        const headingId = `approvals-${group.employeeId}`;

        return (
          <section
            key={group.employeeId}
            className="flex flex-col gap-3"
            aria-labelledby={headingId}
          >
            <div className="flex items-end justify-between gap-4 border-b border-border pb-2">
              <div className="flex flex-col gap-1">
                <Typography id={headingId} variant="h4" as="h2">
                  Employee {group.employeeId}
                </Typography>
                <Typography variant="muted">{pendingLabel(group.requests.length)}</Typography>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {group.requests.map((request) => (
                <PendingApprovalItem
                  key={request.id}
                  request={request}
                  locationLabel={locationLabels?.[request.locationId]}
                  showEmployeeLabel={false}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
