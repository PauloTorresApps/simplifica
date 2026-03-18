export type LegalActType = 'DECRETO' | 'LEI' | 'MEDIDA_PROVISORIA';

export interface LegalActChunk {
  type: LegalActType;
  title: string;
  content: string;
  order: number;
}

const ACT_HEADER_REGEX =
  /(?:^|\n)\s*((?:DECRETO|LEI(?:\s+COMPLEMENTAR)?|MEDIDA\s+PROVIS[ÓO]RIA)(?:\s+N[º°oO\.]?\s*[\w.\/-]+)?[^\n]{0,180})\s*(?=\n|$)/gim;

const MIN_CHUNK_SIZE = 220;

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

function sanitizeTitle(title: string): string {
  return title.replace(/[ ]{2,}/g, ' ').trim();
}

function getActType(title: string): LegalActType {
  const upper = title.toUpperCase();

  if (upper.startsWith('DECRETO')) {
    return 'DECRETO';
  }

  if (/^MEDIDA\s+PROVIS[ÓO]RIA/i.test(title)) {
    return 'MEDIDA_PROVISORIA';
  }

  return 'LEI';
}

export function parseLegalActs(rawText: string): LegalActChunk[] {
  const text = normalizeWhitespace(rawText);

  if (!text) {
    return [];
  }

  const matches = Array.from(text.matchAll(ACT_HEADER_REGEX)).map((match) => ({
    title: sanitizeTitle(match[1] ?? ''),
    index: match.index ?? 0,
  }));

  if (matches.length === 0) {
    return [];
  }

  const chunks: LegalActChunk[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    const start = current.index;
    const end = next ? next.index : text.length;

    const fullChunk = text.slice(start, end).trim();

    if (fullChunk.length < MIN_CHUNK_SIZE) {
      continue;
    }

    const dedupeKey = `${current.title}|${fullChunk.slice(0, 140)}`.toUpperCase();

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);

    chunks.push({
      type: getActType(current.title),
      title: current.title,
      content: fullChunk,
      order: chunks.length + 1,
    });
  }

  return chunks;
}
