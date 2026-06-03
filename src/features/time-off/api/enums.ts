export enum TimeOffRequestStatus {
  Pending = 'pending',
  Approved = 'approved',
  Denied = 'denied',
  Cancelled = 'cancelled',
}

export enum HcmErrorCode {
  Conflict = 'conflict',
  InsufficientBalance = 'insufficient-balance',
  NotFound = 'not-found',
  InvalidRequest = 'invalid-request',
}

export enum BalanceCardStatus {
  Idle = 'idle',
  Optimistic = 'optimistic',
  Stale = 'stale',
  Refreshed = 'refreshed',
}
