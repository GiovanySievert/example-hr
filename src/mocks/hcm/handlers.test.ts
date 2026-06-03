import { beforeEach, describe, expect, it } from 'vitest';

import type { Balance, HcmError } from '@/features/time-off/api/types';

import { hcmStore, resetHcmStore } from './store';
import { setLatencyEnabled } from './latency';

const CELL = { employeeId: 'e1', locationId: 'us' };

beforeEach(() => {
  resetHcmStore();
  setLatencyEnabled(false);
});

async function getBalance(employeeId: string, locationId: string) {
  const res = await fetch(
    `/api/hcm/balance?employeeId=${employeeId}&locationId=${locationId}`,
  );
  return res;
}

async function fileRequest(body: {
  employeeId: string;
  locationId: string;
  days: number;
  expectedVersion: number;
}) {
  return fetch('/api/hcm/balance', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
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
      pending: 0,
      version: 1,
    });
  });

  it('400 when params are missing', async () => {
    const res = await fetch('/api/hcm/balance');
    expect(res.status).toBe(400);
    expect(((await res.json()) as HcmError).code).toBe('invalid-request');
  });

  it('404 for an unknown cell', async () => {
    const res = await getBalance('nobody', 'mars');
    expect(res.status).toBe(404);
    expect(((await res.json()) as HcmError).code).toBe('not-found');
  });
});

describe('GET /api/hcm/balances (corpus)', () => {
  it('returns every row', async () => {
    const res = await fetch('/api/hcm/balances');
    expect(res.status).toBe(200);
    const balances = (await res.json()) as Balance[];
    expect(balances).toHaveLength(3);
  });
});

describe('POST /api/hcm/balance (write)', () => {
  it('success: moves available → pending and bumps version', async () => {
    const res = await fileRequest({ ...CELL, days: 3, expectedVersion: 1 });
    expect(res.status).toBe(200);
    const balance = (await res.json()) as Balance;
    expect(balance.available).toBe(9);
    expect(balance.pending).toBe(3);
    expect(balance.version).toBe(2);
  });

  it('conflict: expectedVersion does not match', async () => {
    const res = await fileRequest({ ...CELL, days: 1, expectedVersion: 99 });
    expect(res.status).toBe(409);
    const error = (await res.json()) as HcmError;
    expect(error.code).toBe('conflict');
    expect(error.current?.version).toBe(1);
  });

  it('insufficient-balance: days exceed available', async () => {
    const res = await fileRequest({ ...CELL, days: 999, expectedVersion: 1 });
    expect(res.status).toBe(422);
    expect(((await res.json()) as HcmError).code).toBe('insufficient-balance');
  });

  it('invalid-request: non-positive days', async () => {
    const res = await fileRequest({ ...CELL, days: 0, expectedVersion: 1 });
    expect(res.status).toBe(400);
    expect(((await res.json()) as HcmError).code).toBe('invalid-request');
  });

  it('silent-wrong (injected): 200 but balance did not move', async () => {
    hcmStore.setNextWriteBehavior(CELL, 'silent-wrong');
    const res = await fileRequest({ ...CELL, days: 3, expectedVersion: 1 });
    expect(res.status).toBe(200);
    const balance = (await res.json()) as Balance;
    expect(balance.available).toBe(12);
    expect(balance.pending).toBe(0);
    expect(balance.version).toBe(1);

    const reread = (await (await getBalance('e1', 'us')).json()) as Balance;
    expect(reread.available).toBe(12);
  });

  it('conflict (injected) regardless of version', async () => {
    hcmStore.setNextWriteBehavior(CELL, 'conflict');
    const res = await fileRequest({ ...CELL, days: 1, expectedVersion: 1 });
    expect(res.status).toBe(409);
  });

  it('insufficient-balance (injected) regardless of amount', async () => {
    hcmStore.setNextWriteBehavior(CELL, 'insufficient-balance');
    const res = await fileRequest({ ...CELL, days: 1, expectedVersion: 1 });
    expect(res.status).toBe(422);
  });

  it('injection is consumed once', async () => {
    hcmStore.setNextWriteBehavior(CELL, 'conflict');
    expect((await fileRequest({ ...CELL, days: 1, expectedVersion: 1 })).status).toBe(409);
    expect((await fileRequest({ ...CELL, days: 1, expectedVersion: 1 })).status).toBe(200);
  });
});

describe('manager decisions', () => {
  it('approve: clears pending and bumps version', async () => {
    const res = await fetch('/api/hcm/requests/r1/approve', {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    const after = hcmStore.getBalance(CELL)!;
    expect(after.pending).toBe(0);
    expect(after.version).toBe(2);
    expect(hcmStore.getRequest('r1')?.status).toBe('approved');
  });

  it('deny: returns days to available', async () => {
    const res = await fetch('/api/hcm/requests/r1/deny', {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    const after = hcmStore.getBalance(CELL)!;
    expect(after.available).toBe(14);
    expect(after.pending).toBe(0);
    expect(hcmStore.getRequest('r1')?.status).toBe('denied');
  });

  it('approve on already-decided request → conflict', async () => {
    await fetch('/api/hcm/requests/r1/approve', { method: 'POST' });
    const res = await fetch('/api/hcm/requests/r1/approve', {
      method: 'POST',
    });
    expect(res.status).toBe(409);
  });

  it('approve unknown request → 404', async () => {
    const res = await fetch('/api/hcm/requests/nope/approve', {
      method: 'POST',
    });
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

describe('variable latency', () => {
  it('resolves the read even with latency enabled', async () => {
    setLatencyEnabled(true);
    const res = await getBalance('e1', 'us');
    expect(res.status).toBe(200);
  });
});
