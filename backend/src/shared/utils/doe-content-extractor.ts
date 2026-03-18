interface SumarioEntry {
  name: string;
  page: number;
}

interface PageRange {
  startPage: number;
  endPage: number | null;
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
    };
  }

  const endPage = Math.max(nextEntry.page - 1, startPage);

  return {
    startPage,
    endPage,
  };
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

  const pageRange = findExecutiveActsPageRange(pageTexts);

  if (!pageRange) {
    console.log('📋 SUMARIO nao localizado; usando conteudo integral do PDF');
    return pageTexts.join('\n').trim() || null;
  }

  const startIndex = Math.max(pageRange.startPage - 1, 0);
  const endExclusive = pageRange.endPage
    ? Math.min(pageRange.endPage, pageTexts.length)
    : pageTexts.length;

  if (startIndex >= pageTexts.length || startIndex >= endExclusive) {
    console.log('📋 Faixa de SUMARIO invalida; usando conteudo integral do PDF');
    return pageTexts.join('\n').trim() || null;
  }

  console.log(
    pageRange.endPage
      ? `📋 SUMARIO detectado: Atos do Poder Executivo da pagina ${pageRange.startPage} ate ${pageRange.endPage}`
      : `📋 SUMARIO detectado: Atos do Poder Executivo a partir da pagina ${pageRange.startPage}`
  );

  return pageTexts.slice(startIndex, endExclusive).join('\n').trim() || null;
}