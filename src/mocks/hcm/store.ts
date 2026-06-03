import type { Balance, BalanceCell, TimeOffRequest } from '@/features/time-off/api/types';
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
  | { kind: WriteResultKind.NotFound }
  | { kind: WriteResultKind.InvalidRequest };

export type DecisionResult =
  | { kind: DecisionResultKind.Success; request: TimeOffRequest; balance: Balance }
  | { kind: DecisionResultKind.NotFound }
  | { kind: DecisionResultKind.Conflict; request: TimeOffRequest };

export function cellKey({ employeeId, locationId }: BalanceCell): string {
  return `${employeeId}:${locationId}`;
}

const FIXED_NOW = '2026-06-03T00:00:00.000Z';

export function defaultSeed(): Seed {
  return {
    balances: [
      {
        employeeId: 'e1',
        locationId: 'us',
        available: 12,
        pending: 0,
        version: 1,
        updatedAt: FIXED_NOW,
      },
      {
        employeeId: 'e1',
        locationId: 'de',
        available: 3,
        pending: 1,
        version: 1,
        updatedAt: FIXED_NOW,
      },
      {
        employeeId: 'e2',
        locationId: 'us',
        available: 20,
        pending: 0,
        version: 1,
        updatedAt: FIXED_NOW,
      },
    ],
    requests: [
      {
        id: 'r1',
        employeeId: 'e1',
        locationId: 'us',
        days: 2,
        status: TimeOffRequestStatus.Pending,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
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

    if (injected === WriteBehavior.InsufficientBalance || args.days > cell.available) {
      return { kind: WriteResultKind.InsufficientBalance, current: { ...cell } };
    }

    if (injected === WriteBehavior.SilentWrong) {
      return { kind: WriteResultKind.SilentWrong, balance: { ...cell } };
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
      days: args.days,
      status: TimeOffRequestStatus.Pending,
      createdAt: updated.updatedAt,
      updatedAt: updated.updatedAt,
    };
    this.requests.set(request.id, request);

    return { kind: WriteResultKind.Success, balance: { ...updated }, request: { ...request } };
  }

  approveRequest(id: string): DecisionResult {
    return this.decide(id, TimeOffRequestStatus.Approved);
  }

  denyRequest(id: string): DecisionResult {
    return this.decide(id, TimeOffRequestStatus.Denied);
  }

  private decide(
    id: string,
    decision: TimeOffRequestStatus.Approved | TimeOffRequestStatus.Denied,
  ): DecisionResult {
    const request = this.requests.get(id);
    if (!request) return { kind: DecisionResultKind.NotFound };
    if (request.status !== TimeOffRequestStatus.Pending) {
      return { kind: DecisionResultKind.Conflict, request: { ...request } };
    }
    const key = cellKey(request);
    const cell = this.balances.get(key);
    if (!cell) return { kind: DecisionResultKind.NotFound };

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
