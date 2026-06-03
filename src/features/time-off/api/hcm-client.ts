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

export async function fetchBalance(cell: BalanceCell): Promise<Balance> {
  const params = new URLSearchParams({
    employeeId: cell.employeeId,
    locationId: cell.locationId,
  });
  const response = await fetch(`/api/hcm/balance?${params.toString()}`);
  if (!response.ok) return parseError(response);
  return (await response.json()) as Balance;
}

export async function fetchBalances(): Promise<Balance[]> {
  const response = await fetch('/api/hcm/balances');
  if (!response.ok) return parseError(response);
  return (await response.json()) as Balance[];
}

export async function fileTimeOff(payload: FileTimeOffPayload): Promise<Balance> {
  const response = await fetch('/api/hcm/balance', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return parseError(response);
  return (await response.json()) as Balance;
}

export async function fetchRequests(): Promise<TimeOffRequest[]> {
  const response = await fetch('/api/hcm/requests');
  if (!response.ok) return parseError(response);
  return (await response.json()) as TimeOffRequest[];
}

export async function approveRequest(id: string, payload: DecisionPayload): Promise<TimeOffRequest> {
  const response = await fetch(`/api/hcm/requests/${id}/approve`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return parseError(response);
  return (await response.json()) as TimeOffRequest;
}

export async function denyRequest(id: string, payload: DecisionPayload): Promise<TimeOffRequest> {
  const response = await fetch(`/api/hcm/requests/${id}/deny`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return parseError(response);
  return (await response.json()) as TimeOffRequest;
}

export async function cancelRequest(id: string, payload: DecisionPayload): Promise<TimeOffRequest> {
  const response = await fetch(`/api/hcm/requests/${id}/cancel`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return parseError(response);
  return (await response.json()) as TimeOffRequest;
}
