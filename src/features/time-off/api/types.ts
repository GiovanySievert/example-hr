import type { HcmErrorCode, TimeOffRequestStatus } from './enums';

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

export type TimeOffRequest = {
  id: string;
  employeeId: string;
  locationId: string;
  startDate?: string;
  endDate?: string;
  days: number;
  status: TimeOffRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type HcmError = {
  code: HcmErrorCode;
  message: string;
  current?: Balance;
};

export type FileTimeOffPayload = BalanceCell & {
  startDate: string;
  endDate: string;
  days: number;
  expectedVersion: number;
};

export type DecisionPayload = {
  expectedBalanceVersion: number;
};
