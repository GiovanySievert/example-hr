'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchRequests } from '../api/hcm-client';
import { timeOffKeys } from '../api/query-keys';

export function useRequests() {
  return useQuery({
    queryKey: timeOffKeys.requests(),
    queryFn: fetchRequests,
  });
}
