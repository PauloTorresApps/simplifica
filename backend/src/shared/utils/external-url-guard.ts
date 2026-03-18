import net from 'node:net';

const DENIED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split('.').map((part) => Number(part));

  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet))) {
    return false;
  }

  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:')
  );
}

function isBlockedIpAddress(hostname: string): boolean {
  const ipVersion = net.isIP(hostname);

  if (ipVersion === 4) {
    return isPrivateIpv4(hostname);
  }

  if (ipVersion === 6) {
    return isPrivateIpv6(hostname);
  }

  return false;
}

function isAllowedHost(hostname: string, allowedHosts: string[]): boolean {
  const normalized = hostname.toLowerCase();

  return allowedHosts.some((allowedHost) => {
    const allowed = allowedHost.toLowerCase();
    return normalized === allowed || normalized.endsWith(`.${allowed}`);
  });
}

export function validateExternalUrl(urlInput: string, allowedHosts: string[]): URL {
  if (allowedHosts.length === 0) {
    throw new Error('Lista de hosts permitidos não pode estar vazia');
  }

  const parsed = new URL(urlInput);

  if (parsed.protocol !== 'https:') {
    throw new Error(`URL externa deve usar HTTPS: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname.toLowerCase();

  if (DENIED_HOSTNAMES.has(hostname) || isBlockedIpAddress(hostname)) {
    throw new Error(`Hostname bloqueado para requisição externa: ${hostname}`);
  }

  if (!isAllowedHost(hostname, allowedHosts)) {
    throw new Error(`Hostname não permitido para requisição externa: ${hostname}`);
  }

  return parsed;
}
