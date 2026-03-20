import { describe, expect, it } from 'vitest';
import { getUtcDateRange, parseIsoDateOnlyToUtcDate } from '../../../src/shared/utils/date-only';

describe('date-only utils', () => {
  it('parses YYYY-MM-DD as UTC midnight without timezone drift', () => {
    const parsed = parseIsoDateOnlyToUtcDate('2026-03-06');

    expect(parsed.toISOString()).toBe('2026-03-06T00:00:00.000Z');
  });

  it('builds an inclusive-exclusive UTC day range', () => {
    const { startDate, endDate } = getUtcDateRange('2026-03-06');

    expect(startDate.toISOString()).toBe('2026-03-06T00:00:00.000Z');
    expect(endDate.toISOString()).toBe('2026-03-07T00:00:00.000Z');
  });

  it('throws on invalid date-only values', () => {
    expect(() => parseIsoDateOnlyToUtcDate('06/03/2026')).toThrowError(
      'Data invalida (esperado YYYY-MM-DD): 06/03/2026'
    );
  });
});
