interface SumarioEntry {
  name: string;
  page: number;
}

interface PageRange {
  startPage: number;
  endPage: number | null;
  nextSectionStartPage: number | null;
  nextSectionName: string | null;
}

interface TextItem {
  str: string;
  transform: [number, number, number, number, number, number];
}

interface TextContent {
  items: TextItem[];
}

interface PageData {
  getTextContent: (options: {
    normalizeWhitespace: boolean;
    disableCombineTextItems: boolean;
  }) => Promise<TextContent>;
}

const SUMARIO_HEADING_REGEX = /SUM[ÁA]RIO/i;
const SUMARIO_ENTRY_REGEX = /^(.+?)[.\s]{2,}(\d{1,4})\s*$/gm;
const EXECUTIVE_ACTS_REGEX = /ATOS\s+DO\s+CHEFE\s+DO\s+PODER\s+EXECUTIVO/i;
const NEXT_SECTION_FALLBACK_REGEX =
  /(?:^|\n)\s*(SECRETARIA\b[^\n]*|CASA\s+CIVIL\b[^\n]*|GABINETE\b[^\n]*|DEFENSORIA\s+PUBLICA\b[^\n]*|MINISTERIO\s+PUBLICO\b[^\n]*|TRIBUNAL\b[^\n]*|ASSEMBLEIA\s+LEGISLATIVA\b[^\n]*|CONTROLADORIA\b[^\n]*|PROCURADORIA\b[^\n]*)/i;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findSectionHeaderIndex(text: string, sectionName: string): number {
  const tokens = sectionName
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => escapeRegex(token));

  if (tokens.length === 0) {
    return -1;
  }

  const sectionRegex = new RegExp(`(?:^|\\n)\\s*${tokens.join('\\s+')}\\b`, 'im');
  const match = text.match(sectionRegex);

  return typeof match?.index === 'number' ? match.index : -1;
}

function findExecutiveSectionStartIndex(text: string): number {
  const match = text.match(EXECUTIVE_ACTS_REGEX);

  if (!match || typeof match.index !== 'number') {
    return -1;
  }

  const lineBreakIndex = text.indexOf('\n', match.index);
  return lineBreakIndex >= 0 ? lineBreakIndex + 1 : match.index;
}

function findFallbackBoundaryIndex(text: string): number {
  const match = text.match(NEXT_SECTION_FALLBACK_REGEX);
  return typeof match?.index === 'number' ? match.index : -1;
}

function trimBoundaryPageByNextSection(pageText: string, nextSectionName: string): {
  trimmedText: string;
  cutApplied: boolean;
  cutMode: 'exact' | 'fallback' | 'drop';
} {
  const exactIndex = findSectionHeaderIndex(pageText, nextSectionName);

  if (exactIndex >= 0) {
    return {
      trimmedText: pageText.slice(0, exactIndex).trim(),
      cutApplied: true,
      cutMode: 'exact',
    };
  }

  const fallbackIndex = findFallbackBoundaryIndex(pageText);

  if (fallbackIndex >= 0) {
    return {
      trimmedText: pageText.slice(0, fallbackIndex).trim(),
      cutApplied: true,
      cutMode: 'fallback',
    };
  }

  // Conservative mode: if we cannot detect the next section boundary on the page-limit,
  // drop this last page to avoid leaking content beyond the target scope.
  return {
    trimmedText: '',
    cutApplied: false,
    cutMode: 'drop',
  };
}

function findEarlyBoundaryInParts(
  parts: string[],
  nextSectionName: string | null
): { pageOffset: number; cutIndex: number; mode: 'exact' | 'fallback' } | null {
  for (let pageOffset = 0; pageOffset < parts.length; pageOffset++) {
    const pageText = parts[pageOffset];

    if (SUMARIO_HEADING_REGEX.test(pageText)) {
      continue;
    }

    const exactIndex = nextSectionName ? findSectionHeaderIndex(pageText, nextSectionName) : -1;
    const fallbackIndex = findFallbackBoundaryIndex(pageText);

    if (exactIndex >= 0) {
      return {
        pageOffset,
        cutIndex: exactIndex,
        mode: 'exact',
      };
    }

    if (fallbackIndex >= 0) {
      return {
        pageOffset,
        cutIndex: fallbackIndex,
        mode: 'fallback',
      };
    }
  }

  return null;
}

function extractBySectionHeuristic(pageTexts: string[]): string | null {
  const startPageIndex = pageTexts.findIndex((pageText) => EXECUTIVE_ACTS_REGEX.test(pageText));

  if (startPageIndex < 0) {
    console.log('📋 Secao ATOS DO CHEFE DO PODER EXECUTIVO nao encontrada; descartando extracao fora de escopo');
    return null;
  }

  const parts: string[] = [];

  for (let i = startPageIndex; i < pageTexts.length; i++) {
    let pageText = pageTexts[i];

    if (i === startPageIndex) {
      const sectionStart = findExecutiveSectionStartIndex(pageText);
      if (sectionStart >= 0) {
        pageText = pageText.slice(sectionStart).trim();
      }
    }

    if (pageText.length === 0) {
      continue;
    }

    const boundaryIndex = findFallbackBoundaryIndex(pageText);

    if (boundaryIndex >= 0) {
      const beforeBoundary = pageText.slice(0, boundaryIndex).trim();

      if (beforeBoundary.length > 0) {
        parts.push(beforeBoundary);
      }

      console.log(
        `📋 Recorte heuristico aplicado: secao executiva da pagina ${startPageIndex + 1} ate pagina ${i + 1}`
      );
      return parts.join('\n').trim() || null;
    }

    parts.push(pageText);
  }

  console.log(
    `📋 Recorte heuristico aplicado: secao executiva da pagina ${startPageIndex + 1} ate fim do documento`
  );
  return parts.join('\n').trim() || null;
}

function parseSumarioEntries(pageTexts: string[]): SumarioEntry[] {
  const searchText = pageTexts.slice(0, 5).join('\n');
  const summaryStart = searchText.search(SUMARIO_HEADING_REGEX);

  if (summaryStart === -1) {
    return [];
  }

  const summaryText = searchText.slice(summaryStart);
  const entries: SumarioEntry[] = [];
  let match: RegExpExecArray | null;

  while ((match = SUMARIO_ENTRY_REGEX.exec(summaryText)) !== null) {
    const name = (match[1] ?? '').trim();
    const page = parseInt(match[2] ?? '', 10);

    if (name.length >= 4 && !Number.isNaN(page) && page > 0) {
      entries.push({ name, page });
    }
  }

  return entries;
}

export function findExecutiveActsPageRange(pageTexts: string[]): PageRange | null {
  const entries = parseSumarioEntries(pageTexts);

  if (entries.length === 0) {
    return null;
  }

  const executiveIdx = entries.findIndex((entry) => EXECUTIVE_ACTS_REGEX.test(entry.name));

  if (executiveIdx === -1) {
    return null;
  }

  const startPage = entries[executiveIdx].page;

  if (startPage < 1) {
    return null;
  }

  const nextEntry = entries[executiveIdx + 1];

  if (!nextEntry) {
    return {
      startPage,
      endPage: null,
      nextSectionStartPage: null,
      nextSectionName: null,
    };
  }

  const endPage = Math.max(nextEntry.page - 1, startPage);

  return {
    startPage,
    endPage,
    nextSectionStartPage: nextEntry.page,
    nextSectionName: nextEntry.name,
  };
}

export function extractExecutiveActsFromPageTexts(pageTexts: string[]): string | null {
  if (pageTexts.length === 0) {
    return null;
  }

  const pageRange = findExecutiveActsPageRange(pageTexts);

  if (!pageRange) {
    console.log('📋 SUMARIO nao localizado; aplicando recorte heuristico por secao executiva');
    return extractBySectionHeuristic(pageTexts);
  }

  const startIndex = Math.max(pageRange.startPage - 1, 0);

  if (startIndex >= pageTexts.length) {
    console.log('📋 Faixa de SUMARIO invalida; aplicando recorte heuristico por secao executiva');
    return extractBySectionHeuristic(pageTexts);
  }

  const boundaryIndex =
    pageRange.nextSectionStartPage && pageRange.nextSectionStartPage > 0
      ? Math.min(pageRange.nextSectionStartPage - 1, pageTexts.length - 1)
      : pageTexts.length - 1;

  if (boundaryIndex < startIndex) {
    console.log('📋 Faixa de SUMARIO invalida; aplicando recorte heuristico por secao executiva');
    return extractBySectionHeuristic(pageTexts);
  }

  const parts = pageTexts.slice(startIndex, boundaryIndex + 1);

  const firstExecutivePageOffset = (() => {
    const nonSummaryOffset = parts.findIndex(
      (pageText) => EXECUTIVE_ACTS_REGEX.test(pageText) && !SUMARIO_HEADING_REGEX.test(pageText)
    );

    if (nonSummaryOffset >= 0) {
      return nonSummaryOffset;
    }

    return parts.findIndex((pageText) => EXECUTIVE_ACTS_REGEX.test(pageText));
  })();

  if (firstExecutivePageOffset > 0) {
    parts.splice(0, firstExecutivePageOffset);
    console.log(
      `📋 Ajuste de ancoragem: cabecalho da secao executiva encontrado ${firstExecutivePageOffset} pagina(s) apos a pagina inicial do sumario`
    );
  }

  if (parts.length > 0) {
    const firstPartStart = SUMARIO_HEADING_REGEX.test(parts[0])
      ? -1
      : findExecutiveSectionStartIndex(parts[0]);

    if (firstPartStart >= 0) {
      parts[0] = parts[0].slice(firstPartStart).trim();
    }
  }

  const earlyBoundary = findEarlyBoundaryInParts(parts, pageRange.nextSectionName);
  const earlyBoundaryApplied = Boolean(earlyBoundary);

  if (earlyBoundary) {
    parts.splice(earlyBoundary.pageOffset + 1);
    parts[earlyBoundary.pageOffset] = parts[earlyBoundary.pageOffset]
      .slice(0, earlyBoundary.cutIndex)
      .trim();

    console.log(
      `📋 Corte antecipado aplicado na pagina ${startIndex + earlyBoundary.pageOffset + 1} por cabecalho ${earlyBoundary.mode === 'exact' ? 'exato da proxima secao' : 'institucional de fallback'}`
    );
  }

  if (
    !earlyBoundaryApplied &&
    pageRange.nextSectionStartPage !== null &&
    pageRange.nextSectionName &&
    parts.length > 0
  ) {
    const lastPart = parts[parts.length - 1];
    const boundaryTrim = trimBoundaryPageByNextSection(lastPart, pageRange.nextSectionName);

    if (boundaryTrim.cutApplied) {
      parts[parts.length - 1] = boundaryTrim.trimmedText;
      const cutDescription =
        boundaryTrim.cutMode === 'exact'
          ? `inicio de ${pageRange.nextSectionName}`
          : 'cabecalho institucional de fallback';

      console.log(
        `📋 SUMARIO detectado: Atos do Poder Executivo da pagina ${pageRange.startPage} ate ${cutDescription} (pagina ${pageRange.nextSectionStartPage})`
      );
    } else {
      parts.pop();
      console.log(
        `📋 SUMARIO detectado: Atos do Poder Executivo da pagina ${pageRange.startPage} ate ${Math.max(startIndex + 1, boundaryIndex)} (pagina limite removida por falta de cabecalho de corte)`
      );
    }
  } else {
    console.log(
      pageRange.endPage
        ? `📋 SUMARIO detectado: Atos do Poder Executivo da pagina ${pageRange.startPage} ate ${pageRange.endPage}`
        : `📋 SUMARIO detectado: Atos do Poder Executivo a partir da pagina ${pageRange.startPage}`
    );
  }

  return parts.join('\n').trim() || null;
}

export async function extractExecutiveActsContent(pdfBuffer: Buffer): Promise<string | null> {
  const pdfParse = (await import('pdf-parse')).default;
  const pageTexts: string[] = [];

  await pdfParse(pdfBuffer, {
    pagerender(pageData: PageData) {
      return pageData
        .getTextContent({
          normalizeWhitespace: false,
          disableCombineTextItems: false,
        })
        .then((textContent) => {
          let lastY: number | undefined;
          let text = '';

          for (const item of textContent.items) {
            if (lastY === undefined || lastY === item.transform[5]) {
              text += item.str;
            } else {
              text += `\n${item.str}`;
            }
            lastY = item.transform[5];
          }

          pageTexts.push(text);
          return text;
        });
    },
  });

  if (pageTexts.length === 0) {
    return null;
  }

  return extractExecutiveActsFromPageTexts(pageTexts);
}