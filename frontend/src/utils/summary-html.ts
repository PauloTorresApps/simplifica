const ALLOWED_TAGS = new Set([
  'article',
  'section',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'span',
  'br',
]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map(sanitizeNode).join('');

  if (!ALLOWED_TAGS.has(tag)) {
    return children;
  }

  if (tag === 'br') {
    return '<br/>';
  }

  return `<${tag}>${children}</${tag}>`;
}

function convertBoldMarkdown(input: string): string {
  return input.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function convertLegacyTextToHtml(raw: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: string[] = [];
  const listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(`<ul>${listItems.join('')}</ul>`);
      listItems.length = 0;
    }
  };

  for (const line of lines) {
    const sanitizedLine = line.replace(/^\*\s*/, '').trim();
    const isListItem = /^[-*•]\s+/.test(line) || /^\*\s/.test(line);
    const content = convertBoldMarkdown(sanitizedLine.replace(/^[-*•]\s+/, ''));

    if (!content) {
      continue;
    }

    if (isListItem) {
      listItems.push(`<li>${content}</li>`);
      continue;
    }

    flushList();

    if (/^[📢💡👥🗓️✅📌]/u.test(content)) {
      blocks.push(`<h4>${content}</h4>`);
      continue;
    }

    blocks.push(`<p>${content}</p>`);
  }

  flushList();

  return `<article>${blocks.join('')}</article>`;
}

function looksLikeHtml(content: string): boolean {
  return /<\s*(article|section|h[1-6]|p|ul|ol|li|strong|em|span|br)\b/i.test(content);
}

export function formatSummaryHtml(content: string): string {
  const normalized = content.trim();

  if (!normalized) {
    return '<p>Resumo indisponivel.</p>';
  }

  const source = looksLikeHtml(normalized)
    ? normalized
    : convertLegacyTextToHtml(normalized);

  const parsed = new DOMParser().parseFromString(source, 'text/html');
  const safeHtml = Array.from(parsed.body.childNodes).map(sanitizeNode).join('');

  return safeHtml || `<p>${escapeHtml(normalized)}</p>`;
}

export function formatSummaryPreviewText(content: string, maxLength: number = 220): string {
  const normalized = content.trim();

  if (!normalized) {
    return 'Resumo indisponivel.';
  }

  const source = looksLikeHtml(normalized)
    ? normalized
    : convertLegacyTextToHtml(normalized);

  const parsed = new DOMParser().parseFromString(source, 'text/html');
  const rawText = (parsed.body.textContent || '').replace(/\s+/g, ' ').trim();

  if (!rawText) {
    return 'Resumo indisponivel.';
  }

  if (rawText.length <= maxLength) {
    return rawText;
  }

  return `${rawText.slice(0, maxLength).trimEnd()}...`;
}