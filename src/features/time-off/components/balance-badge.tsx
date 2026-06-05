import { Badge } from '@/shared/components';

import { BalanceCardStatus } from '../api/enums';

const badgeConfig: Record<
  Exclude<BalanceCardStatus, BalanceCardStatus.Idle>,
  { label: string; className: string }
> = {
  [BalanceCardStatus.Optimistic]: {
    label: 'Saving…',
    className: 'border-border bg-secondary text-muted',
  },
  [BalanceCardStatus.Stale]: {
    label: 'Stale',
    className: 'border-border bg-secondary text-muted',
  },
  [BalanceCardStatus.Refreshed]: {
    label: 'Refreshed',
    className: 'border-primary bg-primary text-primary-foreground',
  },
};

type BalanceBadgeProps = {
  status: Exclude<BalanceCardStatus, BalanceCardStatus.Idle>;
  onAcknowledge?: () => void;
};

export function BalanceBadge({ status, onAcknowledge }: BalanceBadgeProps) {
  const { label, className } = badgeConfig[status];
  const interactive = status === BalanceCardStatus.Refreshed;

  if (!interactive) {
    return <Badge className={className}>{label}</Badge>;
  }

  return (
    <button type="button" onClick={onAcknowledge} className="cursor-pointer">
      <Badge className={className}>{label}</Badge>
    </button>
  );
}
