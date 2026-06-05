'use client';

import { useEffect, useRef, useState } from 'react';

import { useBalance } from '../hooks/use-balance';
import { useApproveRequest } from '../hooks/use-approve-request';
import { useDenyRequest } from '../hooks/use-deny-request';
import type { TimeOffRequest } from '../api/types';
import { PendingApprovalRow } from './pending-approval-row';

type PendingApprovalCardProps = {
  request: TimeOffRequest;
  locationLabel?: string;
  teamConflictSummary?: string;
  showEmployeeLabel?: boolean;
};

export function PendingApprovalCard({
  request,
  locationLabel,
  teamConflictSummary,
  showEmployeeLabel = true,
}: PendingApprovalCardProps) {
  const cell = {
    employeeId: request.employeeId,
    locationId: request.locationId,
  };
  const balanceQuery = useBalance(cell);
  const approve = useApproveRequest();
  const deny = useDenyRequest();

  const openedVersion = useRef<number | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const version = balanceQuery.data?.version;
    if (version === undefined) return;
    if (openedVersion.current === null) {
      openedVersion.current = version;
      return;
    }
    if (version > openedVersion.current) {
      setStale(true);
    }
  }, [balanceQuery.data?.version]);

  async function handleRefresh() {
    const refetched = await balanceQuery.refetch();
    if (refetched.data) {
      openedVersion.current = refetched.data.version;
      setStale(false);
    }
  }

  const deciding = approve.isPending || deny.isPending;

  return (
    <PendingApprovalRow
      request={request}
      balance={balanceQuery.data}
      locationLabel={locationLabel}
      balanceLoading={balanceQuery.isLoading}
      stale={stale}
      deciding={deciding}
      teamConflictSummary={teamConflictSummary}
      showEmployeeLabel={showEmployeeLabel}
      onApprove={() => approve.mutate(request)}
      onDeny={() => deny.mutate(request)}
      onRefresh={handleRefresh}
    />
  );
}
