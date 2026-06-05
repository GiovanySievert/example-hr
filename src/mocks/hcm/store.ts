import type { Balance, BalanceCell, TimeOffRequest } from '@/features/time-off/api/types';
import { dateRangesOverlap } from '@/features/time-off/api/date-range';
import { validateTimeOffPolicy } from '@/features/time-off/api/request-policy';
import { TimeOffRequestStatus } from '@/features/time-off/api/enums';

import { DecisionResultKind, WriteBehavior, WriteResultKind } from './enums';

type Seed = {
  balances: Balance[];
  requests: TimeOffRequest[];
  nextWriteBehavior?: Record<string, WriteBehavior>;
};

export type FileRequestResult =
  | { kind: WriteResultKind.Success; balance: Balance; request: TimeOffRequest }
  | { kind: WriteResultKind.SilentWrong; balance: Balance }
  | { kind: WriteResultKind.Conflict; current: Balance }
  | { kind: WriteResultKind.InsufficientBalance; current: Balance }
  | { kind: WriteResultKind.OverlappingRequest; current: Balance }
  | { kind: WriteResultKind.PolicyViolation; current: Balance; message: string }
  | { kind: WriteResultKind.NotFound }
  | { kind: WriteResultKind.InvalidRequest };

export type DecisionResult =
  | { kind: DecisionResultKind.Success; request: TimeOffRequest; balance: Balance }
  | { kind: DecisionResultKind.NotFound }
  | { kind: DecisionResultKind.Conflict; request: TimeOffRequest; current?: Balance };

export function cellKey({ employeeId, locationId }: BalanceCell): string {
  return `${employeeId}:${locationId}`;
}

const FIXED_NOW = '2026-06-03T00:00:00.000Z';

function balance(
  employeeId: string,
  locationId: string,
  available: number,
  pending: number,
): Balance {
  return { employeeId, locationId, available, pending, version: 1, updatedAt: FIXED_NOW };
}

function defaultEndDate(startDate: string, days: number): string {
  const [year, month, day] = startDate.split('-').map(Number);
  const current = new Date(Date.UTC(year, month - 1, day));
  let businessDays = 0;

  while (businessDays < days) {
    const weekday = current.getUTCDay();
    if (weekday !== 0 && weekday !== 6) businessDays += 1;
    if (businessDays < days) current.setUTCDate(current.getUTCDate() + 1);
  }

  return current.toISOString().slice(0, 10);
}

function pendingRequest(
  id: string,
  employeeId: string,
  locationId: string,
  days: number,
  startDate = '2026-06-08',
  endDate = defaultEndDate(startDate, days),
): TimeOffRequest {
  return {
    id,
    employeeId,
    locationId,
    startDate,
    endDate,
    days,
    status: TimeOffRequestStatus.Pending,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  };
}

function isActiveRequest(request: TimeOffRequest) {
  return (
    request.status === TimeOffRequestStatus.Pending ||
    request.status === TimeOffRequestStatus.Approved
  );
}

export function defaultSeed(): Seed {
  return {
    balances: [
      balance('e1', 'us', 12, 2),
      balance('e1', 'de', 3, 1),
      balance('e2', 'us', 20, 5),
      balance('e2', 'de', 8, 0),
      balance('e3', 'us', 1, 0),
      balance('e3', 'br', 15, 3),
    ],
    requests: [
      pendingRequest('r1', 'e1', 'us', 2),
      pendingRequest('r2', 'e1', 'de', 1),
      pendingRequest('r3', 'e2', 'us', 5),
      pendingRequest('r4', 'e3', 'us', 4),
      pendingRequest('r5', 'e3', 'br', 3),
    ],
  };
}

export class HcmStore {
  private balances = new Map<string, Balance>();
  private requests = new Map<string, TimeOffRequest>();
  private nextWriteBehavior = new Map<string, WriteBehavior>();
  private clock = 0;

  constructor(seed: Seed = defaultSeed()) {
    this.load(seed);
  }

  load(seed: Seed): void {
    this.balances = new Map(seed.balances.map((b) => [cellKey(b), { ...b }]));
    this.requests = new Map(seed.requests.map((r) => [r.id, { ...r }]));
    this.nextWriteBehavior = new Map(Object.entries(seed.nextWriteBehavior ?? {}));
    this.clock = 0;
  }

  private nextTimestamp(): string {
    this.clock += 1;
    return new Date(Date.parse(FIXED_NOW) + this.clock * 1000).toISOString();
  }

  getBalance(cell: BalanceCell): Balance | undefined {
    const found = this.balances.get(cellKey(cell));
    return found ? { ...found } : undefined;
  }

  getBalances(): Balance[] {
    return [...this.balances.values()].map((b) => ({ ...b }));
  }

  getRequests(): TimeOffRequest[] {
    return [...this.requests.values()].map((r) => ({ ...r }));
  }

  getRequest(id: string): TimeOffRequest | undefined {
    const found = this.requests.get(id);
    return found ? { ...found } : undefined;
  }

  setNextWriteBehavior(cell: BalanceCell, behavior: WriteBehavior): void {
    this.nextWriteBehavior.set(cellKey(cell), behavior);
  }

  fileRequest(args: {
    employeeId: string;
    locationId: string;
    startDate: string;
    endDate: string;
    days: number;
    expectedVersion: number;
  }): FileRequestResult {
    const key = cellKey(args);
    const cell = this.balances.get(key);
    if (!cell) return { kind: WriteResultKind.NotFound };
    if (!Number.isInteger(args.days) || args.days <= 0) {
      return { kind: WriteResultKind.InvalidRequest };
    }

    const injected = this.nextWriteBehavior.get(key);
    if (injected) this.nextWriteBehavior.delete(key);

    if (injected === WriteBehavior.Conflict || args.expectedVersion !== cell.version) {
      return { kind: WriteResultKind.Conflict, current: { ...cell } };
    }

    const overlappingRequest = [...this.requests.values()].find(
      (request) =>
        request.employeeId === args.employeeId &&
        isActiveRequest(request) &&
        dateRangesOverlap(args.startDate, args.endDate, request.startDate, request.endDate),
    );
    if (overlappingRequest) {
      return { kind: WriteResultKind.OverlappingRequest, current: { ...cell } };
    }

    if (injected === WriteBehavior.InsufficientBalance || args.days > cell.available) {
      return { kind: WriteResultKind.InsufficientBalance, current: { ...cell } };
    }

    const policyViolation = validateTimeOffPolicy({
      startDate: args.startDate,
      endDate: args.endDate,
      days: args.days,
    });
    if (policyViolation) {
      return {
        kind: WriteResultKind.PolicyViolation,
        current: { ...cell },
        message: policyViolation.message,
      };
    }

    if (injected === WriteBehavior.SilentWrong) {
      return { kind: WriteResultKind.SilentWrong, balance: { ...cell } };
    }

    if (injected === WriteBehavior.SilentWrongPendingMismatch) {
      const updated: Balance = {
        ...cell,
        available: cell.available - args.days,
        version: cell.version + 1,
        updatedAt: this.nextTimestamp(),
      };
      this.balances.set(key, updated);
      return { kind: WriteResultKind.SilentWrong, balance: { ...updated } };
    }

    const updated: Balance = {
      ...cell,
      available: cell.available - args.days,
      pending: cell.pending + args.days,
      version: cell.version + 1,
      updatedAt: this.nextTimestamp(),
    };
    this.balances.set(key, updated);

    const request: TimeOffRequest = {
      id: `r${this.requests.size + 1}-${this.clock}`,
      employeeId: args.employeeId,
      locationId: args.locationId,
      startDate: args.startDate,
      endDate: args.endDate,
      days: args.days,
      status: TimeOffRequestStatus.Pending,
      createdAt: updated.updatedAt,
      updatedAt: updated.updatedAt,
    };
    this.requests.set(request.id, request);

    return { kind: WriteResultKind.Success, balance: { ...updated }, request: { ...request } };
  }

  approveRequest(id: string, expectedBalanceVersion?: number): DecisionResult {
    return this.decide(id, TimeOffRequestStatus.Approved, expectedBalanceVersion);
  }

  denyRequest(id: string, expectedBalanceVersion?: number): DecisionResult {
    return this.decide(id, TimeOffRequestStatus.Denied, expectedBalanceVersion);
  }

  cancelRequest(id: string, expectedBalanceVersion?: number): DecisionResult {
    return this.decide(id, TimeOffRequestStatus.Cancelled, expectedBalanceVersion);
  }

  private decide(
    id: string,
    decision:
      | TimeOffRequestStatus.Approved
      | TimeOffRequestStatus.Denied
      | TimeOffRequestStatus.Cancelled,
    expectedBalanceVersion?: number,
  ): DecisionResult {
    const request = this.requests.get(id);
    if (!request) return { kind: DecisionResultKind.NotFound };
    if (request.status !== TimeOffRequestStatus.Pending) {
      return { kind: DecisionResultKind.Conflict, request: { ...request } };
    }
    const key = cellKey(request);
    const cell = this.balances.get(key);
    if (!cell) return { kind: DecisionResultKind.NotFound };
    if (expectedBalanceVersion !== undefined && expectedBalanceVersion !== cell.version) {
      return { kind: DecisionResultKind.Conflict, request: { ...request }, current: { ...cell } };
    }

    const ts = this.nextTimestamp();
    const updatedRequest: TimeOffRequest = { ...request, status: decision, updatedAt: ts };

    const approved = decision === TimeOffRequestStatus.Approved;
    const updatedBalance: Balance = {
      ...cell,
      available: approved ? cell.available : cell.available + request.days,
      pending: Math.max(0, cell.pending - request.days),
      version: cell.version + 1,
      updatedAt: ts,
    };

    this.requests.set(id, updatedRequest);
    this.balances.set(key, updatedBalance);
    return {
      kind: DecisionResultKind.Success,
      request: { ...updatedRequest },
      balance: { ...updatedBalance },
    };
  }

  applyAnniversaryBonus(cell: BalanceCell, amount = 5): Balance | undefined {
    const key = cellKey(cell);
    const current = this.balances.get(key);
    if (!current) return undefined;
    const updated: Balance = {
      ...current,
      available: current.available + amount,
      version: current.version + 1,
      updatedAt: this.nextTimestamp(),
    };
    this.balances.set(key, updated);
    return { ...updated };
  }
}

export const hcmStore = new HcmStore();

export function resetHcmStore(seed: Seed = defaultSeed()): void {
  hcmStore.load(seed);
}
