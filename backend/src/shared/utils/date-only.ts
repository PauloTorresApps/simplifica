const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParts(date: string): [number, number, number] {
  if (!ISO_DATE_ONLY_REGEX.test(date)) {
    throw new Error(`Data invalida (esperado YYYY-MM-DD): ${date}`);
  }

  const [year, month, day] = date.split('-').map(Number);
  return [year, month, day];
}

export function parseIsoDateOnlyToUtcDate(date: string): Date {
  const [year, month, day] = parseDateParts(date);
  return new Date(Date.UTC(year, month - 1, day));
}

export function getUtcDateRange(date: string): { startDate: Date; endDate: Date } {
  const [year, month, day] = parseDateParts(date);

  const startDate = new Date(Date.UTC(year, month - 1, day));
  const endDate = new Date(Date.UTC(year, month - 1, day + 1));

  return { startDate, endDate };
}
