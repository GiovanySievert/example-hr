import { beforeEach, describe, expect, it } from 'vitest';

import type { Balance, HcmError } from '@/features/time-off/api/types';
import { HcmErrorCode, TimeOffRequestStatus } from '@/features/time-off/api/enums';

import { WriteBehavior } from './enums';
import { hcmStore, resetHcmStore } from './store';
import { setLatencyEnabled } from './latency';

const CELL = { employeeId: 'e1', locationId: 'us' };

beforeEach(() => {
  resetHcmStore();
  setLatencyEnabled(false);
});

async function getBalance(employeeId: string, locationId: string) {
  const res = await fetch(`/api/hcm/balance?employeeId=${employeeId}&locationId=${locationId}`);
  return res;
}

async function fileRequest(body: {
  employeeId: string;
  locationId: string;
  startDate?: string;
  endDate?: string;
  days: number;
  expectedVersion: number;
}) {
  return fetch('/api/hcm/balance', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      startDate: '2026-06-12',
      endDate: '2026-06-16',
      ...body,
    }),
  });
}

async function decideRequest(
  id: string,
  decision: 'approve' | 'deny' | 'cancel',
  expectedBalanceVersion = 1,
) {
  return fetch(`/api/hcm/requests/${id}/${decision}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ expectedBalanceVersion }),
  });
}

describe('GET /api/hcm/balance (per-cell read)', () => {
  it('returns the authoritative cell', async () => {
    const res = await getBalance('e1', 'us');
    expect(res.status).toBe(200);
    const balance = (await res.json()) as Balance;
    expect(balance).toMatchObject({
      employeeId: 'e1',
      locationId: 'us',
      available: 12,
      pending: 2,
      version: 1,
    });
  });

  it('400 when params are missing', async () => {
    const res = await fetch('/api/hcm/balance');
    expect(res.status).toBe(400);
    expect(((await res.json()) as HcmError).code).toBe(HcmErrorCode.InvalidRequest);
  });

  it('404 for an unknown cell', async () => {
    const res = await getBalance('nobody', 'mars');
    expect(res.status).toBe(404);
    expect(((await res.json()) as HcmError).code).toBe(HcmErrorCode.NotFound);
  });
});

describe('GET /api/hcm/balances (corpus)', () => {
  it('returns every row', async () => {
    const res = await fetch('/api/hcm/balances');
    expect(res.status).toBe(200);
    const balances = (await res.json()) as Balance[];
    expect(balances).toHaveLength(6);
  });
});

describe('POST /api/hcm/balance (write)', () => {
  it('success: moves available → pending and bumps version', async () => {
    const res = await fileRequest({ ...CELL, days: 3, expectedVersion: 1 });
    expect(res.status).toBe(200);
    const balance = (await res.json()) as Balance;
    expect(balance.available).toBe(9);
    expect(balance.pending).toBe(5);
    expect(balance.version).toBe(2);
  });

  it('conflict: expectedVersion does not match', async () => {
    const res = await fileRequest({ ...CELL, days: 1, expectedVersion: 99 });
    expect(res.status).toBe(409);
    const error = (await res.json()) as HcmError;
    expect(error.code).toBe(HcmErrorCode.Conflict);
    expect(error.current?.version).toBe(1);
  });

  it('insufficient-balance: days exceed available', async () => {
    const res = await fileRequest({ ...CELL, days: 999, expectedVersion: 1 });
    expect(res.status).toBe(422);
    expect(((await res.json()) as HcmError).code).toBe(HcmErrorCode.InsufficientBalance);
  });

  it('overlap: rejects an active request in the same employee date range', async () => {
    const res = await fileRequest({
      ...CELL,
      startDate: '2026-06-08',
      endDate: '2026-06-09',
      days: 2,
      expectedVersion: 1,
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as HcmError).code).toBe(HcmErrorCode.OverlappingRequest);
  });

  it('policy-violation: rejects requests longer than ten business days', async () => {
    const res = await fileRequest({
      ...CELL,
      startDate: '2026-06-12',
      endDate: '2026-06-27',
      days: 11,
      expectedVersion: 1,
    });
    expect(res.status).toBe(422);
    expect(((await res.json()) as HcmError).code).toBe(HcmErrorCode.PolicyViolation);
  });

  it('invalid-request: non-positive days', async () => {
    const res = await fileRequest({ ...CELL, days: 0, expectedVersion: 1 });
    expect(res.status).toBe(400);
    expect(((await res.json()) as HcmError).code).toBe(HcmErrorCode.InvalidRequest);
  });

  it('silent-wrong (injected): 200 but balance did not move', async () => {
    hcmStore.setNextWriteBehavior(CELL, WriteBehavior.SilentWrong);
    const res = await fileRequest({ ...CELL, days: 3, expectedVersion: 1 });
    expect(res.status).toBe(200);
    const balance = (await res.json()) as Balance;
    expect(balance.available).toBe(12);
    expect(balance.pending).toBe(2);
    expect(balance.version).toBe(1);

    const reread = (await (await getBalance('e1', 'us')).json()) as Balance;
    expect(reread.available).toBe(12);
  });

  it('silent-wrong pending mismatch (injected): 200 but pending did not move', async () => {
    hcmStore.setNextWriteBehavior(CELL, WriteBehavior.SilentWrongPendingMismatch);
    const res = await fileRequest({ ...CELL, days: 3, expectedVersion: 1 });
    expect(res.status).toBe(200);
    const balance = (await res.json()) as Balance;
    expect(balance.available).toBe(9);
    expect(balance.pending).toBe(2);
    expect(balance.version).toBe(2);
  });

  it('conflict (injected) regardless of version', async () => {
    hcmStore.setNextWriteBehavior(CELL, WriteBehavior.Conflict);
    const res = await fileRequest({ ...CELL, days: 1, expectedVersion: 1 });
    expect(res.status).toBe(409);
  });

  it('insufficient-balance (injected) regardless of amount', async () => {
    hcmStore.setNextWriteBehavior(CELL, WriteBehavior.InsufficientBalance);
    const res = await fileRequest({ ...CELL, days: 1, expectedVersion: 1 });
    expect(res.status).toBe(422);
  });

  it('injection is consumed once', async () => {
    hcmStore.setNextWriteBehavior(CELL, WriteBehavior.Conflict);
    expect((await fileRequest({ ...CELL, days: 1, expectedVersion: 1 })).status).toBe(409);
    expect((await fileRequest({ ...CELL, days: 1, expectedVersion: 1 })).status).toBe(200);
  });
});

describe('manager decisions', () => {
  it('approve: clears pending and bumps version', async () => {
    const res = await decideRequest('r1', 'approve');
    expect(res.status).toBe(200);
    const after = hcmStore.getBalance(CELL)!;
    expect(after.pending).toBe(0);
    expect(after.version).toBe(2);
    expect(hcmStore.getRequest('r1')?.status).toBe(TimeOffRequestStatus.Approved);
  });

  it('deny: returns days to available', async () => {
    const res = await decideRequest('r1', 'deny');
    expect(res.status).toBe(200);
    const after = hcmStore.getBalance(CELL)!;
    expect(after.available).toBe(14);
    expect(after.pending).toBe(0);
    expect(hcmStore.getRequest('r1')?.status).toBe(TimeOffRequestStatus.Denied);
  });

  it('cancel: returns days to available and marks the request cancelled', async () => {
    const res = await decideRequest('r1', 'cancel');
    expect(res.status).toBe(200);
    const after = hcmStore.getBalance(CELL)!;
    expect(after.available).toBe(14);
    expect(after.pending).toBe(0);
    expect(hcmStore.getRequest('r1')?.status).toBe(TimeOffRequestStatus.Cancelled);
  });

  it('approve on already-decided request → conflict', async () => {
    await decideRequest('r1', 'approve');
    const res = await decideRequest('r1', 'approve', 2);
    expect(res.status).toBe(409);
  });

  it('approve with an old balance version → conflict', async () => {
    hcmStore.applyAnniversaryBonus(CELL, 5);

    const res = await decideRequest('r1', 'approve', 1);

    expect(res.status).toBe(409);
    const error = (await res.json()) as HcmError;
    expect(error.code).toBe(HcmErrorCode.Conflict);
    expect(error.current?.version).toBe(2);
    expect(hcmStore.getRequest('r1')?.status).toBe(TimeOffRequestStatus.Pending);
  });

  it('approve unknown request → 404', async () => {
    const res = await decideRequest('nope', 'approve');
    expect(res.status).toBe(404);
  });
});

describe('anniversary bonus trigger', () => {
  it('raises available and version on an open cell', async () => {
    const before = (await (await getBalance('e1', 'us')).json()) as Balance;
    hcmStore.applyAnniversaryBonus(CELL, 5);
    const after = (await (await getBalance('e1', 'us')).json()) as Balance;
    expect(after.available).toBe(before.available + 5);
    expect(after.version).toBe(before.version + 1);
  });
});

describe('birthday bonus trigger', () => {
  it('credits every cell of the employee whose birthday matches, and no one else', async () => {
    const e2UsBefore = (await (await getBalance('e2', 'us')).json()) as Balance;
    const e2DeBefore = (await (await getBalance('e2', 'de')).json()) as Balance;
    const e1Before = (await (await getBalance('e1', 'us')).json()) as Balance;

    const credited = hcmStore.applyBirthdayBonuses('06-05', 1);

    expect(credited.map((balance) => `${balance.employeeId}:${balance.locationId}`).sort()).toEqual([
      'e2:de',
      'e2:us',
    ]);

    const e2UsAfter = (await (await getBalance('e2', 'us')).json()) as Balance;
    const e2DeAfter = (await (await getBalance('e2', 'de')).json()) as Balance;
    const e1After = (await (await getBalance('e1', 'us')).json()) as Balance;

    expect(e2UsAfter.available).toBe(e2UsBefore.available + 1);
    expect(e2UsAfter.version).toBe(e2UsBefore.version + 1);
    expect(e2DeAfter.available).toBe(e2DeBefore.available + 1);
    expect(e1After.available).toBe(e1Before.available);
    expect(e1After.version).toBe(e1Before.version);
  });

  it('credits nobody when no birthday matches', () => {
    expect(hcmStore.applyBirthdayBonuses('01-01', 1)).toEqual([]);
  });
});

describe('variable latency', () => {
  it('resolves the read even with latency enabled', async () => {
    setLatencyEnabled(true);
    const res = await getBalance('e1', 'us');
    expect(res.status).toBe(200);
  });
});
