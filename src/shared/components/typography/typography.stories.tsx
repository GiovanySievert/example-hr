import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Typography } from './typography';

const meta = {
  title: 'Shared/Typography',
  component: Typography,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { children: 'The quick brown fox', variant: 'body' },
} satisfies Meta<typeof Typography>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Body: Story = {};

export const Heading: Story = {
  args: { variant: 'h1', children: 'Heading 1' },
};

export const Scale: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Typography variant="h1">Heading 1</Typography>
      <Typography variant="h2">Heading 2</Typography>
      <Typography variant="h3">Heading 3</Typography>
      <Typography variant="h4">Heading 4</Typography>
      <Typography variant="lead">Lead paragraph</Typography>
      <Typography variant="body">Body text</Typography>
      <Typography variant="small">Small text</Typography>
      <Typography variant="muted">Muted text</Typography>
    </div>
  ),
};
