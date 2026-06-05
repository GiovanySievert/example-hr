import type { Balance, TimeOffRequest } from './types';

export function isInsufficientBalance(
  request: Pick<TimeOffRequest, 'days'>,
  balance?: Balance,
): boolean {
  return balance !== undefined && request.days > balance.available;
}

export type ApproveDisabledState = {
  balance?: Balance;
  days: number;
  deciding: boolean;
  stale: boolean;
  balanceLoading: boolean;
};

export function isApproveDisabled({
  balance,
  days,
  deciding,
  stale,
  balanceLoading,
}: ApproveDisabledState): boolean {
  return (
    deciding ||
    stale ||
    balanceLoading ||
    isInsufficientBalance({ days }, balance) ||
    balance === undefined
  );
}
