import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TimeOffRequestStatus } from '../api/enums';
import { TimeOffRequestForm } from './time-off-request-form';

const locations = [
  { id: 'us', label: 'United States', available: 12 },
  { id: 'de', label: 'Germany', available: 3 },
];

const existingRequest = {
  id: 'r1',
  employeeId: 'e1',
  locationId: 'us',
  startDate: '2026-06-08',
  endDate: '2026-06-11',
  days: 4,
  status: TimeOffRequestStatus.Pending,
  createdAt: '2026-06-03T00:00:00.000Z',
  updatedAt: '2026-06-03T00:00:00.000Z',
};

describe('TimeOffRequestForm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-05T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('caps request dates at the end of 2099', () => {
    const onSubmit = vi.fn();
    render(<TimeOffRequestForm locations={locations} onSubmit={onSubmit} />);

    expect(screen.getByLabelText('Start date')).toHaveAttribute('max', '2099-12-31');
    expect(screen.getByLabelText('End date')).toHaveAttribute('max', '2099-12-31');

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-06-08' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '34444-06-09' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request time off' }));

    expect(screen.getByText('Select dates on or before Dec 31, 2099.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates the requested days against the selected location balance', () => {
    const onSubmit = vi.fn();
    render(<TimeOffRequestForm locations={locations} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'de' } });
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-06-12' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-06-17' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request time off' }));

    expect(screen.getByText('You only have 3 days available.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires at least three days of advance notice', () => {
    const onSubmit = vi.fn();
    render(<TimeOffRequestForm locations={locations} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-06-07' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-06-08' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request time off' }));

    expect(screen.getByText('Requests must start at least 3 days from today.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks requests crossing the fiscal year boundary', () => {
    const onSubmit = vi.fn();
    render(<TimeOffRequestForm locations={locations} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-12-30' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2027-01-02' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request time off' }));

    expect(screen.getByText('Requests cannot cross the fiscal year boundary.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks requests longer than ten business days', () => {
    const onSubmit = vi.fn();
    render(<TimeOffRequestForm locations={locations} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-06-12' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-06-27' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request time off' }));

    expect(screen.getByText('Requests cannot exceed 10 business days.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks date ranges that overlap an active request', () => {
    const onSubmit = vi.fn();
    render(
      <TimeOffRequestForm
        locations={locations}
        existingRequests={[existingRequest]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-06-10' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-06-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request time off' }));

    expect(
      screen.getByText('This date range overlaps an existing time-off request.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('allows date ranges that overlap only cancelled or denied requests', () => {
    const onSubmit = vi.fn();
    render(
      <TimeOffRequestForm
        locations={locations}
        existingRequests={[
          { ...existingRequest, status: TimeOffRequestStatus.Cancelled },
          { ...existingRequest, id: 'r2', status: TimeOffRequestStatus.Denied },
        ]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-06-10' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-06-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request time off' }));

    expect(onSubmit).toHaveBeenCalledWith({
      locationId: 'us',
      startDate: '2026-06-10',
      endDate: '2026-06-10',
      days: 1,
    });
  });

  it('allows ten business days when the selected location has enough balance', () => {
    const onSubmit = vi.fn();
    render(<TimeOffRequestForm locations={locations} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'us' } });
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-06-12' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-06-25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request time off' }));

    expect(onSubmit).toHaveBeenCalledWith({
      locationId: 'us',
      startDate: '2026-06-12',
      endDate: '2026-06-25',
      days: 10,
    });
  });
});
