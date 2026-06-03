import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { hcmStore, resetHcmStore, setLatencyEnabled } from '@/mocks/hcm';

import { fetchBalance } from '../api/hcm-client';
import { cellKey } from '../api/cell-key';
import { timeOffKeys } from '../api/query-keys';
import type { Balance } from '../api/types';
import { inFlightCellsAtom, refreshedCellsAtom } from '../state';
import { useReconcile } from './use-reconcile';
import { createTestQueryClient } from './test-utils';

const CELL = { employeeId: 'e1', locationId: 'us' };

beforeEach(() => {
  resetHcmStore();
  setLatencyEnabled(false);
});

function setup(store = createStore()) {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <JotaiProvider store={store}>{children}</JotaiProvider>
      </QueryClientProvider>
    );
  }
  return { Wrapper, queryClient, store };
}

describe('useReconcile', () => {
  it('applies a newer corpus version to an idle cell and marks it refreshed', async () => {
    const { Wrapper, queryClient, store } = setup();

    const initial = await fetchBalance(CELL);
    queryClient.setQueryData(timeOffKeys.balance(CELL), initial);

    hcmStore.applyAnniversaryBonus(CELL, 5);

    renderHook(() => useReconcile({ intervalMs: 50 }), { wrapper: Wrapper });

    await waitFor(() => {
      const cached = queryClient.getQueryData<Balance>(
        timeOffKeys.balance(CELL),
      );
      expect(cached?.available).toBe(initial.available + 5);
    });

    expect(store.get(refreshedCellsAtom).has(cellKey(CELL))).toBe(true);
  });

  it('does not overwrite a cell that has a mutation in flight', async () => {
    const store = createStore();
    const { Wrapper, queryClient } = setup(store);

    const initial = await fetchBalance(CELL);
    const optimistic: Balance = {
      ...initial,
      available: initial.available - 2,
      pending: initial.pending + 2,
    };
    queryClient.setQueryData(timeOffKeys.balance(CELL), optimistic);

    act(() => {
      store.set(inFlightCellsAtom, new Set([cellKey(CELL)]));
    });

    hcmStore.applyAnniversaryBonus(CELL, 5);

    renderHook(() => useReconcile({ intervalMs: 50 }), { wrapper: Wrapper });

    await waitFor(() => {
      expect(queryClient.getQueryData(timeOffKeys.balances())).toBeDefined();
    });

    const cached = queryClient.getQueryData<Balance>(timeOffKeys.balance(CELL));
    expect(cached?.available).toBe(optimistic.available);
    expect(cached?.pending).toBe(optimistic.pending);
  });

  it('ignores corpus rows that are not newer than the cached cell', async () => {
    const { Wrapper, queryClient } = setup();

    const initial = await fetchBalance(CELL);
    const localNewer: Balance = { ...initial, available: 999, version: 50 };
    queryClient.setQueryData(timeOffKeys.balance(CELL), localNewer);

    renderHook(() => useReconcile({ intervalMs: 50 }), { wrapper: Wrapper });

    await waitFor(() => {
      expect(queryClient.getQueryData(timeOffKeys.balances())).toBeDefined();
    });

    const cached = queryClient.getQueryData<Balance>(timeOffKeys.balance(CELL));
    expect(cached?.available).toBe(999);
    expect(cached?.version).toBe(50);
  });
});
