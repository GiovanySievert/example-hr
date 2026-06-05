import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { TimeOffRequestStatus } from '../api/enums';
import { PendingApprovalRow } from './pending-approval-row';

const request = {
  id: 'r1',
  employeeId: 'e1',
  locationId: 'us',
  days: 2,
  status: TimeOffRequestStatus.Pending,
  createdAt: '2026-06-03T00:00:00.000Z',
  updatedAt: '2026-06-03T00:00:00.000Z',
};

const balance = {
  employeeId: 'e1',
  locationId: 'us',
  available: 12,
  pending: 2,
  version: 1,
  updatedAt: '2026-06-03T00:00:00.000Z',
};

const meta = {
  title: 'TimeOff/PendingApprovalRow',
  component: PendingApprovalRow,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: {
    request,
    balance,
    locationLabel: 'United States',
    onApprove: fn(),
    onDeny: fn(),
    onRefresh: fn(),
  },
} satisfies Meta<typeof PendingApprovalRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const BalanceOk: Story = {};

export const BalanceInsufficient: Story = {
  args: {
    request: { ...request, days: 99 },
  },
};

export const BalanceLoading: Story = {
  args: { balance: undefined, balanceLoading: true },
};

export const Stale: Story = {
  args: { stale: true },
};

export const Deciding: Story = {
  args: { deciding: true },
};
