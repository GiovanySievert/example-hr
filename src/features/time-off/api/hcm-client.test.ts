import { beforeEach, describe, expect, it } from 'vitest';

import { resetHcmStore, setLatencyEnabled } from '@/mocks/hcm';

import { HcmErrorCode, TimeOffRequestStatus } from './enums';
import {
  approveRequest,
  cancelRequest,
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
        startDate: '2026-06-08',
        endDate: '2026-06-08',
        days: 1,
        expectedVersion: 99,
      }),
    ).rejects.toMatchObject({
      name: 'HcmRequestError',
      status: 409,
      body: { code: HcmErrorCode.Conflict },
    });
  });

  it('throws HcmRequestError on a missing cell read', async () => {
    await expect(fetchBalance({ employeeId: 'nobody', locationId: 'mars' })).rejects.toBeInstanceOf(
      HcmRequestError,
    );
  });

  it('approves and denies requests', async () => {
    const beforeApprove = await fetchBalance({ employeeId: 'e1', locationId: 'us' });
    const approved = await approveRequest('r1', {
      expectedBalanceVersion: beforeApprove.version,
    });
    expect(approved.status).toBe(TimeOffRequestStatus.Approved);

    resetHcmStore();
    const beforeDeny = await fetchBalance({ employeeId: 'e1', locationId: 'us' });
    const denied = await denyRequest('r1', {
      expectedBalanceVersion: beforeDeny.version,
    });
    expect(denied.status).toBe(TimeOffRequestStatus.Denied);

    resetHcmStore();
    const beforeCancel = await fetchBalance({ employeeId: 'e1', locationId: 'us' });
    const cancelled = await cancelRequest('r1', {
      expectedBalanceVersion: beforeCancel.version,
    });
    expect(cancelled.status).toBe(TimeOffRequestStatus.Cancelled);
  });
});
