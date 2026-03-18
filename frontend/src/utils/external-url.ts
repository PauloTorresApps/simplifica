const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export function getSafeExternalUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl, window.location.origin);

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}