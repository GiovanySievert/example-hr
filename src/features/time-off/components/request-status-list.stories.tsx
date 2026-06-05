import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TimeOffRequestStatus } from '../api/enums';
import { RequestStatusList } from './request-status-list';

const base = {
  employeeId: 'e1',
  locationId: 'us',
  startDate: '2026-06-08',
  endDate: '2026-06-09',
  createdAt: '2026-06-03T00:00:00.000Z',
  updatedAt: '2026-06-03T00:00:00.000Z',
};

const meta = {
  title: 'TimeOff/RequestStatusList',
  component: RequestStatusList,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { locationLabels: { us: 'United States', de: 'Germany' } },
} satisfies Meta<typeof RequestStatusList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { requests: [] },
};

export const Loading: Story = {
  args: { requests: [], loading: true },
};

export const Error: Story = {
  args: { requests: [], error: true },
};

export const Mixed: Story = {
  args: {
    requests: [
      { ...base, id: 'r1', days: 2, status: TimeOffRequestStatus.Pending },
      { ...base, id: 'r2', days: 1, status: TimeOffRequestStatus.Approved },
      { ...base, id: 'r3', days: 3, status: TimeOffRequestStatus.Denied, locationId: 'de' },
      { ...base, id: 'r4', days: 1, status: TimeOffRequestStatus.Cancelled, locationId: 'de' },
    ],
  },
};

export const Syncing: Story = {
  args: {
    ...Mixed.args,
    refreshing: true,
  },
};

export const OptimisticRolledBack: Story = {
  args: {
    requests: [
      { ...base, id: 'r1', days: 2, status: TimeOffRequestStatus.Pending, reverted: true },
    ],
  },
};
