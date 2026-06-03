'use client';

import { Card, CardContent, CardHeader, CardTitle, Typography } from '@/shared/components';

import type { TimeOffRequest } from '../api/types';
import { TimeOffRequestStatus } from '../api/enums';

export type RequestListItem = TimeOffRequest & {
  reverted?: boolean;
};

type RequestStatusListProps = {
  requests: RequestListItem[];
  locationLabels?: Record<string, string>;
};

const statusLabel: Record<TimeOffRequestStatus, string> = {
  [TimeOffRequestStatus.Pending]: 'Pending',
  [TimeOffRequestStatus.Approved]: 'Approved',
  [TimeOffRequestStatus.Denied]: 'Denied',
};

const statusClass: Record<TimeOffRequestStatus, string> = {
  [TimeOffRequestStatus.Pending]: 'border-border bg-secondary text-muted',
  [TimeOffRequestStatus.Approved]: 'border-primary bg-primary text-primary-foreground',
  [TimeOffRequestStatus.Denied]: 'border-border bg-secondary text-secondary-foreground',
};

export function RequestStatusList({ requests, locationLabels }: RequestStatusListProps) {
  if (requests.length === 0) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="p-6">
          <Typography variant="muted">No requests yet.</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Your requests</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {requests.map((request) => {
          const location = locationLabels?.[request.locationId] ?? request.locationId.toUpperCase();
          return (
            <div
              key={request.id}
              className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div className="flex flex-col gap-1">
                <Typography variant="small">
                  {request.days} day(s) · {location}
                </Typography>
                {request.reverted ? (
                  <Typography variant="muted">
                    Reverted — the HCM could not confirm this request.
                  </Typography>
                ) : null}
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                  request.reverted
                    ? 'border-border bg-secondary text-secondary-foreground'
                    : statusClass[request.status]
                }`}
              >
                {request.reverted ? 'Reverted' : statusLabel[request.status]}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
