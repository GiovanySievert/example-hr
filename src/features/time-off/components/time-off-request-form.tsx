'use client';

import { useState } from 'react';

import { Button, Input, Select, Typography } from '@/shared/components';

import { countBusinessDays } from '../api/date-range';

export type LocationOption = { id: string; label: string };

type TimeOffRequestFormProps = {
  locations: LocationOption[];
  maxDays?: number;
  submitting?: boolean;
  onSubmit: (values: {
    locationId: string;
    startDate: string;
    endDate: string;
    days: number;
  }) => void;
};

function FormError({ message }: { message: string }) {
  return (
    <Typography variant="small" className="text-foreground">
      {message}
    </Typography>
  );
}

export function TimeOffRequestForm({
  locations,
  maxDays,
  submitting = false,
  onSubmit,
}: TimeOffRequestFormProps) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [startDate, setStartDate] = useState('2026-06-08');
  const [endDate, setEndDate] = useState('2026-06-09');
  const [error, setError] = useState<string | null>(null);

  const requestedDays = countBusinessDays(startDate, endDate);

  function validate(parsedDays: number): string | null {
    if (!locationId) return 'Select a location.';
    if (!startDate || !endDate) return 'Select a start and end date.';
    if (startDate > endDate) return 'End date must be on or after start date.';
    if (!Number.isInteger(parsedDays) || parsedDays <= 0) {
      return 'Select at least one weekday.';
    }
    if (maxDays !== undefined && parsedDays > maxDays) {
      return `You only have ${maxDays} day(s) available.`;
    }
    return null;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsedDays = requestedDays;
    const validationError = validate(parsedDays);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onSubmit({ locationId, startDate, endDate, days: parsedDays });
  }

  const submitLabel = submitting ? 'Submitting…' : 'Request time off';

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="location" className="text-sm font-medium text-foreground">
          Location
        </label>
        <Select
          id="location"
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
          options={locations.map((location) => ({ value: location.id, label: location.label }))}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="start-date" className="text-sm font-medium text-foreground">
          Start date
        </label>
        <Input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="end-date" className="text-sm font-medium text-foreground">
          End date
        </label>
        <Input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
      </div>

      <Typography variant="muted">
        {requestedDays} business day(s) will be submitted for approval.
      </Typography>

      {error ? <FormError message={error} /> : null}

      <Button type="submit" disabled={submitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
