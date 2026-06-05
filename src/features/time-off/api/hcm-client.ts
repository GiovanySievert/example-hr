import type {
  Balance,
  BalanceCell,
  DecisionPayload,
  FileTimeOffPayload,
  HcmError,
  TimeOffRequest,
} from './types';
import { HcmErrorCode } from './enums';

export class HcmRequestError extends Error {
  readonly status: number;
  readonly body: HcmError;

  constructor(status: number, body: HcmError) {
    super(body.message);
    this.name = 'HcmRequestError';
    this.status = status;
    this.body = body;
  }
}

async function parseError(response: Response): Promise<never> {
  let body: HcmError;
  try {
    body = (await response.json()) as HcmError;
  } catch {
    body = { code: HcmErrorCode.InvalidRequest, message: response.statusText };
  }
  throw new HcmRequestError(response.status, body);
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) return parseError(response);
  return (await response.json()) as T;
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return parseError(response);
  return (await response.json()) as T;
}

function decideRequest(
  action: 'approve' | 'deny' | 'cancel',
  id: string,
  payload: DecisionPayload,
): Promise<TimeOffRequest> {
  return postJson<TimeOffRequest>(`/api/hcm/requests/${id}/${action}`, payload);
}

export function fetchBalance(cell: BalanceCell): Promise<Balance> {
  const params = new URLSearchParams({
    employeeId: cell.employeeId,
    locationId: cell.locationId,
  });
  return getJson<Balance>(`/api/hcm/balance?${params.toString()}`);
}

export function fetchBalances(): Promise<Balance[]> {
  return getJson<Balance[]>('/api/hcm/balances');
}

export function fileTimeOff(payload: FileTimeOffPayload): Promise<Balance> {
  return postJson<Balance>('/api/hcm/balance', payload);
}

export function fetchRequests(): Promise<TimeOffRequest[]> {
  return getJson<TimeOffRequest[]>('/api/hcm/requests');
}

export function approveRequest(id: string, payload: DecisionPayload): Promise<TimeOffRequest> {
  return decideRequest('approve', id, payload);
}

export function denyRequest(id: string, payload: DecisionPayload): Promise<TimeOffRequest> {
  return decideRequest('deny', id, payload);
}

export function cancelRequest(id: string, payload: DecisionPayload): Promise<TimeOffRequest> {
  return decideRequest('cancel', id, payload);
}
