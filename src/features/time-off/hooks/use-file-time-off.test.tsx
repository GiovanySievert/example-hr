import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { hcmStore, resetHcmStore, setLatencyEnabled, WriteBehavior } from '@/mocks/hcm';

import { fetchBalance } from '../api/hcm-client';
import { timeOffKeys } from '../api/query-keys';
import type { Balance } from '../api/types';
import { rolledBackRequestsAtom } from '../state';
import { useFileTimeOff } from './use-file-time-off';
import { usePendingRequests } from './use-pending-requests';
import { createWrapper } from './test-utils';

const CELL = { employeeId: 'e1', locationId: 'us' };

beforeEach(() => {
  resetHcmStore();
  setLatencyEnabled(false);
});

async function seedCellCache(queryClient: ReturnType<typeof createWrapper>['queryClient']) {
  const balance = await fetchBalance(CELL);
  queryClient.setQueryData(timeOffKeys.balance(CELL), balance);
  return balance;
}

describe('useFileTimeOff', () => {
  it('applies an optimistic delta and reconciles to the authoritative value on success', async () => {
    const { Wrapper, queryClient } = createWrapper();
    await seedCellCache(queryClient);

    const { result } = renderHook(() => useFileTimeOff(), { wrapper: Wrapper });

    result.current.mutate({ ...CELL, days: 3 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<Balance>(timeOffKeys.balance(CELL));
    expect(cached?.available).toBe(9);
    expect(cached?.pending).toBe(5);
    expect(cached?.version).toBe(2);
  });

  it('rolls back to the authoritative cell on conflict', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const before = await seedCellCache(queryClient);
    hcmStore.setNextWriteBehavior(CELL, WriteBehavior.Conflict);

    const { result } = renderHook(() => useFileTimeOff(), { wrapper: Wrapper });
    result.current.mutate({ ...CELL, days: 1 });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<Balance>(timeOffKeys.balance(CELL));
    expect(cached?.available).toBe(before.available);
    expect(cached?.pending).toBe(before.pending);
  });

  it('rolls back on insufficient-balance', async () => {
    const { Wrapper, queryClient, store } = createWrapper();
    const before = await seedCellCache(queryClient);
    hcmStore.setNextWriteBehavior(CELL, WriteBehavior.InsufficientBalance);

    const { result } = renderHook(() => useFileTimeOff(), { wrapper: Wrapper });
    result.current.mutate({ ...CELL, days: 1 });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<Balance>(timeOffKeys.balance(CELL));
    expect(cached?.available).toBe(before.available);
    expect(store.get(rolledBackRequestsAtom)).toMatchObject([
      { employeeId: CELL.employeeId, locationId: CELL.locationId, days: 1, reverted: true },
    ]);
  });

  it('detects silent-wrong: success response but authoritative re-read contradicts, reverts', async () => {
    const { Wrapper, queryClient, store } = createWrapper();
    const before = await seedCellCache(queryClient);
    hcmStore.setNextWriteBehavior(CELL, WriteBehavior.SilentWrong);

    const { result } = renderHook(() => useFileTimeOff(), { wrapper: Wrapper });
    result.current.mutate({ ...CELL, days: 3 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<Balance>(timeOffKeys.balance(CELL));
    expect(cached?.available).toBe(before.available);
    expect(cached?.pending).toBe(before.pending);
    expect(cached?.version).toBe(before.version);
    expect(store.get(rolledBackRequestsAtom)).toMatchObject([
      { employeeId: CELL.employeeId, locationId: CELL.locationId, days: 3, reverted: true },
    ]);
  });

  it('refreshes the request list after a confirmed filing', async () => {
    const { Wrapper, queryClient } = createWrapper();
    await seedCellCache(queryClient);

    const { result } = renderHook(
      () => ({
        fileTimeOff: useFileTimeOff(),
        pendingRequests: usePendingRequests(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.pendingRequests.data).toHaveLength(5));

    result.current.fileTimeOff.mutate({ ...CELL, days: 3 });

    await waitFor(() => expect(result.current.fileTimeOff.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.pendingRequests.data).toHaveLength(6));
    expect(
      result.current.pendingRequests.data?.some(
        (request) =>
          request.employeeId === CELL.employeeId &&
          request.locationId === CELL.locationId &&
          request.days === 3,
      ),
    ).toBe(true);
  });
});
