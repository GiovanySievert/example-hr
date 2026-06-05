'use client';

import { cancelRequest } from '../api/hcm-client';
import { decisionDescription, useRequestDecision } from './use-request-decision';

export function useCancelRequest() {
  return useRequestDecision({
    action: cancelRequest,
    errorTitle: 'Cancellation failed',
    syncCorpus: true,
    success: {
      variant: 'default',
      title: 'Request cancelled',
      description: decisionDescription('returned to your balance.'),
    },
  });
}
