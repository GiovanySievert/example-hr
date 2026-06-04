import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { resetHcmStore, setLatencyEnabled } from '@/mocks/hcm';
import { Toaster } from '@/shared/components/toast';

import { EmployeeTimeOffShell } from './employee-time-off-shell';

function withProviders(Story: () => React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <JotaiProvider>
        <div className="p-6">
          <Story />
          <Toaster />
        </div>
      </JotaiProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: 'TimeOff/EmployeeTimeOffShell',
  component: EmployeeTimeOffShell,
  parameters: { layout: 'fullscreen' },
  decorators: [withProviders],
  beforeEach: () => {
    resetHcmStore();
    setLatencyEnabled(false);
  },
} satisfies Meta<typeof EmployeeTimeOffShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SwitchEmployee: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const employeeSelect = await canvas.findByLabelText('Acting as');

    await expect(await canvas.findByText(/2 day\(s\) · United States/)).toBeInTheDocument();
    await expect(canvas.queryByText(/3 day\(s\) · Brazil/)).not.toBeInTheDocument();

    await userEvent.selectOptions(employeeSelect, 'e3');

    await waitFor(() => expect(canvas.getByText(/3 day\(s\) · Brazil/)).toBeInTheDocument());
    await expect(canvas.queryByText(/1 day\(s\) · Germany/)).not.toBeInTheDocument();
  },
};
