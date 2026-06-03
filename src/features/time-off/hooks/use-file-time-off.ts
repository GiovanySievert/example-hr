'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';

import { useToast } from '@/shared/components/toast';

import { fetchBalance, fileTimeOff, HcmRequestError } from '../api/hcm-client';
import { timeOffKeys } from '../api/query-keys';
import type { Balance, BalanceCell } from '../api/types';
import { clearCellInFlightAtom, markCellInFlightAtom } from '../state';

type FileTimeOffVariables = BalanceCell & { days: number };

type MutationContext = {
  previous?: Balance;
};

function applyOptimisticDelta(balance: Balance, days: number): Balance {
  return {
    ...balance,
    available: balance.available - days,
    pending: balance.pending + days,
  };
}

function isSilentlyWrong(before: Balance, authoritative: Balance, days: number): boolean {
  const expectedAvailable = before.available - days;
  const movedCorrectly =
    authoritative.available === expectedAvailable && authoritative.version > before.version;
  return !movedCorrectly;
}

export function useFileTimeOff() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const markInFlight = useSetAtom(markCellInFlightAtom);
  const clearInFlight = useSetAtom(clearCellInFlightAtom);

  return useMutation<Balance, Error, FileTimeOffVariables, MutationContext>({
    mutationFn: async ({ employeeId, locationId, days }) => {
      const cell: BalanceCell = { employeeId, locationId };
      const current = queryClient.getQueryData<Balance>(timeOffKeys.balance(cell));
      const expectedVersion = current?.version ?? 0;
      return fileTimeOff({ employeeId, locationId, days, expectedVersion });
    },

    onMutate: async ({ employeeId, locationId, days }) => {
      const cell: BalanceCell = { employeeId, locationId };
      const key = timeOffKeys.balance(cell);
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<Balance>(key);
      if (previous) {
        queryClient.setQueryData<Balance>(key, applyOptimisticDelta(previous, days));
      }
      markInFlight(cell);
      return { previous };
    },

    onError: (error, { employeeId, locationId }, context) => {
      const cell: BalanceCell = { employeeId, locationId };
      const key = timeOffKeys.balance(cell);
      if (context?.previous) {
        queryClient.setQueryData<Balance>(key, context.previous);
      }

      if (error instanceof HcmRequestError && error.body.current) {
        queryClient.setQueryData<Balance>(key, error.body.current);
      }

      const description =
        error instanceof HcmRequestError
          ? error.body.message
          : 'Could not reach the HCM. Please try again.';

      toast({
        variant: 'error',
        title: 'Request not filed',
        description,
      });
    },

    onSuccess: async (_data, { employeeId, locationId, days }, context) => {
      const cell: BalanceCell = { employeeId, locationId };
      const key = timeOffKeys.balance(cell);
      const authoritative = await fetchBalance(cell);

      const before = context?.previous;
      if (before && isSilentlyWrong(before, authoritative, days)) {
        queryClient.setQueryData<Balance>(key, authoritative);
        toast({
          variant: 'error',
          title: 'Request could not be confirmed',
          description:
            'The HCM reported success but the balance did not change. Your request was reverted.',
        });
        return;
      }

      queryClient.setQueryData<Balance>(key, authoritative);
      await queryClient.invalidateQueries({
        queryKey: timeOffKeys.requests(),
      });
      toast({
        variant: 'success',
        title: 'Request filed',
        description: `${days} day(s) submitted for approval.`,
      });
    },

    onSettled: (_data, _error, { employeeId, locationId }) => {
      clearInFlight({ employeeId, locationId });
    },
  });
}
