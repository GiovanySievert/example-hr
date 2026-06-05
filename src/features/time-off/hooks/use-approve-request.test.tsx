import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { hcmStore, resetHcmStore, setLatencyEnabled } from '@/mocks/hcm';

import { timeOffKeys } from '../api/query-keys';
import type { Balance, TimeOffRequest } from '../api/types';
import { TimeOffRequestStatus } from '../api/enums';
import { useApproveRequest } from './use-approve-request';
import { useDenyRequest } from './use-deny-request';
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

describe('useApproveRequest', () => {
  it('approves and writes the re-read authoritative balance into the cell cache', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useApproveRequest(), {
      wrapper: Wrapper,
    });

    result.current.mutate(REQUEST);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<Balance>(timeOffKeys.balance(REQUEST));
    expect(cached?.pending).toBe(0);
    expect(hcmStore.getRequest('r1')?.status).toBe(TimeOffRequestStatus.Approved);
  });

  it('re-reads the balance before approving instead of trusting a stale cache', async () => {
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData<Balance>(timeOffKeys.balance(REQUEST), {
      employeeId: 'e1',
      locationId: 'us',
      available: 12,
      pending: 2,
      version: 1,
      updatedAt: '2026-06-03T00:00:00.000Z',
    });
    hcmStore.applyAnniversaryBonus(REQUEST, 5);

    const { result } = renderHook(() => useApproveRequest(), {
      wrapper: Wrapper,
    });

    result.current.mutate(REQUEST);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<Balance>(timeOffKeys.balance(REQUEST));
    expect(cached?.available).toBe(17);
    expect(cached?.version).toBe(3);
  });

  it('surfaces an error when the request is no longer pending', async () => {
    hcmStore.approveRequest('r1');
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApproveRequest(), {
      wrapper: Wrapper,
    });

    result.current.mutate(REQUEST);
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useDenyRequest', () => {
  it('denies and returns the days to the cell balance', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useDenyRequest(), { wrapper: Wrapper });

    result.current.mutate(REQUEST);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<Balance>(timeOffKeys.balance(REQUEST));
    expect(cached?.available).toBe(14);
    expect(hcmStore.getRequest('r1')?.status).toBe(TimeOffRequestStatus.Denied);
  });
});
