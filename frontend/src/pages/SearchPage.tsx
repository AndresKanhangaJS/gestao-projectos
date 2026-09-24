import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { searchTasks } from '@/api/search'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Spinner'

export default function SearchPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const tooShort = q.length > 0 && q.length < 2

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchTasks(q),
    enabled: q.length >= 2,
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Resultados para “{q}”</h1>
      {q.length === 0 && <EmptyState title="Escreva um termo na caixa de pesquisa" />}
      {tooShort && <EmptyState title="Escreva pelo menos 2 caracteres" />}
      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Não foi possível pesquisar." />}
      {data && data.length === 0 && <EmptyState title="Nenhum resultado encontrado" />}
      {data && data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {data.map((task) => (
            <li key={task.id}>
              <Link
                to={`/projects/${task.project_id}?task=${task.id}`}
                className="block rounded-md border border-border p-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="font-medium">{task.title}</p>
                {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
