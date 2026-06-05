import { ManagerApprovals } from '@/features/time-off';
import { LinkButton, Typography } from '@/shared/components';

export default function ApprovalsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 sm:p-8">
      <LinkButton href="/" variant="secondary" className="w-fit">
        ← Back to home
      </LinkButton>
      <header className="flex flex-col gap-2">
        <Typography variant="h2">Approvals</Typography>
        <Typography variant="muted">
          Each decision is made against the balance re-read from the HCM at that moment.
        </Typography>
      </header>
      <ManagerApprovals />
    </main>
  );
}
