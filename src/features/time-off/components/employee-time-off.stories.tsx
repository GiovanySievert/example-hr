import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import { delay, http, HttpResponse } from 'msw';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Toaster } from '@/shared/components/toast';
import {
  hcmHandlers,
  hcmStore,
  resetHcmStore,
  setLatencyEnabled,
  WriteBehavior,
} from '@/mocks/hcm';

import { TimeOffRequestStatus } from '../api/enums';
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

const NOW = '2026-06-03T00:00:00.000Z';

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(/Jun 8 - Jun 9 · 2 days · United States/),
    ).toBeInTheDocument();
    await expect(await canvas.findByText(/2 days · United States/)).toBeInTheDocument();
    await expect(await canvas.findByText(/1 day · Germany/)).toBeInTheDocument();
    await expect(canvas.queryByText(/5 days · United States/)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/4 days · United States/)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/3 days · Brazil/)).not.toBeInTheDocument();
  },
};

export const CancelPendingRequest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(/2 days · United States/)).toBeInTheDocument();
    await userEvent.click((await canvas.findAllByRole('button', { name: 'Cancel' }))[0]);

    await expect(
      await canvas.findByText('Request cancelled', undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByText('Cancelled')).toBeInTheDocument());
    await expect(canvas.getByText(/1 day · Germany/)).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByText('14')).toBeInTheDocument());
  },
};

export const RequestHistory: Story = {
  beforeEach: () => {
    resetHcmStore({
      balances: [
        {
          employeeId: 'e1',
          locationId: 'us',
          available: 14,
          pending: 0,
          version: 2,
          updatedAt: NOW,
        },
        {
          employeeId: 'e1',
          locationId: 'de',
          available: 3,
          pending: 0,
          version: 2,
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
          status: TimeOffRequestStatus.Approved,
          createdAt: NOW,
          updatedAt: NOW,
        },
        {
          id: 'r2',
          employeeId: 'e1',
          locationId: 'de',
          startDate: '2026-06-10',
          endDate: '2026-06-10',
          days: 1,
          status: TimeOffRequestStatus.Denied,
          createdAt: NOW,
          updatedAt: NOW,
        },
        {
          id: 'r3',
          employeeId: 'e1',
          locationId: 'us',
          startDate: '2026-06-11',
          endDate: '2026-06-11',
          days: 1,
          status: TimeOffRequestStatus.Cancelled,
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    });
    setLatencyEnabled(false);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByText('Approved')).toBeInTheDocument();
    await expect(await canvas.findByText('Denied')).toBeInTheDocument();
    await expect(await canvas.findByText('Cancelled')).toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  },
};

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

async function submitTwoDays(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await canvas.findByText('12');
  await userEvent.clear(await canvas.findByLabelText('Start date'));
  await userEvent.type(await canvas.findByLabelText('Start date'), '2026-06-12');
  await userEvent.clear(await canvas.findByLabelText('End date'));
  await userEvent.type(await canvas.findByLabelText('End date'), '2026-06-15');
  await userEvent.click(await canvas.findByRole('button', { name: /request time off/i }));
}

export const HcmRejectedInsufficient: Story = {
  beforeEach: () => {
    resetHcmStore();
    setLatencyEnabled(false);
    hcmStore.setNextWriteBehavior(
      { employeeId: 'e1', locationId: 'us' },
      WriteBehavior.InsufficientBalance,
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitTwoDays(canvasElement);
    await waitFor(() => expect(canvas.getByText('Request not filed')).toBeInTheDocument());
    await waitFor(() => expect(canvas.getByText('Reverted')).toBeInTheDocument());
    await waitFor(() => expect(canvas.getByText('12')).toBeInTheDocument());
  },
};

export const HcmSilentlyWrong: Story = {
  beforeEach: () => {
    resetHcmStore();
    setLatencyEnabled(false);
    hcmStore.setNextWriteBehavior(
      { employeeId: 'e1', locationId: 'us' },
      WriteBehavior.SilentWrong,
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitTwoDays(canvasElement);
    await waitFor(() =>
      expect(canvas.getByText('Request could not be confirmed')).toBeInTheDocument(),
    );
    await waitFor(() => expect(canvas.getByText('Reverted')).toBeInTheDocument());
    await waitFor(() => expect(canvas.getByText('12')).toBeInTheDocument());
  },
};

export const BalanceRefreshedMidSession: Story = {
  args: { employeeId: 'e1', reconcileIntervalMs: 200 },
  beforeEach: () => {
    resetHcmStore();
    setLatencyEnabled(false);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('12');
    hcmStore.applyAnniversaryBonus({ employeeId: 'e1', locationId: 'us' }, 5);
    await waitFor(() => expect(canvas.getByText('17')).toBeInTheDocument(), { timeout: 5000 });
    await waitFor(() => expect(canvas.getByText('Refreshed')).toBeInTheDocument());
  },
};
