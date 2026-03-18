import { describe, expect, it } from 'vitest';
import { findExecutiveActsPageRange } from '../../../src/shared/utils/doe-content-extractor';

describe('DOE Content Extractor', () => {
  it('should detect executive acts page range from sumario', () => {
    const pageTexts = [
      `DIARIO OFICIAL\nSUMARIO\nATOS DO CHEFE DO PODER EXECUTIVO .......... 1\nSECRETARIA EXECUTIVA DA GOVERNADORIA .......... 11`,
    ];

    const range = findExecutiveActsPageRange(pageTexts);

    expect(range).toEqual({
      startPage: 1,
      endPage: 10,
    });
  });

  it('should support ranges that start after first page', () => {
    const pageTexts = [
      `SUMARIO\nCASA CIVIL .......... 1\nATOS DO CHEFE DO PODER EXECUTIVO .......... 3\nSECRETARIA DA FAZENDA .......... 20`,
    ];

    const range = findExecutiveActsPageRange(pageTexts);

    expect(range).toEqual({
      startPage: 3,
      endPage: 19,
    });
  });

  it('should return null when executive acts section is not found', () => {
    const pageTexts = [
      `SUMARIO\nSECRETARIA DA SAUDE .......... 12\nSECRETARIA DA FAZENDA .......... 20`,
    ];

    const range = findExecutiveActsPageRange(pageTexts);

    expect(range).toBeNull();
  });

  it('should return null when sumario does not exist', () => {
    const pageTexts = [`DECRETO N 7.122, DE 16 DE MARCO DE 2026`];

    const range = findExecutiveActsPageRange(pageTexts);

    expect(range).toBeNull();
  });

  it('should keep endPage as null when section is the last entry', () => {
    const pageTexts = [
      `SUMARIO\nCASA CIVIL .......... 1\nATOS DO CHEFE DO PODER EXECUTIVO .......... 5`,
    ];

    const range = findExecutiveActsPageRange(pageTexts);

    expect(range).toEqual({
      startPage: 5,
      endPage: null,
    });
  });
});