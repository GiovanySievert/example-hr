'use client';

import { Button, Card, CardContent, CardHeader, CardTitle, Typography } from '@/shared/components';

import type { TimeOffRequest } from '../api/types';
import { RequestStatusRow } from './request-status-row';

export type RequestListItem = TimeOffRequest & {
  reverted?: boolean;
};

type RequestStatusListProps = {
  requests: RequestListItem[];
  locationLabels?: Record<string, string>;
  loading?: boolean;
  error?: boolean;
  refreshing?: boolean;
  cancellingRequestId?: string;
  onRetry?: () => void;
  onCancelRequest?: (request: TimeOffRequest) => void;
};

function RequestsFrame({
  children,
  refreshing,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
}) {
  return (
    <Card className="w-full max-w-sm self-start">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Your requests</CardTitle>
          {refreshing ? <Typography variant="muted">Syncing…</Typography> : null}
        </div>
      </CardHeader>
      {children}
    </Card>
  );
}

export function RequestStatusList({
  requests,
  locationLabels,
  loading = false,
  error = false,
  refreshing = false,
  cancellingRequestId,
  onRetry,
  onCancelRequest,
}: RequestStatusListProps) {
  if (loading) {
    return (
      <RequestsFrame>
        <CardContent className="pt-0">
          <Typography variant="muted">Loading request history…</Typography>
        </CardContent>
      </RequestsFrame>
    );
  }

  if (error) {
    return (
      <RequestsFrame>
        <CardContent className="flex flex-col gap-3 pt-0">
          <Typography variant="muted">Could not load request history.</Typography>
          {onRetry ? (
            <Button variant="secondary" className="self-start" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </CardContent>
      </RequestsFrame>
    );
  }

  if (requests.length === 0) {
    return (
      <RequestsFrame refreshing={refreshing}>
        <CardContent className="pt-0">
          <Typography variant="muted">No requests yet.</Typography>
        </CardContent>
      </RequestsFrame>
    );
  }

  return (
    <RequestsFrame refreshing={refreshing}>
      <CardContent className="flex flex-col gap-3">
        {requests.map((request) => (
          <RequestStatusRow
            key={request.id}
            request={request}
            locationLabel={locationLabels?.[request.locationId] ?? request.locationId.toUpperCase()}
            cancelling={cancellingRequestId === request.id}
            onCancel={onCancelRequest ? () => onCancelRequest(request) : undefined}
          />
        ))}
      </CardContent>
    </RequestsFrame>
  );
}
