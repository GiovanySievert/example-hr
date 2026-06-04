import { Button, Typography } from '@/shared/components';

import { formatDateRange } from '../api/date-range';
import { TimeOffRequestStatus } from '../api/enums';
import type { RequestListItem } from './request-status-list';
import { StatusBadge } from './status-badge';

function RevertedNote() {
  return (
    <Typography variant="muted">Reverted — the HCM could not confirm this request.</Typography>
  );
}

type RequestStatusRowProps = {
  request: RequestListItem;
  locationLabel: string;
  cancelling?: boolean;
  onCancel?: () => void;
};

export function RequestStatusRow({
  request,
  locationLabel,
  cancelling = false,
  onCancel,
}: RequestStatusRowProps) {
  const canCancel = onCancel && !request.reverted && request.status === TimeOffRequestStatus.Pending;
  const dateRange = formatDateRange(request.startDate, request.endDate);
  const requestLabel = `${dateRange ? `${dateRange} · ` : ''}${request.days} day(s) · ${locationLabel}`;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
      <div className="flex flex-col gap-1">
        <Typography variant="small">{requestLabel}</Typography>
        {request.reverted ? <RevertedNote /> : null}
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={request.status} reverted={request.reverted} />
        {canCancel ? (
          <Button
            variant="secondary"
            className="h-8 px-3 text-xs"
            disabled={cancelling}
            onClick={onCancel}
          >
            {cancelling ? 'Cancelling...' : 'Cancel'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
