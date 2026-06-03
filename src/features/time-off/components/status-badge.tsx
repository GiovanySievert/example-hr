import { Badge } from '@/shared/components';

import type { TimeOffRequestStatus } from '../api/enums';
import { TimeOffRequestStatus as Status } from '../api/enums';

const REVERTED_LABEL = 'Reverted';
const REVERTED_CLASS = 'border-border bg-secondary text-secondary-foreground';

const statusLabel: Record<TimeOffRequestStatus, string> = {
  [Status.Pending]: 'Pending',
  [Status.Approved]: 'Approved',
  [Status.Denied]: 'Denied',
};

const statusClass: Record<TimeOffRequestStatus, string> = {
  [Status.Pending]: 'border-border bg-secondary text-muted',
  [Status.Approved]: 'border-primary bg-primary text-primary-foreground',
  [Status.Denied]: 'border-border bg-secondary text-secondary-foreground',
};

type StatusBadgeProps = {
  status: TimeOffRequestStatus;
  reverted?: boolean;
};

export function StatusBadge({ status, reverted = false }: StatusBadgeProps) {
  const label = reverted ? REVERTED_LABEL : statusLabel[status];
  const className = reverted ? REVERTED_CLASS : statusClass[status];

  return <Badge className={className}>{label}</Badge>;
}
