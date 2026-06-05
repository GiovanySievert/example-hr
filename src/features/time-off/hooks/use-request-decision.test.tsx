import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { hcmStore, resetHcmStore, setLatencyEnabled } from '@/mocks/hcm';
import { server } from '@/mocks/server';
import { toastsAtom } from '@/shared/components/toast';

import { TimeOffRequestStatus } from '../api/enums';
import type { TimeOffRequest } from '../api/types';
import { useDenyRequest } from './use-deny-request';
import { createWrapper } from './test-utils';

const REQUEST: TimeOffRequest = {
  id: 'r1',
  employeeId: 'e1',
  locationId: 'us',
  days: 2,
  status: TimeOffRequestStatus.Pending,
  createdAt: '2026-06-03T00:00:00.000Z',
  updatedAt: '2026-06-03T00:00:00.000Z',
};

beforeEach(() => {
  resetHcmStore();
  setLatencyEnabled(false);
});

describe('useDenyRequest (via useRequestDecision)', () => {
  it('denies and toasts a default-variant confirmation with the day count', async () => {
    const { Wrapper, store } = createWrapper();
    const { result } = renderHook(() => useDenyRequest(), { wrapper: Wrapper });

    result.current.mutate(REQUEST);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(hcmStore.getRequest('r1')?.status).toBe(TimeOffRequestStatus.Denied);
    const toasts = store.get(toastsAtom);
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({
      variant: 'default',
      title: 'Request denied',
      description: '2 days returned to the balance.',
    });
  });

  it('surfaces the HCM message when the request is no longer pending', async () => {
    hcmStore.denyRequest('r1');
    const { Wrapper, store } = createWrapper();
    const { result } = renderHook(() => useDenyRequest(), { wrapper: Wrapper });

    result.current.mutate(REQUEST);
    await waitFor(() => expect(result.current.isError).toBe(true));

    const toasts = store.get(toastsAtom);
    expect(toasts[0]).toMatchObject({ variant: 'error', title: 'Denial failed' });
    expect(toasts[0].description).not.toMatch(/Could not reach the HCM/);
  });

  it('falls back to a generic message when the HCM is unreachable', async () => {
    server.use(http.get('/api/hcm/balance', () => HttpResponse.error()));

    const { Wrapper, store } = createWrapper();
    const { result } = renderHook(() => useDenyRequest(), { wrapper: Wrapper });

    result.current.mutate(REQUEST);
    await waitFor(() => expect(result.current.isError).toBe(true));

    const toasts = store.get(toastsAtom);
    expect(toasts[0]).toMatchObject({
      variant: 'error',
      title: 'Denial failed',
      description: 'Could not reach the HCM. Please try again.',
    });
  });
});
