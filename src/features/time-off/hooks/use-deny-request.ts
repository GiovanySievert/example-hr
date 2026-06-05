'use client';

import { denyRequest } from '../api/hcm-client';
import { decisionDescription, useRequestDecision } from './use-request-decision';

export function useDenyRequest() {
  return useRequestDecision({
    action: denyRequest,
    errorTitle: 'Denial failed',
    success: {
      variant: 'default',
      title: 'Request denied',
      description: decisionDescription('returned to the balance.'),
    },
  });
}
