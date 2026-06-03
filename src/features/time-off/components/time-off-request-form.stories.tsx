import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { TimeOffRequestForm } from './time-off-request-form';

const meta = {
  title: 'TimeOff/TimeOffRequestForm',
  component: TimeOffRequestForm,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: {
    locations: [
      { id: 'us', label: 'United States' },
      { id: 'de', label: 'Germany' },
    ],
    onSubmit: fn(),
  },
} satisfies Meta<typeof TimeOffRequestForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Submitting: Story = {
  args: { submitting: true },
};

export const WithMaxDays: Story = {
  args: { maxDays: 3 },
};
