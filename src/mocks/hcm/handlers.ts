import { http, HttpResponse } from 'msw';

import type { Balance, FileTimeOffPayload, HcmError } from '@/features/time-off/api/types';

import { cellLatency, corpusLatency } from './latency';
import { hcmStore } from './store';

function hcmError(status: number, error: HcmError) {
  return HttpResponse.json(error, { status });
}

export const hcmHandlers = [
  http.get('/api/hcm/balance', async ({ request }) => {
    await cellLatency();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    const locationId = url.searchParams.get('locationId');
    if (!employeeId || !locationId) {
      return hcmError(400, {
        code: 'invalid-request',
        message: 'employeeId and locationId are required',
      });
    }
    const balance = hcmStore.getBalance({ employeeId, locationId });
    if (!balance) {
      return hcmError(404, {
        code: 'not-found',
        message: 'balance cell not found',
      });
    }
    return HttpResponse.json<Balance>(balance);
  }),

  http.get('/api/hcm/balances', async () => {
    await corpusLatency();
    return HttpResponse.json<Balance[]>(hcmStore.getBalances());
  }),

  http.post('/api/hcm/balance', async ({ request }) => {
    await cellLatency();
    const body = (await request.json()) as FileTimeOffPayload;
    const result = hcmStore.fileRequest({
      employeeId: body.employeeId,
      locationId: body.locationId,
      days: body.days,
      expectedVersion: body.expectedVersion,
    });

    switch (result.kind) {
      case 'success':
        return HttpResponse.json<Balance>(result.balance);
      case 'silent-wrong':
        return HttpResponse.json<Balance>(result.balance);
      case 'conflict':
        return hcmError(409, {
          code: 'conflict',
          message: 'balance version changed; re-read and retry',
          current: result.current,
        });
      case 'insufficient-balance':
        return hcmError(422, {
          code: 'insufficient-balance',
          message: 'not enough available balance',
          current: result.current,
        });
      case 'not-found':
        return hcmError(404, {
          code: 'not-found',
          message: 'balance cell not found',
        });
      case 'invalid-request':
        return hcmError(400, {
          code: 'invalid-request',
          message: 'days must be a positive integer',
        });
    }
  }),

  http.get('/api/hcm/requests', async () => {
    await cellLatency();
    return HttpResponse.json(hcmStore.getRequests());
  }),

  http.post('/api/hcm/requests/:id/approve', async ({ params }) => {
    await cellLatency();
    const result = hcmStore.approveRequest(String(params.id));
    if (result.kind === 'not-found') {
      return hcmError(404, { code: 'not-found', message: 'request not found' });
    }
    if (result.kind === 'conflict') {
      return hcmError(409, {
        code: 'conflict',
        message: 'request is no longer pending',
      });
    }
    return HttpResponse.json(result.request);
  }),

  http.post('/api/hcm/requests/:id/deny', async ({ params }) => {
    await cellLatency();
    const result = hcmStore.denyRequest(String(params.id));
    if (result.kind === 'not-found') {
      return hcmError(404, { code: 'not-found', message: 'request not found' });
    }
    if (result.kind === 'conflict') {
      return hcmError(409, {
        code: 'conflict',
        message: 'request is no longer pending',
      });
    }
    return HttpResponse.json(result.request);
  }),
];
