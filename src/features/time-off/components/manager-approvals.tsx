'use client';

import { Typography } from '@/shared/components';

import { usePendingRequests } from '../hooks/use-pending-requests';
import { PendingApprovalList } from './pending-approval-list';

const LOCATION_LABELS: Record<string, string> = {
  us: 'United States',
  de: 'Germany',
  br: 'Brazil',
};

export function ManagerApprovals() {
  const requestsQuery = usePendingRequests();

  if (requestsQuery.isLoading) {
    return <Typography variant="muted">Loading requests…</Typography>;
  }

  return (
    <PendingApprovalList requests={requestsQuery.data ?? []} locationLabels={LOCATION_LABELS} />
  );
}
