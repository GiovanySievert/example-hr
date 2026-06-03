import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TimeOffRequestStatus } from '../api/enums';
import { RequestStatusList } from './request-status-list';

const base = {
  employeeId: 'e1',
  locationId: 'us',
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

export const Mixed: Story = {
  args: {
    requests: [
      { ...base, id: 'r1', days: 2, status: TimeOffRequestStatus.Pending },
      { ...base, id: 'r2', days: 1, status: TimeOffRequestStatus.Approved },
      { ...base, id: 'r3', days: 3, status: TimeOffRequestStatus.Denied, locationId: 'de' },
    ],
  },
};

export const OptimisticRolledBack: Story = {
  args: {
    requests: [
      { ...base, id: 'r1', days: 2, status: TimeOffRequestStatus.Pending, reverted: true },
    ],
  },
};
