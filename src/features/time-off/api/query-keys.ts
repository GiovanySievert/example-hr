import type { BalanceCell } from './types';

export const timeOffKeys = {
  all: ['time-off'] as const,
  balance: (cell: BalanceCell) =>
    ['balance', cell.employeeId, cell.locationId] as const,
  balances: () => ['balances'] as const,
  requests: () => ['requests'] as const,
};
