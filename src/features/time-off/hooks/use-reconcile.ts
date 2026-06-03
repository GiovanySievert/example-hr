'use client';

import { useEffect } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';

import { fetchBalances } from '../api/hcm-client';
import { timeOffKeys } from '../api/query-keys';
import type { Balance, BalanceCell } from '../api/types';
import {
  inFlightCellsAtom,
  markCellRefreshedAtom,
} from '../state';
import { cellKey } from '../api/cell-key';

type UseReconcileOptions = {
  intervalMs?: number;
  enabled?: boolean;
};

export function useReconcile(options: UseReconcileOptions = {}) {
  const { intervalMs = 30_000, enabled = true } = options;
  const queryClient = useQueryClient();
  const inFlight = useAtomValue(inFlightCellsAtom);
  const markRefreshed = useSetAtom(markCellRefreshedAtom);

  const query = useQuery({
    queryKey: timeOffKeys.balances(),
    queryFn: fetchBalances,
    refetchInterval: enabled ? intervalMs : false,
    enabled,
  });

  const corpus = query.data;

  useEffect(() => {
    if (!corpus) return;

    for (const incoming of corpus) {
      const cell: BalanceCell = {
        employeeId: incoming.employeeId,
        locationId: incoming.locationId,
      };
      const key = cellKey(cell);

      if (inFlight.has(key)) continue;

      const existing = queryClient.getQueryData<Balance>(
        timeOffKeys.balance(cell),
      );

      if (!existing) {
        queryClient.setQueryData<Balance>(timeOffKeys.balance(cell), incoming);
        continue;
      }

      if (incoming.version > existing.version) {
        queryClient.setQueryData<Balance>(timeOffKeys.balance(cell), incoming);
        markRefreshed(cell);
      }
    }
  }, [corpus, inFlight, queryClient, markRefreshed]);

  return query;
}
