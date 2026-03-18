import { Link } from 'react-router-dom';
import { Calendar, FileText, ExternalLink, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Publication } from '../../types';
import { formatSummaryPreviewText } from '../../utils/summary-html';
import { getSafeExternalUrl } from '../../utils/external-url';

interface PublicationCardProps {
  publication: Publication;
}

export function PublicationCard({ publication }: PublicationCardProps) {
  const hasSummary = publication.summaries && publication.summaries.length > 0;
  const summaries = hasSummary ? publication.summaries : [];
  const previewSummaries = summaries.slice(0, 2);
  const decreeCount = summaries.filter((item) => item.topicType === 'DECRETO').length;
  const lawCount = summaries.filter((item) => item.topicType === 'LEI').length;
  const safeDownloadUrl = getSafeExternalUrl(publication.downloadUrl);

  const formattedDate = format(new Date(publication.date), "dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-info">Edição {publication.edition}</span>
            {publication.isSupplement && (
              <span className="badge badge-warning">Suplemento</span>
            )}
            {hasSummary && (
              <span className="badge badge-success flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Resumo IA
              </span>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-gray-600 mb-3">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{formattedDate}</span>
          </div>

          {/* Summary Preview */}
          {hasSummary && (
            <div className="bg-primary-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-primary-900 mb-2">
                {summaries.length} tópico(s) simplificado(s)
                {decreeCount + lawCount > 0
                  ? ` • ${decreeCount} decreto(s) • ${lawCount} lei(s)`
                  : ''}
              </p>

              <ul className="space-y-2">
                {previewSummaries.map((item) => (
                  <li key={item.id} className="text-sm text-primary-900 line-clamp-2">
                    {item.topicType ? `[${item.topicType}] ` : ''}
                    {item.topicTitle ? `${item.topicTitle} - ` : ''}
                    {formatSummaryPreviewText(item.content)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {publication.pages} páginas
            </span>
            <span>{publication.fileSize}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex sm:flex-col gap-2">
          <Link
            to={`/publications/${publication.id}`}
            className="btn-primary text-center"
          >
            Ver Detalhes
          </Link>
          {safeDownloadUrl ? (
            <a
              href={safeDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              PDF
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
    </div>
  );
}
