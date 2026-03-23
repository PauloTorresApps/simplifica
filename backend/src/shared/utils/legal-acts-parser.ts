export type LegalActType = 'DECRETO' | 'LEI' | 'MEDIDA_PROVISORIA';

export interface LegalActChunk {
  type: LegalActType;
  title: string;
  content: string;
  order: number;
}

export interface LegalActsParseDiagnostics {
  hasInput: boolean;
  executiveSectionFound: boolean;
  headerMatches: number;
  keptChunks: number;
  discardedShort: number;
  discardedNonNormative: number;
  discardedDuplicate: number;
}

export interface LegalActsParseResult {
  chunks: LegalActChunk[];
  diagnostics: LegalActsParseDiagnostics;
}

const ACT_HEADER_REGEX =
  /(?:^|\n)\s*((?:DECRETO|LEI(?:\s+COMPLEMENTAR)?|MEDIDA\s+PROVIS[ÓO]RIA)(?:\s+N[º°oO\.]?\s*[\w.\/-]+)?[^\n]{0,180})\s*(?=\n|$)/gim;

const MIN_CHUNK_SIZE_DEFAULT = 220;
const MIN_CHUNK_SIZE_DECRETO = 60;
const MIN_CHUNK_SIZE_MEDIDA_PROVISORIA = 140;
const EXECUTIVE_SECTION_TITLE = 'ATOS DO CHEFE DO PODER EXECUTIVO';
const NORMATIVE_SIGNAL_REGEX =
  /\b(ART\.?\s*1\b|DECRETA\s*:|FICA\s+(INSTITUID[AO]|CRIAD[AO]|ALTERAD[AO]|REVOGAD[AO]|APROVAD[AO])|REVOGA(?:M)?(?:-SE)?\b|ENTRA\s+EM\s+VIGOR\b|LEI\s+N[º°oO\.]?\s*\d|DECRETO\s+N[º°oO\.]?\s*\d|MEDIDA\s+PROVIS[ÓO]RIA\s+N[º°oO\.]?\s*\d)\b/i;
const REFERENCE_ONLY_REGEX =
  /\b(COM\s+FUNDAMENTO\s+NA\s+LEI|NOS\s+TERMOS\s+DA\s+LEI|NA\s+FORMA\s+DA\s+LEI|DE\s+ACORDO\s+COM\s+A\s+LEI|EM\s+CONFORMIDADE\s+COM\s+A\s+LEI|CONFORME\s+DISPOE\s+A\s+LEI|NOS\s+TERMOS\s+DO\s+DECRETO|COM\s+BASE\s+NA\s+LEI)\b/i;
const LEI_REFERENCE_PHRASE_REGEX =
  /\b(?:NA\s+LEI|DA\s+LEI|SEGUNDO\s+A\s+LEI)\b/i;
const LEI_ACCEPTANCE_SIGNAL_REGEX =
  /\b(ESTA\s+LEI\s+ENTRA\s+EM\s+VIGOR|ALTERA\s+A\s+LEI|SANCIONO\s+A\s+SEGUINTE\s+LEI)\b/i;
const LEI_PUBLICATION_SIGNAL_REGEX =
  /\b(SANCIONO\s+A\s+SEGUINTE\s+LEI|FA[ÇC]O\s+SABER\s+QUE\s+A\s+ASSEMBLEIA\s+LEGISLATIVA|ASSEMBLEIA\s+LEGISLATIVA\s+DO\s+ESTADO\s+DO\s+TOCANTINS\s+DECRETA\s+E\s+EU\s+SANCIONO)\b/i;
const DECRETO_REFERENCE_PHRASE_REGEX =
  /\b(?:DO\s+DECRETO|COM\s+O\s+DECRETO|NO\s+DECRETO|PELO\s+DECRETO)\b/i;
const DECRETO_ACCEPTANCE_SIGNAL_REGEX =
  /\b(ESTE\s+DECRETO\s+ENTRA\s+EM\s+VIGOR|REVOGA\s+O\s+DECRETO|DESTE\s+DECRETO)\b/i;
const DECRETO_PUBLICATION_SIGNAL_REGEX =
  /\b(O\s+GOVERNADOR\s+DO\s+ESTADO\s+DO\s+TOCANTINS|DECRETA\s*:)\b/i;
const PERSONNEL_ACT_EXCLUSION_REGEX =
  /\b(NOMEIA|EXONERA|DESIGNA|DISPENSA|TORNA\s+SEM\s+EFEITO|CARGO\s+EM\s+COMISSAO|SERVIDOR(?:A)?(?:\s+PUBLICO)?)\b/i;
const ACT_NUMBER_REGEX =
  /^(?:DECRETO|LEI(?:\s+COMPLEMENTAR)?|MEDIDA\s+PROVIS[ÓO]RIA)\s+N[º°oO\.]?\s*[\w.\/-]+/i;
const ACT_DATE_CLAUSE_REGEX =
  /\bDE\s+\d{1,2}\s+DE\s+[A-ZÀ-Ýa-zà-ý]+\s+DE\s+\d{4}\b/i;

function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

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

function extractExecutiveSection(text: string): string {
  const normalizedText = normalizeForSearch(text);
  const sectionIndex = normalizedText.indexOf(EXECUTIVE_SECTION_TITLE);

  if (sectionIndex < 0) {
    return '';
  }

  const sectionStart = text.indexOf('\n', sectionIndex);
  const contentStart = sectionStart >= 0 ? sectionStart + 1 : sectionIndex;

  // Section boundary is resolved earlier in DOE extraction using sumario page limits.
  // Here we only trim content before the executive section header.
  return text.slice(contentStart).trim();
}

function isHeaderInReferenceContext(text: string, headerIndex: number): boolean {
  const contextStart = Math.max(0, headerIndex - 80);
  const beforeHeader = text.slice(contextStart, headerIndex);

  return /\b(?:DO|NO|PELO|COM\s+O)\s*$/i.test(beforeHeader.trim());
}

function isLikelyNormativeActChunk(title: string, fullChunk: string): boolean {
  const actType = getActType(title);
  const normalizedTitle = title.replace(/[ ]{2,}/g, ' ').trim();
  const hasDateInTitle = ACT_DATE_CLAUSE_REGEX.test(normalizedTitle);
  const hasDateNearHeader = ACT_DATE_CLAUSE_REGEX.test(fullChunk.slice(0, 260));
  const hasValidHeaderSignature =
    ACT_NUMBER_REGEX.test(normalizedTitle) && (hasDateInTitle || hasDateNearHeader);

  if (!hasValidHeaderSignature) {
    return false;
  }

  const headerAndOpening = `${title}\n${fullChunk.slice(0, 3000)}`;
  const hasNormativeSignal = NORMATIVE_SIGNAL_REGEX.test(headerAndOpening);

  if (!hasNormativeSignal) {
    return false;
  }

  const startsAsReferenceOnly = REFERENCE_ONLY_REGEX.test(fullChunk.slice(0, 800));

  if (startsAsReferenceOnly && !/\b(ART\.?\s*1\b|DECRETA\s*:|REVOGA(?:M)?(?:-SE)?\b)\b/i.test(fullChunk)) {
    return false;
  }

  const openingSlice = `${title}\n${fullChunk.slice(0, 1800)}`;

  if (PERSONNEL_ACT_EXCLUSION_REGEX.test(openingSlice)) {
    return false;
  }

  if (actType === 'LEI') {
    const leiOpening = `${title}\n${fullChunk.slice(0, 1600)}`;
    const hasLeiAcceptanceSignal = LEI_ACCEPTANCE_SIGNAL_REGEX.test(leiOpening);
    const hasLeiPublicationSignal = LEI_PUBLICATION_SIGNAL_REGEX.test(leiOpening);
    const hasLeiReferencePhrase = LEI_REFERENCE_PHRASE_REGEX.test(leiOpening);

    if (!hasLeiAcceptanceSignal && !hasLeiPublicationSignal) {
      return false;
    }

    // Aceite sempre tem precedencia sobre exclusao para leis.
    if (hasLeiReferencePhrase && !hasLeiAcceptanceSignal && !hasLeiPublicationSignal) {
      return false;
    }
  }

  if (actType === 'DECRETO') {
    const decretoOpening = openingSlice;
    const hasDecretoAcceptanceSignal = DECRETO_ACCEPTANCE_SIGNAL_REGEX.test(decretoOpening);
    const hasDecretoPublicationSignal = DECRETO_PUBLICATION_SIGNAL_REGEX.test(decretoOpening);
    const hasDecretoReferencePhrase = DECRETO_REFERENCE_PHRASE_REGEX.test(decretoOpening);
    const hasStrongNormativeOpening =
      /\b(DECRETA\s*:|ART\.?\s*1\b|FICA\s+(INSTITUID[AO]|CRIAD[AO]|ALTERAD[AO]|REVOGAD[AO]|APROVAD[AO]))\b/i.test(
        decretoOpening
      );

    if (!hasDecretoPublicationSignal && !hasStrongNormativeOpening) {
      return false;
    }

    // Aceite sempre tem precedencia sobre exclusao para decretos.
    if (hasDecretoReferencePhrase && !hasDecretoAcceptanceSignal && !hasStrongNormativeOpening) {
      return false;
    }
  }

  return true;
}

export function parseLegalActs(rawText: string): LegalActChunk[] {
  return parseLegalActsWithDiagnostics(rawText).chunks;
}

export function parseLegalActsWithDiagnostics(rawText: string): LegalActsParseResult {
  const normalizedRaw = normalizeWhitespace(rawText);
  const text = extractExecutiveSection(normalizedRaw);

  const diagnostics: LegalActsParseDiagnostics = {
    hasInput: normalizedRaw.length > 0,
    executiveSectionFound: text.length > 0,
    headerMatches: 0,
    keptChunks: 0,
    discardedShort: 0,
    discardedNonNormative: 0,
    discardedDuplicate: 0,
  };

  if (!text) {
    return {
      chunks: [],
      diagnostics,
    };
  }

  const matches = Array.from(text.matchAll(ACT_HEADER_REGEX)).map((match) => ({
    title: sanitizeTitle(match[1] ?? ''),
    index: match.index ?? 0,
  }));

  diagnostics.headerMatches = matches.length;

  if (matches.length === 0) {
    return {
      chunks: [],
      diagnostics,
    };
  }

  const chunks: LegalActChunk[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    if (isHeaderInReferenceContext(text, current.index)) {
      diagnostics.discardedNonNormative += 1;
      continue;
    }

    const start = current.index;
    const end = next ? next.index : text.length;

    const fullChunk = text.slice(start, end).trim();

    const actType = getActType(current.title);
    const minChunkSize =
      actType === 'DECRETO'
        ? MIN_CHUNK_SIZE_DECRETO
        : actType === 'MEDIDA_PROVISORIA'
          ? MIN_CHUNK_SIZE_MEDIDA_PROVISORIA
          : MIN_CHUNK_SIZE_DEFAULT;

    if (fullChunk.length < minChunkSize) {
      diagnostics.discardedShort += 1;
      continue;
    }

    if (!isLikelyNormativeActChunk(current.title, fullChunk)) {
      diagnostics.discardedNonNormative += 1;
      continue;
    }

    const dedupeKey = `${current.title}|${fullChunk.slice(0, 140)}`.toUpperCase();

    if (seen.has(dedupeKey)) {
      diagnostics.discardedDuplicate += 1;
      continue;
    }

    seen.add(dedupeKey);

    chunks.push({
      type: actType,
      title: current.title,
      content: fullChunk,
      order: chunks.length + 1,
    });
  }

  diagnostics.keptChunks = chunks.length;

  return {
    chunks,
    diagnostics,
  };
}
