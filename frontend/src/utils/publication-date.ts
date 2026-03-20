import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function extractDateOnly(value: string): string {
  if (ISO_DATE_ONLY_REGEX.test(value)) {
    return value;
  }

  const candidate = value.slice(0, 10);

  if (ISO_DATE_ONLY_REGEX.test(candidate)) {
    return candidate;
  }

  return value;
}

function parseDateOnlyAsLocalDate(value: string): Date {
  const dateOnly = extractDateOnly(value);
  const [year, month, day] = dateOnly.split('-').map(Number);

  if (!year || !month || !day) {
    return new Date(value);
  }

  return new Date(year, month - 1, day);
}

export function formatPublicationDate(value: string): string {
  return format(parseDateOnlyAsLocalDate(value), "dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });
}
