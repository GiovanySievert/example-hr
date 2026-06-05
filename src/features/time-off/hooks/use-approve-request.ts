'use client';

import { approveRequest } from '../api/hcm-client';
import { decisionDescription, useRequestDecision } from './use-request-decision';

export function useApproveRequest() {
  return useRequestDecision({
    action: approveRequest,
    errorTitle: 'Approval failed',
    success: {
      variant: 'success',
      title: 'Request approved',
      description: decisionDescription('approved.'),
    },
  });
}
