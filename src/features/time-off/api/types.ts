export type BalanceCell = {
  employeeId: string;
  locationId: string;
};

export type Balance = BalanceCell & {
  available: number;
  pending: number;
  version: number;
  updatedAt: string;
};

export type TimeOffRequestStatus = 'pending' | 'approved' | 'denied';

export type TimeOffRequest = {
  id: string;
  employeeId: string;
  locationId: string;
  days: number;
  status: TimeOffRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type HcmErrorCode =
  | 'conflict'
  | 'insufficient-balance'
  | 'not-found'
  | 'invalid-request';

export type HcmError = {
  code: HcmErrorCode;
  message: string;
  current?: Balance;
};

export type FileTimeOffPayload = BalanceCell & {
  days: number;
  expectedVersion: number;
};
