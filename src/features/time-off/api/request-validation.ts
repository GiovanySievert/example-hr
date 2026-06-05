import { dateRangesOverlap, formatDayCount } from './date-range';
import { TimeOffRequestStatus } from './enums';
import { validateTimeOffPolicy } from './request-policy';
import type { TimeOffRequest } from './types';

export type ExistingRequest = TimeOffRequest & { reverted?: boolean };

export type ValidateRequestInput = {
  locationId: string;
  startDate: string;
  endDate: string;
  days: number;
  maxDays?: number;
  existingRequests?: ExistingRequest[];
};

export function findOverlappingRequest(
  startDate: string,
  endDate: string,
  existingRequests: ExistingRequest[],
): ExistingRequest | undefined {
  return existingRequests.find(
    (request) =>
      !request.reverted &&
      (request.status === TimeOffRequestStatus.Pending ||
        request.status === TimeOffRequestStatus.Approved) &&
      dateRangesOverlap(startDate, endDate, request.startDate, request.endDate),
  );
}

export function validateTimeOffRequest({
  locationId,
  startDate,
  endDate,
  days,
  maxDays,
  existingRequests = [],
}: ValidateRequestInput): string | null {
  if (!locationId) return 'Select a location.';
  if (!startDate || !endDate) return 'Select a start and end date.';
  if (startDate > endDate) return 'End date must be on or after start date.';

  const policyViolation = validateTimeOffPolicy({ startDate, endDate, days });
  if (policyViolation) return policyViolation.message;

  if (findOverlappingRequest(startDate, endDate, existingRequests)) {
    return 'This date range overlaps an existing time-off request.';
  }

  if (!Number.isInteger(days) || days <= 0) {
    return 'Select at least one weekday.';
  }

  if (maxDays !== undefined && days > maxDays) {
    return `You only have ${formatDayCount(maxDays)} available.`;
  }

  return null;
}
