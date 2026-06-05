'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/shared/components/toast';

import { formatDayCount } from '../api/date-range';
import { cancelRequest, fetchBalance, HcmRequestError } from '../api/hcm-client';
import { timeOffKeys } from '../api/query-keys';
import type { Balance, BalanceCell, TimeOffRequest } from '../api/types';

function writeBalanceToCorpus(balances: Balance[] | undefined, authoritative: Balance) {
  if (!balances) return balances;

  return balances.map((balance) =>
    balance.employeeId === authoritative.employeeId && balance.locationId === authoritative.locationId
      ? authoritative
      : balance,
  );
}

export function useCancelRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<TimeOffRequest, Error, TimeOffRequest>({
    mutationFn: async (request) => {
      const cell: BalanceCell = {
        employeeId: request.employeeId,
        locationId: request.locationId,
      };
      const authoritative = await fetchBalance(cell);
      return cancelRequest(request.id, {
        expectedBalanceVersion: authoritative.version,
      });
    },

    onSuccess: async (updated, request) => {
      const cell: BalanceCell = {
        employeeId: request.employeeId,
        locationId: request.locationId,
      };
      const authoritative = await fetchBalance(cell);
      queryClient.setQueryData(timeOffKeys.balance(cell), authoritative);
      queryClient.setQueryData<Balance[]>(timeOffKeys.balances(), (balances) =>
        writeBalanceToCorpus(balances, authoritative),
      );
      await queryClient.invalidateQueries({
        queryKey: timeOffKeys.requests(),
      });
      toast({
        variant: 'default',
        title: 'Request cancelled',
        description: `${formatDayCount(updated.days)} returned to your balance.`,
      });
    },

    onError: (error) => {
      const description =
        error instanceof HcmRequestError
          ? error.body.message
          : 'Could not reach the HCM. Please try again.';
      toast({ variant: 'error', title: 'Cancellation failed', description });
    },
  });
}
