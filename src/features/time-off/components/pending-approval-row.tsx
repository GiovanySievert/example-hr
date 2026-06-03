'use client';

import { Card, Typography } from '@/shared/components';

import type { Balance, TimeOffRequest } from '../api/types';
import {
  BalanceContext,
  DecisionActions,
  InsufficientNote,
  StaleWarning,
} from './pending-approval-row-parts';

type PendingApprovalRowProps = {
  request: TimeOffRequest;
  balance?: Balance;
  locationLabel?: string;
  balanceLoading?: boolean;
  stale?: boolean;
  deciding?: boolean;
  showEmployeeLabel?: boolean;
  onApprove: () => void;
  onDeny: () => void;
  onRefresh: () => void;
};

export function PendingApprovalRow({
  request,
  balance,
  locationLabel,
  balanceLoading = false,
  stale = false,
  deciding = false,
  showEmployeeLabel = true,
  onApprove,
  onDeny,
  onRefresh,
}: PendingApprovalRowProps) {
  const location = locationLabel ?? request.locationId.toUpperCase();
  const insufficient = balance !== undefined && request.days > balance.available;
  const approveDisabled = deciding || stale || balanceLoading || insufficient || !balance;

  return (
    <Card className="w-full">
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Typography variant="small">
              {request.days} day(s) · {location}
            </Typography>
            {showEmployeeLabel ? (
              <Typography variant="muted">Employee {request.employeeId}</Typography>
            ) : null}
          </div>
          <BalanceContext balance={balance} loading={balanceLoading} />
        </div>

        {stale ? <StaleWarning onRefresh={onRefresh} disabled={deciding} /> : null}

        {insufficient && !stale ? <InsufficientNote /> : null}

        <DecisionActions
          deciding={deciding}
          approveDisabled={approveDisabled}
          onApprove={onApprove}
          onDeny={onDeny}
        />
      </div>
    </Card>
  );
}
