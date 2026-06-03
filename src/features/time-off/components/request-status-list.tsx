'use client';

import { Card, CardContent, CardHeader, CardTitle, Typography } from '@/shared/components';

import type { TimeOffRequest } from '../api/types';
import { RequestStatusRow } from './request-status-row';

export type RequestListItem = TimeOffRequest & {
  reverted?: boolean;
};

type RequestStatusListProps = {
  requests: RequestListItem[];
  locationLabels?: Record<string, string>;
};

function EmptyRequests() {
  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <Typography variant="muted">No requests yet.</Typography>
      </CardContent>
    </Card>
  );
}

export function RequestStatusList({ requests, locationLabels }: RequestStatusListProps) {
  if (requests.length === 0) {
    return <EmptyRequests />;
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Your requests</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {requests.map((request) => (
          <RequestStatusRow
            key={request.id}
            request={request}
            locationLabel={locationLabels?.[request.locationId] ?? request.locationId.toUpperCase()}
          />
        ))}
      </CardContent>
    </Card>
  );
}
