'use client';

import { Card, CardContent, CardHeader, CardTitle, Typography } from '@/shared/components';

import type { Balance } from '../api/types';
import { BalanceCardStatus } from '../api/enums';
import { BalanceBadge } from './balance-badge';

type BalanceCardProps = {
  balance: Balance;
  locationLabel?: string;
  status?: BalanceCardStatus;
  onAcknowledgeRefreshed?: () => void;
};

function BalanceStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <Typography variant="muted">{label}</Typography>
      <Typography variant="h3" as="span">
        {value}
      </Typography>
    </div>
  );
}

export function BalanceCard({
  balance,
  locationLabel,
  status = BalanceCardStatus.Idle,
  onAcknowledgeRefreshed,
}: BalanceCardProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>{locationLabel ?? balance.locationId.toUpperCase()}</CardTitle>
        {status === BalanceCardStatus.Idle ? null : (
          <BalanceBadge status={status} onAcknowledge={onAcknowledgeRefreshed} />
        )}
      </CardHeader>
      <CardContent className="flex gap-8">
        <BalanceStat label="Available" value={balance.available} />
        <BalanceStat label="Pending" value={balance.pending} />
      </CardContent>
    </Card>
  );
}
