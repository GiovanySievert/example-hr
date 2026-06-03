'use client';

import { useEffect, useState } from 'react';

import type { WriteBehavior } from './hcm';

const MOCKS_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING !== 'disabled';

export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!MOCKS_ENABLED);

  useEffect(() => {
    if (!MOCKS_ENABLED) return;
    let active = true;
    Promise.all([import('./browser'), import('./hcm')]).then(async ([{ worker }, hcm]) => {
      await worker.start({ onUnhandledRequest: 'bypass' });
      const globalWithHcm = window as typeof window & { hcm?: unknown };
      globalWithHcm.hcm = {
        bonus: (employeeId = 'e1', locationId = 'us', amount = 5) =>
          hcm.hcmStore.applyAnniversaryBonus({ employeeId, locationId }, amount),
        failNext: (behavior: WriteBehavior, employeeId = 'e1', locationId = 'us') =>
          hcm.hcmStore.setNextWriteBehavior({ employeeId, locationId }, behavior),
        reset: () => hcm.resetHcmStore(),
      };
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}
