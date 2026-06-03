'use client';

import { Typography } from '@/shared/components';

import type { TimeOffRequest } from '../api/types';
import { PendingApprovalItem } from './pending-approval-item';

type PendingApprovalListProps = {
  requests: TimeOffRequest[];
  locationLabels?: Record<string, string>;
};

export function PendingApprovalList({
  requests,
  locationLabels,
}: PendingApprovalListProps) {
  if (requests.length === 0) {
    return <Typography variant="muted">No pending requests.</Typography>;
  }

  return (
    <div className="flex flex-col gap-4">
      {requests.map((request) => (
        <PendingApprovalItem
          key={request.id}
          request={request}
          locationLabel={locationLabels?.[request.locationId]}
        />
      ))}
    </div>
  );
}
