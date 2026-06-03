'use client';

import { useState } from 'react';

import { Button, Input, Typography } from '@/shared/components';

export type LocationOption = { id: string; label: string };

type TimeOffRequestFormProps = {
  locations: LocationOption[];
  maxDays?: number;
  submitting?: boolean;
  onSubmit: (values: { locationId: string; days: number }) => void;
};

export function TimeOffRequestForm({
  locations,
  maxDays,
  submitting = false,
  onSubmit,
}: TimeOffRequestFormProps) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [days, setDays] = useState('1');
  const [error, setError] = useState<string | null>(null);

  function validate(parsedDays: number): string | null {
    if (!locationId) return 'Select a location.';
    if (!Number.isInteger(parsedDays) || parsedDays <= 0) {
      return 'Enter a whole number of days greater than zero.';
    }
    if (maxDays !== undefined && parsedDays > maxDays) {
      return `You only have ${maxDays} day(s) available.`;
    }
    return null;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsedDays = Number(days);
    const validationError = validate(parsedDays);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onSubmit({ locationId, days: parsedDays });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="location" className="text-sm font-medium text-foreground">
          Location
        </label>
        <select
          id="location"
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="days" className="text-sm font-medium text-foreground">
          Days
        </label>
        <Input
          id="days"
          type="number"
          min={1}
          step={1}
          value={days}
          onChange={(event) => setDays(event.target.value)}
        />
      </div>

      {error ? (
        <Typography variant="small" className="text-foreground">
          {error}
        </Typography>
      ) : null}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Request time off'}
      </Button>
    </form>
  );
}
