'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchBalances } from '../api/hcm-client';
import { timeOffKeys } from '../api/query-keys';

export function useBalances() {
  return useQuery({
    queryKey: timeOffKeys.balances(),
    queryFn: fetchBalances,
  });
}
