import { ManagerApprovals } from '@/features/time-off';
import { Typography } from '@/shared/components';

export default function ApprovalsPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-1">
        <Typography variant="h2">Approvals</Typography>
        <Typography variant="muted">
          Each decision is made against the balance re-read from the HCM at that moment.
        </Typography>
      </header>
      <ManagerApprovals />
    </main>
  );
}
