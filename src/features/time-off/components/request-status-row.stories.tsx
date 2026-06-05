import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { TimeOffRequestStatus } from '../api/enums';
import { RequestStatusRow } from './request-status-row';

const base = {
  id: 'r1',
  employeeId: 'e1',
  locationId: 'us',
  startDate: '2026-06-08',
  endDate: '2026-06-11',
  days: 4,
  createdAt: '2026-06-03T00:00:00.000Z',
  updatedAt: '2026-06-03T00:00:00.000Z',
};

const meta = {
  title: 'TimeOff/RequestStatusRow',
  component: RequestStatusRow,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { locationLabel: 'United States', onCancel: fn() },
} satisfies Meta<typeof RequestStatusRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PendingCancellable: Story = {
  args: { request: { ...base, status: TimeOffRequestStatus.Pending } },
};

export const Cancelling: Story = {
  args: { request: { ...base, status: TimeOffRequestStatus.Pending }, cancelling: true },
};

export const PendingNotCancellable: Story = {
  args: { request: { ...base, status: TimeOffRequestStatus.Pending }, onCancel: undefined },
};

export const Approved: Story = {
  args: { request: { ...base, status: TimeOffRequestStatus.Approved } },
};

export const Denied: Story = {
  args: { request: { ...base, status: TimeOffRequestStatus.Denied } },
};

export const Cancelled: Story = {
  args: { request: { ...base, status: TimeOffRequestStatus.Cancelled } },
};

export const Reverted: Story = {
  args: { request: { ...base, status: TimeOffRequestStatus.Pending, reverted: true } },
};
