import { countBusinessDays } from './date-range';

export const MIN_ADVANCE_DAYS = 3;
export const MAX_BUSINESS_DAYS_PER_REQUEST = 10;
export const MAX_REQUEST_DATE = '2099-12-31';
export const MAX_REQUEST_DATE_LABEL = 'Dec 31, 2099';

export type PolicyViolation = {
  message: string;
};

function parseDateOnly(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(date: string, days: number) {
  const parsed = parseDateOnly(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function todayDateOnly(now = new Date()) {
  return toDateOnly(now);
}

export function validateTimeOffPolicy({
  startDate,
  endDate,
  days,
  today = todayDateOnly(),
}: {
  startDate: string;
  endDate: string;
  days?: number;
  today?: string;
}): PolicyViolation | null {
  if (startDate > MAX_REQUEST_DATE || endDate > MAX_REQUEST_DATE) {
    return { message: `Select dates on or before ${MAX_REQUEST_DATE_LABEL}.` };
  }

  const minStartDate = addCalendarDays(today, MIN_ADVANCE_DAYS);
  if (startDate < minStartDate) {
    return { message: `Requests must start at least ${MIN_ADVANCE_DAYS} days from today.` };
  }

  if (startDate.slice(0, 4) !== endDate.slice(0, 4)) {
    return { message: 'Requests cannot cross the fiscal year boundary.' };
  }

  const requestedDays = days ?? countBusinessDays(startDate, endDate);
  if (requestedDays > MAX_BUSINESS_DAYS_PER_REQUEST) {
    return {
      message: `Requests cannot exceed ${MAX_BUSINESS_DAYS_PER_REQUEST} business days.`,
    };
  }

  return null;
}
