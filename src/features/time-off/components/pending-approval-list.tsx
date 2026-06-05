'use client';

import { Typography } from '@/shared/components';

import { groupRequestsByEmployee, teamConflictSummary } from '../api/team-conflict';
import type { TimeOffRequest } from '../api/types';
import { PendingApprovalCard } from './pending-approval-card';

type PendingApprovalListProps = {
  requests: TimeOffRequest[];
  allRequests?: TimeOffRequest[];
  locationLabels?: Record<string, string>;
};

function pendingLabel(count: number) {
  return count === 1 ? '1 pending request' : `${count} pending requests`;
}

export function PendingApprovalList({
  requests,
  allRequests = requests,
  locationLabels,
}: PendingApprovalListProps) {
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
                <PendingApprovalCard
                  key={request.id}
                  request={request}
                  locationLabel={locationLabels?.[request.locationId]}
                  teamConflictSummary={teamConflictSummary(request, allRequests)}
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
