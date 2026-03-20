import { describe, expect, it } from 'vitest';
import { formatPublicationDate } from './publication-date';

describe('formatPublicationDate', () => {
  it('formats date-only strings without shifting day', () => {
    const formatted = formatPublicationDate('2026-03-06');

    expect(formatted.startsWith('06 de ')).toBe(true);
    expect(formatted.endsWith(' de 2026')).toBe(true);
  });

  it('formats ISO timestamps using the date part', () => {
    const formatted = formatPublicationDate('2026-03-09T00:00:00.000Z');

    expect(formatted.startsWith('09 de ')).toBe(true);
    expect(formatted.endsWith(' de 2026')).toBe(true);
  });
});
