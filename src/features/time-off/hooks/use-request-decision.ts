'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast, type ToastVariant } from '@/shared/components/toast';

import { formatDayCount } from '../api/date-range';
import { toCell } from '../api/cell-key';
import { fetchBalance, HcmRequestError } from '../api/hcm-client';
import { timeOffKeys } from '../api/query-keys';
import type { DecisionPayload, TimeOffRequest } from '../api/types';
import { writeBalanceEverywhere } from './balance-cache';

type DecisionAction = (id: string, payload: DecisionPayload) => Promise<TimeOffRequest>;

type SuccessToast = {
  variant: ToastVariant;
  title: string;
  description: (request: TimeOffRequest) => string;
};

type UseRequestDecisionOptions = {
  action: DecisionAction;
  errorTitle: string;
  success: SuccessToast;
  syncCorpus?: boolean;
};

export function useRequestDecision({
  action,
  errorTitle,
  success,
  syncCorpus = false,
}: UseRequestDecisionOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<TimeOffRequest, Error, TimeOffRequest>({
    mutationFn: async (request) => {
      const authoritative = await fetchBalance(toCell(request));
      return action(request.id, { expectedBalanceVersion: authoritative.version });
    },

    onSuccess: async (updated, request) => {
      const cell = toCell(request);
      const authoritative = await fetchBalance(cell);
      if (syncCorpus) {
        writeBalanceEverywhere(queryClient, authoritative);
      } else {
        queryClient.setQueryData(timeOffKeys.balance(cell), authoritative);
      }
      await queryClient.invalidateQueries({ queryKey: timeOffKeys.requests() });
      toast({
        variant: success.variant,
        title: success.title,
        description: success.description(updated),
      });
    },

    onError: (error) => {
      const description =
        error instanceof HcmRequestError
          ? error.body.message
          : 'Could not reach the HCM. Please try again.';
      toast({ variant: 'error', title: errorTitle, description });
    },
  });
}

export const decisionDescription = (suffix: string) => (request: TimeOffRequest) =>
  `${formatDayCount(request.days)} ${suffix}`;
