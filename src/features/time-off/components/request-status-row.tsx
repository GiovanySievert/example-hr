import { Typography } from '@/shared/components';

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
};

export function RequestStatusRow({ request, locationLabel }: RequestStatusRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
      <div className="flex flex-col gap-1">
        <Typography variant="small">
          {request.days} day(s) · {locationLabel}
        </Typography>
        {request.reverted ? <RevertedNote /> : null}
      </div>
      <StatusBadge status={request.status} reverted={request.reverted} />
    </div>
  );
}
