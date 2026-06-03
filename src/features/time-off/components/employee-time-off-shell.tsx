'use client';

import { useMemo, useState } from 'react';

import { Select, Typography } from '@/shared/components';

import { useBalances } from '../hooks/use-balances';
import { EmployeeTimeOff } from './employee-time-off';

type EmployeeTimeOffShellProps = {
  defaultEmployeeId?: string;
  reconcileIntervalMs?: number;
};

function employeeLabel(employeeId: string) {
  return `Employee ${employeeId}`;
}

export function EmployeeTimeOffShell({
  defaultEmployeeId = 'e1',
  reconcileIntervalMs,
}: EmployeeTimeOffShellProps) {
  const balancesQuery = useBalances();
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId);

  const employees = useMemo(() => {
    const ids = new Set((balancesQuery.data ?? []).map((balance) => balance.employeeId));
    return [...ids].sort();
  }, [balancesQuery.data]);

  const selectedEmployeeId = employees.includes(employeeId) ? employeeId : employees[0];

  if (balancesQuery.isLoading) {
    return <Typography variant="muted">Loading employees...</Typography>;
  }

  if (!selectedEmployeeId) {
    return <Typography variant="muted">No employees available.</Typography>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex w-full max-w-sm flex-col gap-1">
        <label htmlFor="employee" className="text-sm font-medium text-foreground">
          Acting as
        </label>
        <Select
          id="employee"
          value={selectedEmployeeId}
          onChange={(event) => setEmployeeId(event.target.value)}
          options={employees.map((id) => ({ value: id, label: employeeLabel(id) }))}
        />
      </div>
      <EmployeeTimeOff employeeId={selectedEmployeeId} reconcileIntervalMs={reconcileIntervalMs} />
    </div>
  );
}
