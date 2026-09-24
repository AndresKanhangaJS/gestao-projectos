import { useInfiniteQuery } from '@tanstack/react-query'
import type { ActivityPage } from '@/api/tasks'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import { formatDateTime } from '@/lib/format'

/**
 * Histórico de actividade paginado (tarefa ou projecto), com "Carregar mais".
 * `fetchPage` é `getTaskActivity`/`getProjectActivity` já ligado ao id.
 */
export function ActivityList({
  queryKey,
  fetchPage,
  showTask = false,
  onOpenTask,
}: {
  queryKey: readonly unknown[]
  fetchPage: (page: number) => Promise<ActivityPage>
  /** Mostra a tarefa associada a cada entrada (útil na actividade do projecto). */
  showTask?: boolean
  onOpenTask?: (taskId: number) => void
}) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const current = last.meta.current_page ?? 1
      const lastPage = last.meta.last_page ?? 1
      return current < lastPage ? current + 1 : undefined
    },
  })

  if (query.isLoading) return <LoadingState label="A carregar actividade…" />
  if (query.isError) return <ErrorState message="Não foi possível carregar a actividade." />

  const entries = query.data?.pages.flatMap((page) => page.data) ?? []
  if (entries.length === 0) return <EmptyState title="Ainda sem actividade registada" />

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-2" aria-label="Histórico de actividade">
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-0.5 rounded-md border border-border p-2 text-sm">
            <p>{entry.description}</p>
            <p className="text-xs text-muted-foreground">
              {entry.actor?.name ?? 'Sistema'} · {formatDateTime(entry.created_at)}
              {showTask && entry.task && (
                <>
                  {' · '}
                  {entry.task.deleted || !onOpenTask ? (
                    <span>{entry.task.title ?? `Tarefa #${entry.task.id}`}</span>
                  ) : (
                    <button
                      type="button"
                      className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => entry.task && onOpenTask(entry.task.id)}
                    >
                      {entry.task.title ?? `Tarefa #${entry.task.id}`}
                    </button>
                  )}
                </>
              )}
            </p>
          </li>
        ))}
      </ol>
      {query.hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          className="self-center"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'A carregar…' : 'Carregar mais'}
        </Button>
      )}
    </div>
  )
}
