'use client';

import { useEffect, useState } from 'react';

const MOCKS_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING !== 'disabled';

export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!MOCKS_ENABLED);

  useEffect(() => {
    if (!MOCKS_ENABLED) return;
    let active = true;
    import('./browser').then(async ({ worker }) => {
      await worker.start({ onUnhandledRequest: 'bypass' });
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}
