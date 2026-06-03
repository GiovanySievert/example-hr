import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import { delay, http, HttpResponse } from 'msw';

import { Toaster } from '@/shared/components/toast';
import {
  hcmHandlers,
  hcmStore,
  resetHcmStore,
  setLatencyEnabled,
} from '@/mocks/hcm';

import { EmployeeTimeOff } from './employee-time-off';

function withProviders(Story: () => React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <JotaiProvider>
        <div className="p-6">
          <Story />
          <Toaster />
        </div>
      </JotaiProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: 'TimeOff/EmployeeTimeOff',
  component: EmployeeTimeOff,
  parameters: { layout: 'fullscreen' },
  args: { employeeId: 'e1' },
  decorators: [withProviders],
  beforeEach: () => {
    resetHcmStore();
    setLatencyEnabled(false);
  },
} satisfies Meta<typeof EmployeeTimeOff>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/hcm/balances', async () => {
          await delay('infinite');
          return HttpResponse.json([]);
        }),
        ...hcmHandlers,
      ],
    },
  },
};

export const Empty: Story = {
  beforeEach: () => {
    resetHcmStore({ balances: [], requests: [] });
    setLatencyEnabled(false);
  },
};

export const HcmRejectedInsufficient: Story = {
  beforeEach: () => {
    resetHcmStore();
    setLatencyEnabled(false);
    hcmStore.setNextWriteBehavior(
      { employeeId: 'e1', locationId: 'us' },
      'insufficient-balance',
    );
  },
};

export const HcmSilentlyWrong: Story = {
  beforeEach: () => {
    resetHcmStore();
    setLatencyEnabled(false);
    hcmStore.setNextWriteBehavior(
      { employeeId: 'e1', locationId: 'us' },
      'silent-wrong',
    );
  },
};

export const BalanceRefreshedMidSession: Story = {
  beforeEach: () => {
    resetHcmStore();
    setLatencyEnabled(false);
  },
};
