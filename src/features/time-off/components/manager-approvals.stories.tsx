import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';

import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Toaster } from '@/shared/components/toast';
import { hcmStore, resetHcmStore, setLatencyEnabled } from '@/mocks/hcm';

import { TimeOffRequestStatus } from '../api/enums';
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

export const PendingBalanceOk: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('heading', { name: 'Employee e1' })).toBeInTheDocument();
    await expect(await canvas.findByRole('heading', { name: 'Employee e2' })).toBeInTheDocument();
    await expect(await canvas.findByRole('heading', { name: 'Employee e3' })).toBeInTheDocument();
    await waitFor(() => expect(canvas.getAllByText('2 pending requests')).toHaveLength(2));
    await expect(canvas.getAllByText('1 pending request')).toHaveLength(1);
    await expect(canvas.getAllByText('Employee e1')).toHaveLength(1);
    await expect(await canvas.findAllByText(/overlapping time off/)).not.toHaveLength(0);
  },
};

function seedSingleRequest() {
  resetHcmStore({
    balances: [
      {
        employeeId: 'e1',
        locationId: 'us',
        available: 12,
        pending: 2,
        version: 1,
        updatedAt: NOW,
      },
    ],
    requests: [
      {
        id: 'r1',
        employeeId: 'e1',
        locationId: 'us',
        startDate: '2026-06-08',
        endDate: '2026-06-09',
        days: 2,
        status: TimeOffRequestStatus.Pending,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
  });
  setLatencyEnabled(false);
}

export const ApprovalSuccess: Story = {
  beforeEach: seedSingleRequest,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const approve = await canvas.findByRole('button', { name: 'Approve' });
    await waitFor(() => expect(approve).toBeEnabled());
    await userEvent.click(approve);
    await expect(
      await canvas.findByText('Request approved', undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  },
};

export const Denial: Story = {
  beforeEach: seedSingleRequest,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: 'Deny' }));
    await expect(
      await canvas.findByText('Request denied', undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  },
};

export const BalanceChangedBeforeApprove: Story = {
  beforeEach: seedSingleRequest,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const approve = await canvas.findByRole('button', { name: 'Approve' });
    await waitFor(() => expect(approve).toBeEnabled());
    hcmStore.approveRequest('r1');
    await userEvent.click(approve);
    await expect(
      await canvas.findByText('Approval failed', undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  },
};

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
          startDate: '2026-06-08',
          endDate: '2026-06-12',
          days: 5,
          status: TimeOffRequestStatus.Pending,
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    });
    setLatencyEnabled(false);
  },
};
