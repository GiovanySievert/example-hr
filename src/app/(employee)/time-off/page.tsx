import { EmployeeTimeOffShell } from '@/features/time-off';
import { LinkButton, Typography } from '@/shared/components';

export default function TimeOffPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 sm:p-8">
      <LinkButton href="/" variant="secondary" className="w-fit">
        ← Back to home
      </LinkButton>
      <header className="flex flex-col gap-2">
        <Typography variant="h2">Time off</Typography>
        <Typography variant="muted">
          Your balances are presented by ExampleHR; the HCM remains the source of truth.
        </Typography>
      </header>
      <EmployeeTimeOffShell />
    </main>
  );
}
