import { describe, expect, it } from 'vitest';
import {
  findExecutiveActsPageRange,
  extractExecutiveActsFromPageTexts,
} from '../../../src/shared/utils/doe-content-extractor';

describe('DOE Content Extractor', () => {
  it('should detect executive acts page range from sumario', () => {
    const pageTexts = [
      `DIARIO OFICIAL\nSUMARIO\nATOS DO CHEFE DO PODER EXECUTIVO .......... 1\nSECRETARIA EXECUTIVA DA GOVERNADORIA .......... 11`,
    ];

    const range = findExecutiveActsPageRange(pageTexts);

    expect(range).toEqual({
      startPage: 1,
      endPage: 10,
      nextSectionStartPage: 11,
      nextSectionName: 'SECRETARIA EXECUTIVA DA GOVERNADORIA',
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
      nextSectionStartPage: 20,
      nextSectionName: 'SECRETARIA DA FAZENDA',
    });
  });

  it('should start at executive acts entry even when legislative acts appears first in sumario', () => {
    const pageTexts = [
      `SUMARIO\nATOS LEGISLATIVOS .......... 1\nATOS DO CHEFE DO PODER EXECUTIVO .......... 2\nCASA CIVIL .......... 7`,
    ];

    const range = findExecutiveActsPageRange(pageTexts);

    expect(range).toEqual({
      startPage: 2,
      endPage: 6,
      nextSectionStartPage: 7,
      nextSectionName: 'CASA CIVIL',
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

  it('should use heuristic extraction when sumario is missing', () => {
    const pageTexts = [
      'CAPA DA EDICAO',
      `ATOS DO CHEFE DO PODER EXECUTIVO\nDECRETO N 101, DE 10 DE MARCO DE 2026\nArt. 1 Fica criado programa estadual.`,
      `DECRETO N 102, DE 11 DE MARCO DE 2026\nArt. 1 Fica alterado procedimento administrativo.\nSECRETARIA DA FAZENDA\nATO N 1\nTexto fora do escopo`,
    ];

    const content = extractExecutiveActsFromPageTexts(pageTexts);

    expect(content).toContain('DECRETO N 101');
    expect(content).toContain('DECRETO N 102');
    expect(content).not.toContain('SECRETARIA DA FAZENDA');
    expect(content).not.toContain('Texto fora do escopo');
  });

  it('should return null when executive section is absent and sumario is missing', () => {
    const pageTexts = [
      'CAPA DA EDICAO',
      'SECRETARIA DA SAUDE\nATO N 33\nConteudo administrativo sem secao executiva',
    ];

    const content = extractExecutiveActsFromPageTexts(pageTexts);

    expect(content).toBeNull();
  });

  it('should keep endPage as null when section is the last entry', () => {
    const pageTexts = [
      `SUMARIO\nCASA CIVIL .......... 1\nATOS DO CHEFE DO PODER EXECUTIVO .......... 5`,
    ];

    const range = findExecutiveActsPageRange(pageTexts);

    expect(range).toEqual({
      startPage: 5,
      endPage: null,
      nextSectionStartPage: null,
      nextSectionName: null,
    });
  });

  it('should cut boundary page at next section header when it appears in the same page', () => {
    const pageTexts = [
      `SUMARIO\nATOS DO CHEFE DO PODER EXECUTIVO .......... 1\nCASA CIVIL .......... 4`,
      'pagina 2 sem interesse para o teste',
      'pagina 3 sem interesse para o teste',
      `DECRETO N 123, DE 1 DE JANEIRO DE 2026\nArt. 1 Fica criado programa estadual.\nCASA CIVIL\nATO N 1\nconteudo que nao deve entrar no escopo`,
    ];

    const content = extractExecutiveActsFromPageTexts(pageTexts);

    expect(content).toContain('DECRETO N 123');
    expect(content).not.toContain('CASA CIVIL\nATO N 1');
  });

  it('should drop boundary page when next section header is not detected', () => {
    const pageTexts = [
      `SUMARIO\nATOS DO CHEFE DO PODER EXECUTIVO .......... 2\nCASA CIVIL .......... 4`,
      `ATOS DO CHEFE DO PODER EXECUTIVO\nDECRETO N 200, DE 2 DE JANEIRO DE 2026\nArt. 1 Fica criado programa estadual.`,
      `DECRETO N 201, DE 3 DE JANEIRO DE 2026\nArt. 1 Fica alterado procedimento administrativo.`,
      `Cabecalho nao reconhecido por OCR\nATO N 90\nConteudo potencialmente fora do escopo`,
    ];

    const content = extractExecutiveActsFromPageTexts(pageTexts);

    expect(content).toContain('DECRETO N 200');
    expect(content).toContain('DECRETO N 201');
    expect(content).not.toContain('Cabecalho nao reconhecido por OCR');
    expect(content).not.toContain('ATO N 90');
  });

  it('should stop at first detected next-section header even if sumario boundary is too far', () => {
    const pageTexts = [
      `SUMARIO\nATOS DO CHEFE DO PODER EXECUTIVO .......... 2\nSECRETARIA DA CIDADANIA E JUSTICA .......... 80`,
      `ATOS DO CHEFE DO PODER EXECUTIVO\nDECRETO N 7124, DE 6 DE MARCO DE 2026\nArt. 1 Fica criado programa estadual.`,
      `DECRETO N 7125, DE 6 DE MARCO DE 2026\nArt. 1 Fica alterado procedimento administrativo.\nCASA CIVIL\nATO N 10\nConteudo fora do escopo`,
      `PAGINA MUITO ALEM\nDECRETO N 7089, DE 2022\napenas referencia historica`,
    ];

    const content = extractExecutiveActsFromPageTexts(pageTexts);

    expect(content).toContain('DECRETO N 7124');
    expect(content).toContain('DECRETO N 7125');
    expect(content).not.toContain('CASA CIVIL\nATO N 10');
    expect(content).not.toContain('DECRETO N 7089');
    expect(content).not.toContain('PAGINA MUITO ALEM');
  });

  it('should keep only executive content when legislative content appears before executive section', () => {
    const pageTexts = [
      `SUMARIO\nATOS DO CHEFE DO PODER EXECUTIVO .......... 2\nCASA CIVIL .......... 4`,
      `ATOS LEGISLATIVOS\nLEI N 4953, DE 6 DE MARCO DE 2026\nTexto que nao pertence ao escopo executivo.`,
      `ATOS DO CHEFE DO PODER EXECUTIVO\nDECRETO N 321, DE 7 DE MARCO DE 2026\nArt. 1 Fica instituida medida administrativa.`,
      `CASA CIVIL\nATO N 12\nConteudo fora do escopo`,
    ];

    const content = extractExecutiveActsFromPageTexts(pageTexts);

    expect(content).toContain('DECRETO N 321');
    expect(content).not.toContain('LEI N 4953');
    expect(content).not.toContain('ATOS LEGISLATIVOS');
    expect(content).not.toContain('CASA CIVIL\nATO N 12');
  });

  it('should start only after executive section header when page reading order is mixed', () => {
    const pageTexts = [
      `SUMARIO\nATOS DO CHEFE DO PODER EXECUTIVO .......... 2\nCASA CIVIL .......... 3`,
      `LEI N 4953, DE 6 DE MARCO DE 2026\nTexto legislativo anterior\nDECRETO N 7115, DE 6 DE MARCO DE 2026\nDestina imovel publico e adota outras providencias\nATOS DO CHEFE DO PODER EXECUTIVO\nMEDIDA PROVISORIA N 9, DE 6 DE MARCO DE 2026\nAltera a Lei n 3.718`,
      `CASA CIVIL\nATO N 50\nConteudo fora do escopo`,
    ];

    const content = extractExecutiveActsFromPageTexts(pageTexts);

    expect(content).toContain('MEDIDA PROVISORIA N 9');
    expect(content).not.toContain('DECRETO N 7115');
    expect(content).not.toContain('LEI N 4953');
    expect(content).not.toContain('CASA CIVIL\nATO N 50');
  });
});