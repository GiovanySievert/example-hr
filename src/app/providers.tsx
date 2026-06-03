'use client';

import { useState } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Provider as JotaiProvider } from 'jotai';

import { makeQueryClient } from '@/lib/query-client';
import { MockProvider } from '@/mocks/mock-provider';
import { Toaster } from '@/shared/components/toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <JotaiProvider>
        <MockProvider>{children}</MockProvider>
        <Toaster />
      </JotaiProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
