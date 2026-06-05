import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from '../button';

const meta = {
  title: 'Shared/Card',
  component: Card,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Employee</CardTitle>
        <CardDescription>Team member details</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted">Ada Lovelace — Engineering</p>
      </CardContent>
      <CardFooter>
        <Button>View profile</Button>
      </CardFooter>
    </Card>
  ),
};
