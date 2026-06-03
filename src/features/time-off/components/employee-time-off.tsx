'use client';

import { useMemo } from 'react';

import { useAtomValue, useSetAtom } from 'jotai';

import { Typography } from '@/shared/components';

import { cellKey } from '../api/cell-key';
import type { Balance } from '../api/types';
import { useBalances } from '../hooks/use-balances';
import { useFileTimeOff } from '../hooks/use-file-time-off';
import { usePendingRequests } from '../hooks/use-pending-requests';
import { useReconcile } from '../hooks/use-reconcile';
import { acknowledgeCellRefreshedAtom, inFlightCellsAtom, refreshedCellsAtom } from '../state';
import { BalanceCard, type BalanceCardStatus } from './balance-card';
import { TimeOffRequestForm, type LocationOption } from './time-off-request-form';
import { RequestStatusList } from './request-status-list';

const LOCATION_LABELS: Record<string, string> = {
  us: 'United States',
  de: 'Germany',
};

type EmployeeTimeOffProps = {
  employeeId: string;
  reconcileIntervalMs?: number;
};

export function EmployeeTimeOff({ employeeId, reconcileIntervalMs }: EmployeeTimeOffProps) {
  useReconcile(reconcileIntervalMs ? { intervalMs: reconcileIntervalMs } : undefined);
  const balancesQuery = useBalances();
  const requestsQuery = usePendingRequests();
  const fileTimeOff = useFileTimeOff();

  const inFlight = useAtomValue(inFlightCellsAtom);
  const refreshed = useAtomValue(refreshedCellsAtom);
  const acknowledgeRefreshed = useSetAtom(acknowledgeCellRefreshedAtom);

  const cells = useMemo(
    () => (balancesQuery.data ?? []).filter((balance) => balance.employeeId === employeeId),
    [balancesQuery.data, employeeId],
  );

  const locations: LocationOption[] = useMemo(
    () =>
      cells.map((cell) => ({
        id: cell.locationId,
        label: LOCATION_LABELS[cell.locationId] ?? cell.locationId.toUpperCase(),
      })),
    [cells],
  );

  function statusFor(cell: Balance): BalanceCardStatus {
    const key = cellKey(cell);
    if (inFlight.has(key)) return 'optimistic';
    if (refreshed.has(key)) return 'refreshed';
    return 'idle';
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

      <section className="flex flex-wrap gap-8">
        <TimeOffRequestForm
          locations={locations}
          submitting={fileTimeOff.isPending}
          onSubmit={({ locationId, days }) => fileTimeOff.mutate({ employeeId, locationId, days })}
        />
        <RequestStatusList requests={requestsQuery.data ?? []} locationLabels={LOCATION_LABELS} />
      </section>
    </div>
  );
}
