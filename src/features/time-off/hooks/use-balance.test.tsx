import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetHcmStore, setLatencyEnabled } from '@/mocks/hcm';

import { TimeOffRequestStatus } from '../api/enums';
import { useBalance } from './use-balance';
import { useBalances } from './use-balances';
import { usePendingRequests } from './use-pending-requests';
import { createWrapper } from './test-utils';

beforeEach(() => {
  resetHcmStore();
  setLatencyEnabled(false);
});

describe('balance query hooks', () => {
  it('useBalance reads a single authoritative cell', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBalance({ employeeId: 'e1', locationId: 'us' }), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.available).toBe(12);
  });

  it('useBalances reads the full corpus', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBalances(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
  });

  it('usePendingRequests filters to pending only', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePendingRequests(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.every((r) => r.status === TimeOffRequestStatus.Pending)).toBe(true);
  });
});
