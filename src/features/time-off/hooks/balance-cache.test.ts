import { describe, expect, it } from 'vitest';

import { timeOffKeys } from '../api/query-keys';
import type { Balance } from '../api/types';
import {
  isSameCell,
  readCachedBalance,
  writeBalanceEverywhere,
  writeBalanceToCorpus,
} from './balance-cache';
import { createTestQueryClient } from './test-utils';

const US: Balance = {
  employeeId: 'e1',
  locationId: 'us',
  available: 12,
  pending: 2,
  version: 1,
  updatedAt: '2026-06-03T00:00:00.000Z',
};

const DE: Balance = {
  employeeId: 'e1',
  locationId: 'de',
  available: 3,
  pending: 1,
  version: 1,
  updatedAt: '2026-06-03T00:00:00.000Z',
};

describe('isSameCell', () => {
  it('matches on employeeId and locationId', () => {
    expect(isSameCell(US, { employeeId: 'e1', locationId: 'us' })).toBe(true);
    expect(isSameCell(US, { employeeId: 'e1', locationId: 'de' })).toBe(false);
    expect(isSameCell(US, { employeeId: 'e2', locationId: 'us' })).toBe(false);
  });
});

describe('writeBalanceToCorpus', () => {
  it('returns the input unchanged when the corpus is undefined', () => {
    expect(writeBalanceToCorpus(undefined, US)).toBeUndefined();
  });

  it('replaces only the matching cell and leaves the rest', () => {
    const updated = { ...US, available: 10, pending: 4, version: 2 };
    const result = writeBalanceToCorpus([US, DE], updated);
    expect(result).toEqual([updated, DE]);
  });
});

describe('readCachedBalance', () => {
  it('prefers the per-cell cache', () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(timeOffKeys.balance(US), US);
    expect(readCachedBalance(queryClient, { employeeId: 'e1', locationId: 'us' })).toEqual(US);
  });

  it('falls back to the corpus when the per-cell cache is empty', () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(timeOffKeys.balances(), [US, DE]);
    expect(readCachedBalance(queryClient, { employeeId: 'e1', locationId: 'de' })).toEqual(DE);
  });

  it('returns undefined when neither cache has the cell', () => {
    const queryClient = createTestQueryClient();
    expect(readCachedBalance(queryClient, { employeeId: 'e9', locationId: 'us' })).toBeUndefined();
  });
});

describe('writeBalanceEverywhere', () => {
  it('writes the balance into both the per-cell and corpus caches', () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(timeOffKeys.balances(), [US, DE]);

    const updated = { ...US, available: 9, pending: 5, version: 3 };
    writeBalanceEverywhere(queryClient, updated);

    expect(queryClient.getQueryData<Balance>(timeOffKeys.balance(US))).toEqual(updated);
    expect(queryClient.getQueryData<Balance[]>(timeOffKeys.balances())).toEqual([updated, DE]);
  });
});
