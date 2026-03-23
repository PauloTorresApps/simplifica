import { describe, expect, it } from 'vitest';
import { parseLegalActs } from '../../../src/shared/utils/legal-acts-parser';

describe('parseLegalActs', () => {
  it('extracts acts only from the executive section', () => {
    const text = `
PREAMBULO DA EDICAO

LEI N 999, DE 1 DE JANEIRO DE 2026
Texto fora da secao do chefe do executivo que nao deve ser analisado.

ATOS DO CHEFE DO PODER EXECUTIVO

LEI N 1234, DE 10 DE MARCO DE 2026
Esta lei cria nova politica publica estadual com impacto direto na populacao.
Art. 1 Fica instituido novo beneficio social.
Art. 2 Esta lei entra em vigor na data de sua publicacao.
Art. 3 O beneficio sera concedido mediante cadastro anual e comprovacao de renda.
Art. 4 O Poder Executivo regulamentara os criterios operacionais em ate 60 dias.
Art. 5 Revogam-se as disposicoes em contrario, especialmente normas incompatíveis.

SECRETARIA DA ADMINISTRACAO

DECRETO N 777, DE 11 DE MARCO DE 2026
Este decreto esta fora da secao alvo e nao deve ser considerado.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(1);
    expect(acts[0].title.toUpperCase()).toContain('LEI N 1234');
  });

  it('returns empty when executive section does not exist', () => {
    const text = `
SECRETARIA DA EDUCACAO

LEI N 2000, DE 12 DE MARCO DE 2026
Conteudo de outra secao sem o cabecalho alvo.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(0);
  });

  it('extracts sanctioned law from legislative section when present', () => {
    const text = `
ATOS LEGISLATIVOS

LEI N 4953, DE 6 DE MARCO DE 2026
Faço saber que a ASSEMBLEIA LEGISLATIVA DO ESTADO DO TOCANTINS decreta e eu sanciono a seguinte Lei:
Art. 1 Fica autorizada doacao de imovel para finalidade social.
Art. 2 Esta Lei entra em vigor na data de sua publicacao.

ATOS DO CHEFE DO PODER EXECUTIVO
DECRETO N 7124, DE 6 DE MARCO DE 2026
O GOVERNADOR DO ESTADO DO TOCANTINS, no uso de suas atribuicoes, DECRETA:
Art. 1 Fica instituido regulamento de execucao.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(2);
    expect(acts[0].type).toBe('LEI');
    expect(acts[0].title.toUpperCase()).toContain('LEI N 4953');
    expect(acts[1].type).toBe('DECRETO');
  });

  it('ignores short chunks even inside executive section', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

LEI N 1
Curto.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(0);
  });

  it('ignores chunks that are only legal references without normative effect', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

LEI N 4567, DE 15 DE MARCO DE 2026
Nos termos da Lei Federal n 8.666 e de acordo com a Lei Estadual n 1.234,
fica registrada apenas referencia normativa para cumprimento administrativo,
sem instituir nova obrigacao, sem alterar regra vigente e sem revogacao expressa.
Com fundamento na lei anterior, permanecem os procedimentos internos ja existentes.
Em conformidade com a lei, as unidades devem manter os atos meramente executivos.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(0);
  });

  it('keeps chunks that contain explicit normative action', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

DECRETO N 9876, DE 16 DE MARCO DE 2026
DECRETA:
Art. 1 Fica instituido o Programa Estadual de Apoio ao Cidadao.
Art. 2 Revogam-se as disposicoes em contrario.
Art. 3 Este Decreto entra em vigor na data de sua publicacao.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(1);
    expect(acts[0].title.toUpperCase()).toContain('DECRETO N 9876');
  });

  it('ignores decree chunk that only references another decree (do/com o/pelo Decreto)', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

DECRETO N 9100, DE 22 DE MARCO DE 2026
Com o Decreto n 8.100 e pelo Decreto n 8.200, mantem-se procedimento anterior,
nos termos do Decreto n 7.900, sem instituir nova regra nesta edicao.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(0);
  });

  it('ignores decree chunk that only references another decree using no Decreto', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

DECRETO N 9101, DE 22 DE MARCO DE 2026
No Decreto n 8.900 permanecem os procedimentos anteriores, sem criacao de regra nova.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(0);
  });

  it('ignores decree header when it appears after referential preposition context', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

PORTARIA N 244/2026
... conforme o disposto no art. 30, inciso II, do
DECRETO N 7.089, DE 30 DE JANEIRO DE 2026
que dispoe sobre execucao orcamentaria e financeira.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(0);
  });

  it('ignores personnel-focused acts even when formal header exists', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

DECRETO N 9300, DE 22 DE MARCO DE 2026
Nomeia servidor para cargo em comissao na Secretaria de Estado.
Art. 1 Fica nomeado Fulano de Tal para o cargo em comissao DAS-2.
Art. 2 Este Decreto entra em vigor na data de sua publicacao.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(0);
  });

  it('keeps law with normative structure even when mentions servidor in legal context', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

LEI N 8600, DE 22 DE MARCO DE 2026
Art. 1 Fica instituida politica estadual de capacitacao de servidor publico.
Art. 2 Esta Lei entra em vigor na data de sua publicacao.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(1);
    expect(acts[0].type).toBe('LEI');
    expect(acts[0].title.toUpperCase()).toContain('LEI N 8600');
  });

  it('keeps decree when acceptance signal is present even with reference phrases', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

DECRETO N 9200, DE 22 DE MARCO DE 2026
Revoga o Decreto n 7.800 e consolida a regulamentacao do programa estadual.
Art. 1 Fica atualizada a governanca do programa, nos termos deste Decreto.
Art. 2 Este Decreto entra em vigor na data de sua publicacao.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(1);
    expect(acts[0].title.toUpperCase()).toContain('DECRETO N 9200');
  });

  it('ignores citation-like lines that are not formal act headers', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

LEI N 1234
Nos termos da Lei n 1234, de 10 de marco de 2026, ficam mantidos procedimentos internos.
Com fundamento na legislacao vigente, registra-se apenas referencia normativa.
Sem criacao, alteracao ou revogacao de regra juridica.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(0);
  });

  it('ignores law chunk with only reference phrases like na/da/segundo a Lei', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

LEI N 7001, DE 20 DE MARCO DE 2026
Segundo a Lei n 3.500, na Lei estadual de referencia e da Lei complementar aplicavel,
mantem-se o procedimento administrativo existente sem criacao de regra nova.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(0);
  });

  it('accepts formal header with act number and date clause', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

LEI N 3210, DE 20 DE MARCO DE 2026
O GOVERNADOR DO ESTADO DO TOCANTINS faz saber que a Assembleia Legislativa decreta e eu sanciono a seguinte Lei:
Art. 1 Fica alterada a Lei n 3000 para instituir novo programa.
Art. 2 Esta Lei entra em vigor na data de sua publicacao.
Art. 3 O regulamento sera detalhado por ato do Poder Executivo no prazo de 30 dias.
Art. 4 Ficam atualizados os criterios de elegibilidade e os procedimentos administrativos.
Art. 5 Revogam-se as disposicoes em contrario.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(1);
    expect(acts[0].title.toUpperCase()).toContain('LEI N 3210');
  });

  it('keeps law chunk when acceptance signals are present', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

LEI N 8002, DE 21 DE MARCO DE 2026
O GOVERNADOR DO ESTADO DO TOCANTINS
faz saber que a Assembleia Legislativa decreta e eu sanciono a seguinte Lei:
Art. 1 Fica criado programa de apoio financeiro para familias vulneraveis.
Art. 2 Altera a Lei n 4.000 para atualizar os criterios de acesso.
Art. 3 Esta Lei entra em vigor na data de sua publicacao.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(1);
    expect(acts[0].title.toUpperCase()).toContain('LEI N 8002');
  });

  it('always accepts law when Assembleia Legislativa sanction phrase is present', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

LEI N 8500, DE 22 DE MARCO DE 2026
Faço saber que a ASSEMBLEIA LEGISLATIVA DO ESTADO
DO TOCANTINS decreta e eu sanciono a seguinte Lei:
Art. 1 Fica instituida a Politica Estadual de Apoio ao Empreendedor Popular.
Art. 2 Esta Lei entra em vigor na data de sua publicacao.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(1);
    expect(acts[0].type).toBe('LEI');
    expect(acts[0].title.toUpperCase()).toContain('LEI N 8500');
  });

  it('accepts sanctioned law phrase for another state assembly', () => {
    const text = `
ATOS LEGISLATIVOS

LEI N 8601, DE 22 DE MARCO DE 2026
Faço saber que a ASSEMBLEIA LEGISLATIVA DO ESTADO DE GOIAS decreta e eu sanciono a seguinte Lei:
Art. 1 Fica instituida politica estadual de apoio ao empreendedorismo social.
Art. 2 Esta Lei entra em vigor na data de sua publicacao.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(1);
    expect(acts[0].type).toBe('LEI');
    expect(acts[0].title.toUpperCase()).toContain('LEI N 8601');
  });

  it('accepts law with sanction phrase variation using presente Lei', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

LEI N 8501, DE 22 DE MARCO DE 2026
Faço saber que a ASSEMBLEIA LEGISLATIVA DO ESTADO DO TOCANTINS decreta e eu sanciono a presente Lei:
Art. 1 Fica instituido cadastro estadual de apoio ao pequeno produtor.
Art. 2 Esta Lei entra em vigor na data de sua publicacao.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(1);
    expect(acts[0].type).toBe('LEI');
    expect(acts[0].title.toUpperCase()).toContain('LEI N 8501');
  });

  it('accepts short sanctioned law chunk', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

LEI N 8502, DE 22 DE MARCO DE 2026
Faço saber que a ASSEMBLEIA LEGISLATIVA DO ESTADO DO TOCANTINS decreta e eu sanciono a seguinte Lei:
Art. 1 Fica instituida medida de simplificacao administrativa.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(1);
    expect(acts[0].type).toBe('LEI');
    expect(acts[0].title.toUpperCase()).toContain('LEI N 8502');
  });

  it('keeps law chunk with normative structure even without literal publication marker', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

LEI N 8010, DE 21 DE MARCO DE 2026
O GOVERNADOR DO ESTADO DO TOCANTINS faz saber que a Assembleia Legislativa decreta e eu sanciono:
Art. 1 Fica criado o Programa Estadual de Inclusao Produtiva.
Art. 2 Ficam alterados os criterios de habilitacao do beneficio social.
Art. 3 Revogam-se as disposicoes em contrario.
Art. 4 O Poder Executivo regulamentara os procedimentos operacionais no prazo de 60 dias.
Art. 5 O programa priorizara familias em situacao de vulnerabilidade social cadastradas.
Art. 6 As despesas correrao por conta de dotacao orcamentaria propria.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(1);
    expect(acts[0].type).toBe('LEI');
    expect(acts[0].title.toUpperCase()).toContain('LEI N 8010');
  });

  it('ignores referenced law header-like line inside decree content', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

DECRETO N 7125, DE 6 DE MARCO DE 2026
O GOVERNADOR DO ESTADO DO TOCANTINS, no uso de suas atribuicoes, DECRETA:
Art. 1 O §2 do art. 1 da Lei n 3.832, de 10 de novembro de 2021, passa a vigorar com nova redacao.
Lei n 3.832, de 10 de novembro de 2021
Art. 2 Este Decreto entra em vigor na data de sua publicacao.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(1);
    expect(acts[0].type).toBe('DECRETO');
    expect(acts[0].title.toUpperCase()).toContain('DECRETO N 7125');
  });

  it('keeps two valid decrees including one with date clause in the next line', () => {
    const text = `
ATOS DO CHEFE DO PODER EXECUTIVO

DECRETO N 1001, DE 20 DE MARCO DE 2026
Art. 1 Fica instituido o Programa A.
Art. 2 Este Decreto entra em vigor na data de sua publicacao.

DECRETO N 1002
DE 21 DE MARCO DE 2026
DECRETA:
Art. 1 Fica criada comissao especial temporaria.
Art. 2 Revogam-se as disposicoes em contrario.
`;

    const acts = parseLegalActs(text);

    expect(acts).toHaveLength(2);
    expect(acts[0].title.toUpperCase()).toContain('DECRETO N 1001');
    expect(acts[1].title.toUpperCase()).toContain('DECRETO N 1002');
  });
});
