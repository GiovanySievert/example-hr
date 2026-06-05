'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/shared/components/toast';

import { formatDayCount } from '../api/date-range';
import { denyRequest, fetchBalance, HcmRequestError } from '../api/hcm-client';
import { timeOffKeys } from '../api/query-keys';
import type { BalanceCell, TimeOffRequest } from '../api/types';

export function useDenyRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<TimeOffRequest, Error, TimeOffRequest>({
    mutationFn: async (request) => {
      const cell: BalanceCell = {
        employeeId: request.employeeId,
        locationId: request.locationId,
      };
      const authoritative = await fetchBalance(cell);
      return denyRequest(request.id, {
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
      await queryClient.invalidateQueries({
        queryKey: timeOffKeys.requests(),
      });
      toast({
        variant: 'default',
        title: 'Request denied',
        description: `${formatDayCount(updated.days)} returned to the balance.`,
      });
    },

    onError: (error) => {
      const description =
        error instanceof HcmRequestError
          ? error.body.message
          : 'Could not reach the HCM. Please try again.';
      toast({ variant: 'error', title: 'Denial failed', description });
    },
  });
}
