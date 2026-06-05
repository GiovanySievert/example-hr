'use client';

import { useState } from 'react';

import { Button, Input, Select, Typography } from '@/shared/components';

import { countBusinessDays, dateRangesOverlap, formatDayCount } from '../api/date-range';
import { TimeOffRequestStatus } from '../api/enums';
import { MAX_REQUEST_DATE, MAX_REQUEST_DATE_LABEL, validateTimeOffPolicy } from '../api/request-policy';
import type { TimeOffRequest } from '../api/types';

export type LocationOption = { id: string; label: string; available?: number };

type TimeOffRequestFormProps = {
  locations: LocationOption[];
  existingRequests?: Array<TimeOffRequest & { reverted?: boolean }>;
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
  existingRequests = [],
  maxDays,
  submitting = false,
  onSubmit,
}: TimeOffRequestFormProps) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [startDate, setStartDate] = useState('2026-06-12');
  const [endDate, setEndDate] = useState('2026-06-15');
  const [error, setError] = useState<string | null>(null);

  const outsideSupportedRange = startDate > MAX_REQUEST_DATE || endDate > MAX_REQUEST_DATE;
  const requestedDays = outsideSupportedRange ? 0 : countBusinessDays(startDate, endDate);
  const selectedLocationMaxDays =
    locations.find((location) => location.id === locationId)?.available ?? maxDays;
  const overlappingRequest = existingRequests.find(
    (request) =>
      !request.reverted &&
      (request.status === TimeOffRequestStatus.Pending ||
        request.status === TimeOffRequestStatus.Approved) &&
      dateRangesOverlap(startDate, endDate, request.startDate, request.endDate),
  );

  function validate(parsedDays: number): string | null {
    if (!locationId) return 'Select a location.';
    if (!startDate || !endDate) return 'Select a start and end date.';
    if (startDate > endDate) return 'End date must be on or after start date.';
    const policyViolation = validateTimeOffPolicy({ startDate, endDate, days: parsedDays });
    if (policyViolation) return policyViolation.message;
    if (overlappingRequest) {
      return 'This date range overlaps an existing time-off request.';
    }
    if (!Number.isInteger(parsedDays) || parsedDays <= 0) {
      return 'Select at least one weekday.';
    }
    if (selectedLocationMaxDays !== undefined && parsedDays > selectedLocationMaxDays) {
      return `You only have ${formatDayCount(selectedLocationMaxDays)} available.`;
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
  const requestSummary = outsideSupportedRange
    ? `Dates can be requested through ${MAX_REQUEST_DATE_LABEL}.`
    : `${formatDayCount(requestedDays, 'business day')} will be submitted for approval.`;

  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="location" className="text-sm font-medium text-foreground">
          Location
        </label>
        <Select
          id="location"
          value={locationId}
          disabled={submitting}
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
          className="time-off-date-input"
          max={MAX_REQUEST_DATE}
          disabled={submitting}
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
          className="time-off-date-input"
          max={MAX_REQUEST_DATE}
          disabled={submitting}
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
      </div>

      <Typography variant="muted">{requestSummary}</Typography>

      {error ? <FormError message={error} /> : null}

      <Button type="submit" disabled={submitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
