'use client';

import { Card, CardContent, CardHeader, CardTitle, Typography } from '@/shared/components';

import type { Balance } from '../api/types';

export type BalanceCardStatus = 'idle' | 'optimistic' | 'stale' | 'refreshed';

type BalanceCardProps = {
  balance: Balance;
  locationLabel?: string;
  status?: BalanceCardStatus;
  onAcknowledgeRefreshed?: () => void;
};

const statusBadge: Record<
  Exclude<BalanceCardStatus, 'idle'>,
  { label: string; className: string }
> = {
  optimistic: {
    label: 'Saving…',
    className: 'border-border bg-secondary text-muted',
  },
  stale: {
    label: 'Stale',
    className: 'border-border bg-secondary text-muted',
  },
  refreshed: {
    label: 'Refreshed',
    className: 'border-primary bg-primary text-primary-foreground',
  },
};

export function BalanceCard({
  balance,
  locationLabel,
  status = 'idle',
  onAcknowledgeRefreshed,
}: BalanceCardProps) {
  const badge = status === 'idle' ? null : statusBadge[status];

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>{locationLabel ?? balance.locationId.toUpperCase()}</CardTitle>
        {badge ? (
          <button
            type="button"
            onClick={onAcknowledgeRefreshed}
            disabled={status !== 'refreshed'}
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </button>
        ) : null}
      </CardHeader>
      <CardContent className="flex gap-8">
        <div className="flex flex-col gap-1">
          <Typography variant="muted">Available</Typography>
          <Typography variant="h3" as="span">
            {balance.available}
          </Typography>
        </div>
        <div className="flex flex-col gap-1">
          <Typography variant="muted">Pending</Typography>
          <Typography variant="h3" as="span">
            {balance.pending}
          </Typography>
        </div>
      </CardContent>
    </Card>
  );
}
