import type { BalanceCell } from './types';

export function cellKey({ employeeId, locationId }: BalanceCell): string {
  return `${employeeId}:${locationId}`;
}

export function toCell({ employeeId, locationId }: BalanceCell): BalanceCell {
  return { employeeId, locationId };
}
