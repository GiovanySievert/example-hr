import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';

import { Toaster } from '@/shared/components/toast';
import { resetHcmStore, setLatencyEnabled } from '@/mocks/hcm';

import { ManagerApprovals } from './manager-approvals';

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

const NOW = '2026-06-03T00:00:00.000Z';

const meta = {
  title: 'TimeOff/ManagerApprovals',
  component: ManagerApprovals,
  parameters: { layout: 'fullscreen' },
  decorators: [withProviders],
  beforeEach: () => {
    resetHcmStore();
    setLatencyEnabled(false);
  },
} satisfies Meta<typeof ManagerApprovals>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PendingBalanceOk: Story = {};

export const Empty: Story = {
  beforeEach: () => {
    resetHcmStore({
      balances: [
        {
          employeeId: 'e1',
          locationId: 'us',
          available: 12,
          pending: 0,
          version: 1,
          updatedAt: NOW,
        },
      ],
      requests: [],
    });
    setLatencyEnabled(false);
  },
};

export const PendingBalanceInsufficient: Story = {
  beforeEach: () => {
    resetHcmStore({
      balances: [
        {
          employeeId: 'e1',
          locationId: 'us',
          available: 1,
          pending: 5,
          version: 1,
          updatedAt: NOW,
        },
      ],
      requests: [
        {
          id: 'r1',
          employeeId: 'e1',
          locationId: 'us',
          days: 5,
          status: 'pending',
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    });
    setLatencyEnabled(false);
  },
};
