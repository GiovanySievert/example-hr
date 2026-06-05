'use client';

import { Typography } from '@/shared/components';

import { TimeOffRequestStatus } from '../api/enums';
import { useRequests } from '../hooks/use-requests';
import { PendingApprovalList } from './pending-approval-list';

const LOCATION_LABELS: Record<string, string> = {
  us: 'United States',
  de: 'Germany',
  br: 'Brazil',
};

export function ManagerApprovals() {
  const requestsQuery = useRequests();

  if (requestsQuery.isLoading) {
    return <Typography variant="muted">Loading requests…</Typography>;
  }

  if (requestsQuery.isError) {
    return <Typography variant="muted">Could not load approval requests.</Typography>;
  }

  const requests = requestsQuery.data ?? [];
  const pendingRequests = requests.filter((request) => request.status === TimeOffRequestStatus.Pending);

  return (
    <PendingApprovalList
      requests={pendingRequests}
      allRequests={requests}
      locationLabels={LOCATION_LABELS}
    />
  );
}
