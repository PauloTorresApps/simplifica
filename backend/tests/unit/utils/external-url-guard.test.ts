import { describe, expect, it } from 'vitest';
import { validateExternalUrl } from '../../../src/shared/utils/external-url-guard';

describe('External URL Guard', () => {
  const allowedHosts = ['diariooficial.to.gov.br'];

  it('should allow https URL from allowlisted host', () => {
    const url = validateExternalUrl(
      'https://diariooficial.to.gov.br/edicoes/123.pdf',
      allowedHosts
    );

    expect(url.hostname).toBe('diariooficial.to.gov.br');
  });

  it('should allow https URL from allowlisted subdomain', () => {
    const url = validateExternalUrl(
      'https://cdn.diariooficial.to.gov.br/edicoes/123.pdf',
      allowedHosts
    );

    expect(url.hostname).toBe('cdn.diariooficial.to.gov.br');
  });

  it('should block non-https URLs', () => {
    expect(() => {
      validateExternalUrl('http://diariooficial.to.gov.br/edicoes/123.pdf', allowedHosts);
    }).toThrowError(/HTTPS/);
  });

  it('should block localhost URLs', () => {
    expect(() => {
      validateExternalUrl('https://localhost/internal', allowedHosts);
    }).toThrowError();
  });

  it('should block private IPv4 URLs', () => {
    expect(() => {
      validateExternalUrl('https://10.0.0.1/private', allowedHosts);
    }).toThrowError();
  });

  it('should block non-allowlisted domains', () => {
    expect(() => {
      validateExternalUrl('https://attacker.example.com/payload', allowedHosts);
    }).toThrowError();
  });

  it('should reject empty allowlist', () => {
    expect(() => {
      validateExternalUrl('https://diariooficial.to.gov.br/edicoes/123.pdf', []);
    }).toThrowError();
  });
});
