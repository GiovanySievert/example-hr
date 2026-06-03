import { beforeEach, describe, expect, it } from 'vitest';

import { resetHcmStore, setLatencyEnabled } from '@/mocks/hcm';

import {
  approveRequest,
  denyRequest,
  fetchBalance,
  fileTimeOff,
  HcmRequestError,
} from './hcm-client';

beforeEach(() => {
  resetHcmStore();
  setLatencyEnabled(false);
});

describe('hcm-client', () => {
  it('throws a typed HcmRequestError carrying the error body on conflict', async () => {
    await expect(
      fileTimeOff({
        employeeId: 'e1',
        locationId: 'us',
        days: 1,
        expectedVersion: 99,
      }),
    ).rejects.toMatchObject({
      name: 'HcmRequestError',
      status: 409,
      body: { code: 'conflict' },
    });
  });

  it('throws HcmRequestError on a missing cell read', async () => {
    await expect(
      fetchBalance({ employeeId: 'nobody', locationId: 'mars' }),
    ).rejects.toBeInstanceOf(HcmRequestError);
  });

  it('approves and denies requests', async () => {
    const approved = await approveRequest('r1');
    expect(approved.status).toBe('approved');

    resetHcmStore();
    const denied = await denyRequest('r1');
    expect(denied.status).toBe('denied');
  });
});
