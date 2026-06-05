import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Button } from '../button';
import { Toaster } from './toaster';
import { useToast } from './use-toast';

function ToastDemo() {
  const { toast } = useToast();

  return (
    <div className="flex gap-2">
      <Button onClick={() => toast({ title: 'Saved', description: 'Changes stored.' })}>
        Default
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast({ title: 'Success', description: 'All good!', variant: 'success' })}
      >
        Success
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({ title: 'Error', description: 'Something failed.', variant: 'error' })
        }
      >
        Error
      </Button>
      <Toaster />
    </div>
  );
}

const meta = {
  title: 'Shared/Toast',
  component: ToastDemo,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ToastDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
