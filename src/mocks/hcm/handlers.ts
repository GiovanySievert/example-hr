import { http, HttpResponse } from 'msw';

import type {
  Balance,
  DecisionPayload,
  FileTimeOffPayload,
  HcmError,
} from '@/features/time-off/api/types';
import { HcmErrorCode } from '@/features/time-off/api/enums';

import { DecisionResultKind, WriteResultKind } from './enums';
import { cellLatency, corpusLatency } from './latency';
import { hcmStore, type DecisionResult } from './store';

function hcmError(status: number, error: HcmError) {
  return HttpResponse.json(error, { status });
}

function decisionResponse(result: DecisionResult, conflictMessage: string) {
  switch (result.kind) {
    case DecisionResultKind.NotFound:
      return hcmError(404, { code: HcmErrorCode.NotFound, message: 'request not found' });
    case DecisionResultKind.Conflict:
      return hcmError(409, {
        code: HcmErrorCode.Conflict,
        message: conflictMessage,
        current: result.current,
      });
    case DecisionResultKind.Success:
      return HttpResponse.json(result.request);
  }
}

export const hcmHandlers = [
  http.get('/api/hcm/balance', async ({ request }) => {
    await cellLatency();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    const locationId = url.searchParams.get('locationId');
    if (!employeeId || !locationId) {
      return hcmError(400, {
        code: HcmErrorCode.InvalidRequest,
        message: 'employeeId and locationId are required',
      });
    }
    const balance = hcmStore.getBalance({ employeeId, locationId });
    if (!balance) {
      return hcmError(404, {
        code: HcmErrorCode.NotFound,
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
      case WriteResultKind.Success:
        return HttpResponse.json<Balance>(result.balance);
      case WriteResultKind.SilentWrong:
        return HttpResponse.json<Balance>(result.balance);
      case WriteResultKind.Conflict:
        return hcmError(409, {
          code: HcmErrorCode.Conflict,
          message: 'balance version changed; re-read and retry',
          current: result.current,
        });
      case WriteResultKind.InsufficientBalance:
        return hcmError(422, {
          code: HcmErrorCode.InsufficientBalance,
          message: 'not enough available balance',
          current: result.current,
        });
      case WriteResultKind.NotFound:
        return hcmError(404, {
          code: HcmErrorCode.NotFound,
          message: 'balance cell not found',
        });
      case WriteResultKind.InvalidRequest:
        return hcmError(400, {
          code: HcmErrorCode.InvalidRequest,
          message: 'days must be a positive integer',
        });
    }
  }),

  http.get('/api/hcm/requests', async () => {
    await cellLatency();
    return HttpResponse.json(hcmStore.getRequests());
  }),

  http.post('/api/hcm/requests/:id/approve', async ({ params, request }) => {
    await cellLatency();
    const body = (await request.json().catch(() => ({}))) as Partial<DecisionPayload>;
    const result = hcmStore.approveRequest(String(params.id), body.expectedBalanceVersion);
    return decisionResponse(result, 'balance changed; re-read before deciding');
  }),

  http.post('/api/hcm/requests/:id/deny', async ({ params, request }) => {
    await cellLatency();
    const body = (await request.json().catch(() => ({}))) as Partial<DecisionPayload>;
    const result = hcmStore.denyRequest(String(params.id), body.expectedBalanceVersion);
    return decisionResponse(result, 'balance changed; re-read before deciding');
  }),

  http.post('/api/hcm/requests/:id/cancel', async ({ params, request }) => {
    await cellLatency();
    const body = (await request.json().catch(() => ({}))) as Partial<DecisionPayload>;
    const result = hcmStore.cancelRequest(String(params.id), body.expectedBalanceVersion);
    return decisionResponse(result, 'balance changed; re-read before cancelling');
  }),
];
