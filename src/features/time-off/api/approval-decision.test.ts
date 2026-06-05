import { describe, expect, it } from 'vitest';

import { isApproveDisabled, isInsufficientBalance } from './approval-decision';
import type { Balance } from './types';

const BALANCE: Balance = {
  employeeId: 'e1',
  locationId: 'us',
  available: 5,
  pending: 0,
  version: 1,
  updatedAt: '2026-06-03T00:00:00.000Z',
};

describe('isInsufficientBalance', () => {
  it('is false when the balance has not loaded yet', () => {
    expect(isInsufficientBalance({ days: 3 }, undefined)).toBe(false);
  });

  it('is false when the request fits the available balance', () => {
    expect(isInsufficientBalance({ days: 5 }, BALANCE)).toBe(false);
  });

  it('is true when the request exceeds the available balance', () => {
    expect(isInsufficientBalance({ days: 6 }, BALANCE)).toBe(true);
  });
});

describe('isApproveDisabled', () => {
  const base = {
    balance: BALANCE,
    days: 3,
    deciding: false,
    stale: false,
    balanceLoading: false,
  };

  it('is enabled for a fresh, sufficient, idle request', () => {
    expect(isApproveDisabled(base)).toBe(false);
  });

  it('is disabled while deciding', () => {
    expect(isApproveDisabled({ ...base, deciding: true })).toBe(true);
  });

  it('is disabled when the balance is stale', () => {
    expect(isApproveDisabled({ ...base, stale: true })).toBe(true);
  });

  it('is disabled while the balance is loading', () => {
    expect(isApproveDisabled({ ...base, balanceLoading: true })).toBe(true);
  });

  it('is disabled when the request exceeds the available balance', () => {
    expect(isApproveDisabled({ ...base, days: 6 })).toBe(true);
  });

  it('is disabled when no balance has been read', () => {
    expect(isApproveDisabled({ ...base, balance: undefined })).toBe(true);
  });
});
