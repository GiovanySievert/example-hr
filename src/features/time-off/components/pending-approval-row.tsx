'use client';

import { Card, Typography } from '@/shared/components';

import { isApproveDisabled, isInsufficientBalance } from '../api/approval-decision';
import { formatDateRange, formatDayCount } from '../api/date-range';
import type { Balance, TimeOffRequest } from '../api/types';
import {
  BalanceContext,
  DecisionActions,
  InsufficientNote,
  StaleWarning,
  TeamConflictNote,
} from './pending-approval-row-parts';

type PendingApprovalRowProps = {
  request: TimeOffRequest;
  balance?: Balance;
  locationLabel?: string;
  balanceLoading?: boolean;
  stale?: boolean;
  deciding?: boolean;
  teamConflictSummary?: string;
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
  teamConflictSummary,
  showEmployeeLabel = true,
  onApprove,
  onDeny,
  onRefresh,
}: PendingApprovalRowProps) {
  const location = locationLabel ?? request.locationId.toUpperCase();
  const insufficient = isInsufficientBalance(request, balance);
  const approveDisabled = isApproveDisabled({
    balance,
    days: request.days,
    deciding,
    stale,
    balanceLoading,
  });
  const dateRange = formatDateRange(request.startDate, request.endDate);
  const requestLabel = `${dateRange ? `${dateRange} · ` : ''}${formatDayCount(request.days)} · ${location}`;

  return (
    <Card className="w-full">
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Typography variant="small">{requestLabel}</Typography>
            {showEmployeeLabel ? (
              <Typography variant="muted">Employee {request.employeeId}</Typography>
            ) : null}
          </div>
          <BalanceContext balance={balance} loading={balanceLoading} />
        </div>

        {stale ? <StaleWarning onRefresh={onRefresh} disabled={deciding} /> : null}

        {teamConflictSummary ? <TeamConflictNote summary={teamConflictSummary} /> : null}

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
