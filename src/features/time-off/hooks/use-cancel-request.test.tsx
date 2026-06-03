import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { hcmStore, resetHcmStore, setLatencyEnabled } from '@/mocks/hcm';

import { timeOffKeys } from '../api/query-keys';
import type { Balance, TimeOffRequest } from '../api/types';
import { TimeOffRequestStatus } from '../api/enums';
import { useCancelRequest } from './use-cancel-request';
import { usePendingRequests } from './use-pending-requests';
import { createWrapper } from './test-utils';

const REQUEST: TimeOffRequest = {
  id: 'r1',
  employeeId: 'e1',
  locationId: 'us',
  days: 2,
  status: TimeOffRequestStatus.Pending,
  createdAt: '2026-06-03T00:00:00.000Z',
  updatedAt: '2026-06-03T00:00:00.000Z',
};

beforeEach(() => {
  resetHcmStore();
  setLatencyEnabled(false);
});

describe('useCancelRequest', () => {
  it('cancels a pending request, returns days to the balance, and refreshes pending requests', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () => ({
        cancelRequest: useCancelRequest(),
        pendingRequests: usePendingRequests(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.pendingRequests.data).toHaveLength(5));

    result.current.cancelRequest.mutate(REQUEST);

    await waitFor(() => expect(result.current.cancelRequest.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<Balance>(timeOffKeys.balance(REQUEST));
    expect(cached?.available).toBe(14);
    expect(cached?.pending).toBe(0);
    await waitFor(() => expect(result.current.pendingRequests.data).toHaveLength(4));
    expect(hcmStore.getRequest('r1')?.status).toBe(TimeOffRequestStatus.Cancelled);
  });
});
