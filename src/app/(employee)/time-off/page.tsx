import { EmployeeTimeOff } from '@/features/time-off';
import { Typography } from '@/shared/components';

export default function TimeOffPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-1">
        <Typography variant="h2">Time off</Typography>
        <Typography variant="muted">
          Your balances are presented by ExampleHR; the HCM remains the source of truth.
        </Typography>
      </header>
      <EmployeeTimeOff employeeId="e1" />
    </main>
  );
}
