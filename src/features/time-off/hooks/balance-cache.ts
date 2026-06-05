import type { QueryClient } from '@tanstack/react-query';

import { timeOffKeys } from '../api/query-keys';
import type { Balance, BalanceCell } from '../api/types';

export function isSameCell(balance: BalanceCell, cell: BalanceCell): boolean {
  return balance.employeeId === cell.employeeId && balance.locationId === cell.locationId;
}

export function writeBalanceToCorpus(
  balances: Balance[] | undefined,
  authoritative: Balance,
): Balance[] | undefined {
  if (!balances) return balances;
  return balances.map((balance) => (isSameCell(balance, authoritative) ? authoritative : balance));
}

export function readCachedBalance(
  queryClient: QueryClient,
  cell: BalanceCell,
): Balance | undefined {
  const perCell = queryClient.getQueryData<Balance>(timeOffKeys.balance(cell));
  if (perCell) return perCell;
  return queryClient
    .getQueryData<Balance[]>(timeOffKeys.balances())
    ?.find((balance) => isSameCell(balance, cell));
}

export function writeBalanceEverywhere(queryClient: QueryClient, balance: Balance): void {
  queryClient.setQueryData<Balance>(timeOffKeys.balance(balance), balance);
  queryClient.setQueryData<Balance[]>(timeOffKeys.balances(), (balances) =>
    writeBalanceToCorpus(balances, balance),
  );
}
