'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';

import { useToast } from '@/shared/components/toast';

import { formatDayCount } from '../api/date-range';
import { toCell } from '../api/cell-key';
import { fetchBalance, fileTimeOff, HcmRequestError } from '../api/hcm-client';
import { TimeOffRequestStatus } from '../api/enums';
import { timeOffKeys } from '../api/query-keys';
import type { Balance, BalanceCell } from '../api/types';
import {
  addRolledBackRequestAtom,
  clearCellInFlightAtom,
  markCellInFlightAtom,
  type RevertedTimeOffRequest,
} from '../state';
import { readCachedBalance, writeBalanceEverywhere } from './balance-cache';

type FileTimeOffVariables = BalanceCell & {
  startDate: string;
  endDate: string;
  days: number;
};

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
  const expectedPending = before.pending + days;
  return (
    authoritative.available !== expectedAvailable ||
    authoritative.pending !== expectedPending ||
    authoritative.version <= before.version
  );
}

function makeRolledBackRequest({
  employeeId,
  locationId,
  startDate,
  endDate,
  days,
}: FileTimeOffVariables) {
  const now = new Date().toISOString();
  return {
    id: `reverted-${employeeId}-${locationId}-${Date.now()}`,
    employeeId,
    locationId,
    startDate,
    endDate,
    days,
    status: TimeOffRequestStatus.Pending,
    createdAt: now,
    updatedAt: now,
    reverted: true,
  } satisfies RevertedTimeOffRequest;
}

export function useFileTimeOff() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const markInFlight = useSetAtom(markCellInFlightAtom);
  const clearInFlight = useSetAtom(clearCellInFlightAtom);
  const addRolledBackRequest = useSetAtom(addRolledBackRequestAtom);

  return useMutation<Balance, Error, FileTimeOffVariables, MutationContext>({
    mutationFn: async ({ employeeId, locationId, startDate, endDate, days }) => {
      const cell = toCell({ employeeId, locationId });
      const current = readCachedBalance(queryClient, cell) ?? (await fetchBalance(cell));
      const expectedVersion = current.version;
      return fileTimeOff({ employeeId, locationId, startDate, endDate, days, expectedVersion });
    },

    onMutate: async (variables) => {
      const cell = toCell(variables);
      await queryClient.cancelQueries({ queryKey: timeOffKeys.balance(cell) });
      await queryClient.cancelQueries({ queryKey: timeOffKeys.balances() });

      const previous = readCachedBalance(queryClient, cell);
      if (previous) {
        writeBalanceEverywhere(queryClient, applyOptimisticDelta(previous, variables.days));
      }
      markInFlight(cell);
      return { previous };
    },

    onError: (error, variables, context) => {
      if (context?.previous) {
        writeBalanceEverywhere(queryClient, context.previous);
      }
      if (error instanceof HcmRequestError && error.body.current) {
        writeBalanceEverywhere(queryClient, error.body.current);
      }

      const description =
        error instanceof HcmRequestError
          ? error.body.message
          : 'Could not reach the HCM. Please try again.';

      addRolledBackRequest(makeRolledBackRequest(variables));
      toast({
        variant: 'error',
        title: 'Request not filed',
        description,
      });
    },

    onSuccess: async (_data, variables, context) => {
      const authoritative = await fetchBalance(toCell(variables));

      const before = context?.previous;
      if (before && isSilentlyWrong(before, authoritative, variables.days)) {
        writeBalanceEverywhere(queryClient, authoritative);
        addRolledBackRequest(makeRolledBackRequest(variables));
        toast({
          variant: 'error',
          title: 'Request could not be confirmed',
          description:
            'The HCM reported success but the balance changed incoherently. Your request was reverted.',
        });
        return;
      }

      writeBalanceEverywhere(queryClient, authoritative);
      await queryClient.invalidateQueries({
        queryKey: timeOffKeys.requests(),
      });
      toast({
        variant: 'success',
        title: 'Request filed',
        description: `${formatDayCount(variables.days)} submitted for approval.`,
      });
    },

    onSettled: (_data, _error, variables) => {
      clearInFlight(toCell(variables));
    },
  });
}
