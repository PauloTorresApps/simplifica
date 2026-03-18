import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, ExternalLink, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePublication } from '../hooks/usePublications';
import { useGenerateSummary } from '../hooks/useSummaries';
import { Loading } from '../components/common/Loading';
import { formatSummaryHtml } from '../utils/summary-html';
import { getSafeExternalUrl } from '../utils/external-url';

export function PublicationDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: publication, isLoading, isError, error } = usePublication(id!);
  const generateSummary = useGenerateSummary();

  if (isLoading) {
    return <Loading message="Carregando publicação..." />;
  }

  if (isError || !publication) {
    return (
      <div className="card text-center py-12">
        <p className="text-red-600 mb-2">Erro ao carregar publicação</p>
        <p className="text-gray-500 text-sm mb-4">
          {error instanceof Error ? error.message : 'Publicação não encontrada'}
        </p>
        <Link to="/publications" className="btn-primary">
          Voltar para Publicações
        </Link>
      </div>
    );
  }

  const formattedDate = format(new Date(publication.date), "dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  const hasSummary = publication.summaries && publication.summaries.length > 0;
  const summaries = hasSummary ? publication.summaries : [];
  const decreeCount = summaries.filter((item) => item.topicType === 'DECRETO').length;
  const lawCount = summaries.filter((item) => item.topicType === 'LEI').length;
  const mpCount = summaries.filter((item) => item.topicType === 'MEDIDA_PROVISORIA').length;
  const safeDownloadUrl = getSafeExternalUrl(publication.downloadUrl);

  const handleGenerateSummary = () => {
    generateSummary.mutate(publication.id);
  };

  return (
    <div>
      {/* Back button */}
      <Link
        to="/publications"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Voltar para Publicações
      </Link>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="badge badge-info">Edição {publication.edition}</span>
              {publication.isSupplement && (
                <span className="badge badge-warning">Suplemento</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Publicação do Diário Oficial
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-600">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {publication.pages} páginas
              </span>
              <span>{publication.fileSize}</span>
            </div>
          </div>
          {safeDownloadUrl ? (
            <a
              href={safeDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Baixar PDF Original
            </a>
          ) : (
            <span
              className="btn-outline flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
              aria-disabled="true"
              title="Link externo indisponivel"
            >
              <ExternalLink className="w-4 h-4" />
              PDF indisponivel
            </span>
          )}
        </div>
      </div>

      {/* Summary Section */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Decretos, Leis e Medidas Provisorias em Linguagem Simples
            </h2>
          </div>
          {hasSummary && (
            <button
              onClick={handleGenerateSummary}
              disabled={generateSummary.isPending}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              {generateSummary.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerar
            </button>
          )}
        </div>

          {hasSummary ? (
            <div className="space-y-4">
              <div className="bg-primary-50 rounded-xl p-4 text-sm text-primary-900">
                <strong>{summaries.length}</strong> tópico(s) encontrado(s)
                {decreeCount + lawCount + mpCount > 0
                  ? ` • ${decreeCount} decreto(s) • ${lawCount} lei(s) • ${mpCount} medida(s) provisória(s)`
                  : ''}
            </div>

              <div className="space-y-4">
                {summaries.map((item, index) => (
                  <div key={item.id} className="bg-primary-50 rounded-xl p-6">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="badge badge-info">Tópico {item.topicOrder ?? index + 1}</span>
                      {item.topicType && <span className="badge badge-success">{item.topicType}</span>}
                    </div>

                    {item.topicTitle && (
                      <h3 className="text-base font-semibold text-primary-900 mb-3">{item.topicTitle}</h3>
                    )}

                    <div
                      className="summary-html"
                      dangerouslySetInnerHTML={{
                        __html: formatSummaryHtml(item.content),
                      }}
                    />

                    <div className="mt-4 pt-4 border-t border-primary-200 flex items-center justify-between text-sm text-gray-500">
                      <span>Gerado por: {item.model}</span>
                      <span>
                        {format(new Date(item.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Esta edição ainda não possui decretos/leis/medidas provisórias simplificados pela IA.
            </p>
            <button
              onClick={handleGenerateSummary}
              disabled={generateSummary.isPending}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              {generateSummary.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando resumo...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                    Gerar Resumos dos Decretos, Leis e Medidas Provisorias
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Raw Content Section */}
      {publication.rawContent && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Conteúdo Original
          </h2>
          <div className="bg-gray-50 rounded-xl p-6 max-h-96 overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
              {publication.rawContent.slice(0, 5000)}
              {publication.rawContent.length > 5000 && (
                <span className="text-gray-500">
                  ... (conteúdo truncado, baixe o PDF para ver completo)
                </span>
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
