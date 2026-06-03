'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchRequests } from '../api/hcm-client';
import { TimeOffRequestStatus } from '../api/enums';
import { timeOffKeys } from '../api/query-keys';

export function usePendingRequests() {
  return useQuery({
    queryKey: timeOffKeys.requests(),
    queryFn: fetchRequests,
    select: (requests) => requests.filter((r) => r.status === TimeOffRequestStatus.Pending),
  });
}
