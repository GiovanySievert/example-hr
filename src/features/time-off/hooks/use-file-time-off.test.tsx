import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { hcmStore, resetHcmStore, setLatencyEnabled } from '@/mocks/hcm';

import { fetchBalance } from '../api/hcm-client';
import { timeOffKeys } from '../api/query-keys';
import type { Balance } from '../api/types';
import { useFileTimeOff } from './use-file-time-off';
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
    expect(cached?.pending).toBe(3);
    expect(cached?.version).toBe(2);
  });

  it('rolls back to the authoritative cell on conflict', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const before = await seedCellCache(queryClient);
    hcmStore.setNextWriteBehavior(CELL, 'conflict');

    const { result } = renderHook(() => useFileTimeOff(), { wrapper: Wrapper });
    result.current.mutate({ ...CELL, days: 1 });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<Balance>(timeOffKeys.balance(CELL));
    expect(cached?.available).toBe(before.available);
    expect(cached?.pending).toBe(before.pending);
  });

  it('rolls back on insufficient-balance', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const before = await seedCellCache(queryClient);
    hcmStore.setNextWriteBehavior(CELL, 'insufficient-balance');

    const { result } = renderHook(() => useFileTimeOff(), { wrapper: Wrapper });
    result.current.mutate({ ...CELL, days: 1 });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<Balance>(timeOffKeys.balance(CELL));
    expect(cached?.available).toBe(before.available);
  });

  it('detects silent-wrong: success response but authoritative re-read contradicts, reverts', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const before = await seedCellCache(queryClient);
    hcmStore.setNextWriteBehavior(CELL, 'silent-wrong');

    const { result } = renderHook(() => useFileTimeOff(), { wrapper: Wrapper });
    result.current.mutate({ ...CELL, days: 3 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<Balance>(timeOffKeys.balance(CELL));
    expect(cached?.available).toBe(before.available);
    expect(cached?.pending).toBe(before.pending);
    expect(cached?.version).toBe(before.version);
  });
});
