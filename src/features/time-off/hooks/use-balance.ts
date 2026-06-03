'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchBalance } from '../api/hcm-client';
import { timeOffKeys } from '../api/query-keys';
import type { BalanceCell } from '../api/types';

export function useBalance(cell: BalanceCell) {
  return useQuery({
    queryKey: timeOffKeys.balance(cell),
    queryFn: () => fetchBalance(cell),
  });
}
