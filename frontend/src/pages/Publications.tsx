import { useState } from 'react';
import { Search, Calendar, Filter, X } from 'lucide-react';
import { usePublications } from '../hooks/usePublications';
import { PublicationCard } from '../components/features/PublicationCard';
import { Pagination } from '../components/common/Pagination';
import { Loading } from '../components/common/Loading';

export function Publications() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isError, error } = usePublications({
    page,
    limit: 10,
    search: search || undefined,
    date: date || undefined,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSearchInput('');
    setDate('');
    setPage(1);
  };

  const hasFilters = search || date;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Publicações</h1>
        <p className="text-gray-600">
          Acompanhe as publicações do Diário Oficial do Tocantins em linguagem simples
        </p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por edição ou conteúdo..."
              className="input pl-10"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
              className="input pl-10 w-full md:w-48"
            />
          </div>
          <button type="submit" className="btn-primary flex items-center justify-center gap-2">
            <Filter className="w-5 h-5" />
            Filtrar
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Limpar
            </button>
          )}
        </form>
      </div>

      {/* Content */}
      {isLoading ? (
        <Loading fullScreen={false} message="Carregando publicações..." />
      ) : isError ? (
        <div className="card text-center py-12">
          <p className="text-red-600 mb-2">Erro ao carregar publicações</p>
          <p className="text-gray-500 text-sm">
            {error instanceof Error ? error.message : 'Tente novamente mais tarde'}
          </p>
        </div>
      ) : data && data.data.length > 0 ? (
        <>
          {/* Results info */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Mostrando {data.data.length} de {data.meta.total} publicações
            </p>
          </div>

          {/* Publications list */}
          <div className="space-y-4">
            {data.data.map((publication) => (
              <PublicationCard key={publication.id} publication={publication} />
            ))}
          </div>

          {/* Pagination */}
          {data.meta.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={data.meta.page}
                totalPages={data.meta.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-2">Nenhuma publicação encontrada</p>
          <p className="text-gray-500 text-sm">
            {hasFilters
              ? 'Tente ajustar os filtros de busca'
              : 'As publicações serão carregadas automaticamente'}
          </p>
        </div>
      )}
    </div>
  );
}
