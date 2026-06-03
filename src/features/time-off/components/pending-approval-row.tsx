'use client';

import {
  Button,
  Card,
  CardContent,
  Typography,
} from '@/shared/components';

import type { Balance, TimeOffRequest } from '../api/types';

type PendingApprovalRowProps = {
  request: TimeOffRequest;
  balance?: Balance;
  locationLabel?: string;
  balanceLoading?: boolean;
  stale?: boolean;
  deciding?: boolean;
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
  onApprove,
  onDeny,
  onRefresh,
}: PendingApprovalRowProps) {
  const location =
    locationLabel ?? request.locationId.toUpperCase();
  const insufficient =
    balance !== undefined && request.days > balance.available;
  const approveDisabled =
    deciding || stale || balanceLoading || insufficient || !balance;

  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Typography variant="small">
              {request.days} day(s) · {location}
            </Typography>
            <Typography variant="muted">Employee {request.employeeId}</Typography>
          </div>
          {balanceLoading ? (
            <Typography variant="muted">Reading balance…</Typography>
          ) : balance ? (
            <div className="text-right">
              <Typography variant="muted">Available</Typography>
              <Typography variant="h4" as="span">
                {balance.available}
              </Typography>
            </div>
          ) : null}
        </div>

        {stale ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary p-3">
            <Typography variant="muted">
              The balance changed since you opened this. Re-read before deciding.
            </Typography>
            <Button variant="secondary" onClick={onRefresh} disabled={deciding}>
              Re-read
            </Button>
          </div>
        ) : null}

        {insufficient && !stale ? (
          <Typography variant="muted">
            Insufficient available balance for this request.
          </Typography>
        ) : null}

        <div className="flex gap-3">
          <Button onClick={onApprove} disabled={approveDisabled}>
            {deciding ? 'Working…' : 'Approve'}
          </Button>
          <Button variant="secondary" onClick={onDeny} disabled={deciding}>
            Deny
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
