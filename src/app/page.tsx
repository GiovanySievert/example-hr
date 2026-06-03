import Link from 'next/link';

import { Button, Typography } from '@/shared/components';

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 p-8">
      <div className="flex flex-col gap-2">
        <Typography variant="h1">ExampleHR</Typography>
        <Typography variant="lead">
          Time-off balances presented and orchestrated by ExampleHR, with the HCM
          as the source of truth.
        </Typography>
      </div>
      <div className="flex flex-wrap gap-4">
        <Link href="/time-off">
          <Button>Employee · Time off</Button>
        </Link>
        <Link href="/approvals">
          <Button variant="secondary">Manager · Approvals</Button>
        </Link>
      </div>
    </main>
  );
}
