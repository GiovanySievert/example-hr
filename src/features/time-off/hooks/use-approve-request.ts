'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/shared/components/toast';

import { approveRequest, fetchBalance, HcmRequestError } from '../api/hcm-client';
import { timeOffKeys } from '../api/query-keys';
import type { BalanceCell, TimeOffRequest } from '../api/types';

export function useApproveRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<TimeOffRequest, Error, TimeOffRequest>({
    mutationFn: (request) => approveRequest(request.id),

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
        variant: 'success',
        title: 'Request approved',
        description: `${updated.days} day(s) approved.`,
      });
    },

    onError: (error) => {
      const description =
        error instanceof HcmRequestError
          ? error.body.message
          : 'Could not reach the HCM. Please try again.';
      toast({ variant: 'error', title: 'Approval failed', description });
    },
  });
}
