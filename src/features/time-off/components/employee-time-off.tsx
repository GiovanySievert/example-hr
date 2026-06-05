'use client';

import { useMemo } from 'react';

import { useAtomValue, useSetAtom } from 'jotai';

import { Typography } from '@/shared/components';

import { cellKey } from '../api/cell-key';
import type { Balance } from '../api/types';
import { BalanceCardStatus } from '../api/enums';
import { LOCATION_LABELS, locationLabel } from '../api/locations';
import { useBalances } from '../hooks/use-balances';
import { useCancelRequest } from '../hooks/use-cancel-request';
import { useFileTimeOff } from '../hooks/use-file-time-off';
import { useReconcile } from '../hooks/use-reconcile';
import { useRequests } from '../hooks/use-requests';
import {
  acknowledgeCellRefreshedAtom,
  inFlightCellsAtom,
  refreshedCellsAtom,
  rolledBackRequestsAtom,
} from '../state';
import { BalanceCard } from './balance-card';
import { TimeOffRequestForm, type LocationOption } from './time-off-request-form';
import { RequestStatusList } from './request-status-list';

type EmployeeTimeOffProps = {
  employeeId: string;
  reconcileIntervalMs?: number;
};

export function EmployeeTimeOff({ employeeId, reconcileIntervalMs }: EmployeeTimeOffProps) {
  useReconcile(reconcileIntervalMs ? { intervalMs: reconcileIntervalMs } : undefined);
  const balancesQuery = useBalances();
  const requestsQuery = useRequests();
  const fileTimeOff = useFileTimeOff();
  const cancelRequest = useCancelRequest();

  const inFlight = useAtomValue(inFlightCellsAtom);
  const refreshed = useAtomValue(refreshedCellsAtom);
  const rolledBackRequests = useAtomValue(rolledBackRequestsAtom);
  const acknowledgeRefreshed = useSetAtom(acknowledgeCellRefreshedAtom);

  const cells = useMemo(
    () => (balancesQuery.data ?? []).filter((balance) => balance.employeeId === employeeId),
    [balancesQuery.data, employeeId],
  );

  const locations: LocationOption[] = useMemo(
    () =>
      cells.map((cell) => ({
        id: cell.locationId,
        label: locationLabel(cell.locationId),
        available: cell.available,
      })),
    [cells],
  );

  const requests = useMemo(
    () => [
      ...rolledBackRequests.filter((request) => request.employeeId === employeeId),
      ...(requestsQuery.data ?? []).filter((request) => request.employeeId === employeeId),
    ],
    [employeeId, requestsQuery.data, rolledBackRequests],
  );

  function statusFor(cell: Balance): BalanceCardStatus {
    const cellId = cellKey(cell);
    if (inFlight.has(cellId)) return BalanceCardStatus.Optimistic;
    if (refreshed.has(cellId)) return BalanceCardStatus.Refreshed;
    return BalanceCardStatus.Idle;
  }

  if (balancesQuery.isLoading) {
    return <Typography variant="muted">Loading balances…</Typography>;
  }

  if (cells.length === 0) {
    return <Typography variant="muted">No balances for this employee.</Typography>;
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-wrap gap-4">
        {cells.map((cell) => (
          <BalanceCard
            key={cellKey(cell)}
            balance={cell}
            locationLabel={LOCATION_LABELS[cell.locationId]}
            status={statusFor(cell)}
            onAcknowledgeRefreshed={() =>
              acknowledgeRefreshed({
                employeeId: cell.employeeId,
                locationId: cell.locationId,
              })
            }
          />
        ))}
      </section>

      <section className="flex flex-wrap items-start gap-4">
        <TimeOffRequestForm
          locations={locations}
          existingRequests={requests}
          submitting={fileTimeOff.isPending}
          onSubmit={({ locationId, startDate, endDate, days }) =>
            fileTimeOff.mutate({ employeeId, locationId, startDate, endDate, days })
          }
        />
        <RequestStatusList
          requests={requests}
          locationLabels={LOCATION_LABELS}
          loading={requestsQuery.isLoading}
          error={requestsQuery.isError}
          refreshing={(requestsQuery.isFetching && !requestsQuery.isLoading) || cancelRequest.isPending}
          cancellingRequestId={cancelRequest.isPending ? cancelRequest.variables?.id : undefined}
          onRetry={() => void requestsQuery.refetch()}
          onCancelRequest={(request) => cancelRequest.mutate(request)}
        />
      </section>
    </div>
  );
}
