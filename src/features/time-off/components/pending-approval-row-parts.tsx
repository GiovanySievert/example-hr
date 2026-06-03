import { Button, Typography } from '@/shared/components';

import type { Balance } from '../api/types';

export function BalanceContext({ balance, loading }: { balance?: Balance; loading: boolean }) {
  if (loading) {
    return <Typography variant="muted">Reading balance…</Typography>;
  }
  if (!balance) {
    return null;
  }
  return (
    <div className="text-right">
      <Typography variant="muted">Available</Typography>
      <Typography variant="h4" as="span">
        {balance.available}
      </Typography>
    </div>
  );
}

export function StaleWarning({
  onRefresh,
  disabled,
}: {
  onRefresh: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary p-3">
      <Typography variant="muted">
        The balance changed since you opened this. Re-read before deciding.
      </Typography>
      <Button variant="secondary" onClick={onRefresh} disabled={disabled}>
        Re-read
      </Button>
    </div>
  );
}

export function InsufficientNote() {
  return <Typography variant="muted">Insufficient available balance for this request.</Typography>;
}

export function DecisionActions({
  deciding,
  approveDisabled,
  onApprove,
  onDeny,
}: {
  deciding: boolean;
  approveDisabled: boolean;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const approveLabel = deciding ? 'Working…' : 'Approve';
  return (
    <div className="flex gap-3">
      <Button onClick={onApprove} disabled={approveDisabled}>
        {approveLabel}
      </Button>
      <Button variant="secondary" onClick={onDeny} disabled={deciding}>
        Deny
      </Button>
    </div>
  );
}
