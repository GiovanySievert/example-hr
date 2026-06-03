import type { Meta, StoryObj } from '@storybook/nextjs-vite';

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
      { ...base, id: 'r1', days: 2, status: 'pending' },
      { ...base, id: 'r2', days: 1, status: 'approved' },
      { ...base, id: 'r3', days: 3, status: 'denied', locationId: 'de' },
    ],
  },
};

export const OptimisticRolledBack: Story = {
  args: {
    requests: [{ ...base, id: 'r1', days: 2, status: 'pending', reverted: true }],
  },
};
