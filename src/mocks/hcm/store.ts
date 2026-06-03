import type {
  Balance,
  BalanceCell,
  TimeOffRequest,
} from '@/features/time-off/api/types';

export type WriteBehavior =
  | 'success'
  | 'conflict'
  | 'insufficient-balance'
  | 'silent-wrong';

type Seed = {
  balances: Balance[];
  requests: TimeOffRequest[];
  nextWriteBehavior?: Record<string, WriteBehavior>;
};

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
        status: 'pending',
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
    this.nextWriteBehavior = new Map(
      Object.entries(seed.nextWriteBehavior ?? {}),
    );
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
  }):
    | { kind: 'success'; balance: Balance; request: TimeOffRequest }
    | { kind: 'silent-wrong'; balance: Balance }
    | { kind: 'conflict'; current: Balance }
    | { kind: 'insufficient-balance'; current: Balance }
    | { kind: 'not-found' }
    | { kind: 'invalid-request' } {
    const key = cellKey(args);
    const cell = this.balances.get(key);
    if (!cell) return { kind: 'not-found' };
    if (!Number.isInteger(args.days) || args.days <= 0) {
      return { kind: 'invalid-request' };
    }

    const injected = this.nextWriteBehavior.get(key);
    if (injected) this.nextWriteBehavior.delete(key);

    if (injected === 'conflict' || args.expectedVersion !== cell.version) {
      return { kind: 'conflict', current: { ...cell } };
    }

    if (injected === 'insufficient-balance' || args.days > cell.available) {
      return { kind: 'insufficient-balance', current: { ...cell } };
    }

    if (injected === 'silent-wrong') {
      return { kind: 'silent-wrong', balance: { ...cell } };
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
      status: 'pending',
      createdAt: updated.updatedAt,
      updatedAt: updated.updatedAt,
    };
    this.requests.set(request.id, request);

    return { kind: 'success', balance: { ...updated }, request: { ...request } };
  }

  approveRequest(id: string):
    | { kind: 'success'; request: TimeOffRequest; balance: Balance }
    | { kind: 'not-found' }
    | { kind: 'conflict'; request: TimeOffRequest } {
    const request = this.requests.get(id);
    if (!request) return { kind: 'not-found' };
    if (request.status !== 'pending') {
      return { kind: 'conflict', request: { ...request } };
    }
    const key = cellKey(request);
    const cell = this.balances.get(key);
    if (!cell) return { kind: 'not-found' };

    const ts = this.nextTimestamp();
    const updatedRequest: TimeOffRequest = {
      ...request,
      status: 'approved',
      updatedAt: ts,
    };
    const updatedBalance: Balance = {
      ...cell,
      pending: Math.max(0, cell.pending - request.days),
      version: cell.version + 1,
      updatedAt: ts,
    };
    this.requests.set(id, updatedRequest);
    this.balances.set(key, updatedBalance);
    return {
      kind: 'success',
      request: { ...updatedRequest },
      balance: { ...updatedBalance },
    };
  }

  denyRequest(id: string):
    | { kind: 'success'; request: TimeOffRequest; balance: Balance }
    | { kind: 'not-found' }
    | { kind: 'conflict'; request: TimeOffRequest } {
    const request = this.requests.get(id);
    if (!request) return { kind: 'not-found' };
    if (request.status !== 'pending') {
      return { kind: 'conflict', request: { ...request } };
    }
    const key = cellKey(request);
    const cell = this.balances.get(key);
    if (!cell) return { kind: 'not-found' };

    const ts = this.nextTimestamp();
    const updatedRequest: TimeOffRequest = {
      ...request,
      status: 'denied',
      updatedAt: ts,
    };
    const updatedBalance: Balance = {
      ...cell,
      available: cell.available + request.days,
      pending: Math.max(0, cell.pending - request.days),
      version: cell.version + 1,
      updatedAt: ts,
    };
    this.requests.set(id, updatedRequest);
    this.balances.set(key, updatedBalance);
    return {
      kind: 'success',
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
