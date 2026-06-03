import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { BalanceCard } from './balance-card';

const balance = {
  employeeId: 'e1',
  locationId: 'us',
  available: 12,
  pending: 0,
  version: 1,
  updatedAt: '2026-06-03T00:00:00.000Z',
};

const meta = {
  title: 'TimeOff/BalanceCard',
  component: BalanceCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { balance, locationLabel: 'United States' },
} satisfies Meta<typeof BalanceCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const OptimisticPending: Story = {
  args: {
    status: 'optimistic',
    balance: { ...balance, available: 9, pending: 3 },
  },
};

export const Stale: Story = {
  args: { status: 'stale' },
};

export const Refreshed: Story = {
  args: {
    status: 'refreshed',
    balance: { ...balance, available: 17, version: 2 },
  },
};
