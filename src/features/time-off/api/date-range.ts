const DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

function parseDateOnly(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function countBusinessDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;

  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return 0;
  }

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}

export function formatDateRange(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return null;

  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const startLabel = DATE_FORMATTER.format(start);
  const endLabel = DATE_FORMATTER.format(end);
  return startDate === endDate ? startLabel : `${startLabel}-${endLabel}`;
}
