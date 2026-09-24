import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { listSprints, updateSprint } from '@/api/sprints'
import { updateTask } from '@/api/tasks'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import { mutationErrorMessage } from '@/lib/errors'
import { formatDate, isOverdue } from '@/lib/format'
import { PRIORITY_LABEL, PRIORITY_VARIANT, SPRINT_STATUS_LABEL } from '@/lib/labels'
import type { BoardColumn, Sprint, SprintStatus, Task } from '@/types/projects'
import { SprintFormDialog } from './SprintFormDialog'
import { projectSprintsKey, projectTasksKey } from './queryKeys'

/** Valor do Select que representa "sem sprint" (Radix Select não aceita string vazia). */
const BACKLOG_VALUE = 'backlog'

const STATUS_ORDER: Record<SprintStatus, number> = { active: 0, planned: 1, completed: 2 }
const STATUS_VARIANT: Record<SprintStatus, 'success' | 'secondary' | 'outline'> = {
  active: 'success',
  planned: 'secondary',
  completed: 'outline',
}

function sortSprints(sprints: Sprint[]): Sprint[] {
  return [...sprints].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (a.starts_at ?? '9999').localeCompare(b.starts_at ?? '9999') ||
      a.id - b.id,
  )
}

export function BacklogView({
  projectId,
  columns,
  tasks,
  onOpenTask,
}: {
  projectId: number
  columns: BoardColumn[]
  tasks: Task[]
  onOpenTask: (task: Task) => void
}) {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const tasksKey = projectTasksKey(projectId)
  const sprintsKey = projectSprintsKey(projectId)

  const sprintsQuery = useQuery({ queryKey: sprintsKey, queryFn: () => listSprints(projectId) })
  const sprints = useMemo(() => sortSprints(sprintsQuery.data ?? []), [sprintsQuery.data])
  const columnsById = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns])

  const tasksBySprint = useMemo(() => {
    const map = new Map<number | null, Task[]>()
    for (const task of tasks) {
      const list = map.get(task.sprint_id) ?? []
      list.push(task)
      map.set(task.sprint_id, list)
    }
    return map
  }, [tasks])

  const moveMutation = useMutation({
    mutationFn: ({ taskId, sprintId }: { taskId: number; sprintId: number | null }) =>
      updateTask(taskId, { sprint_id: sprintId }),
    onMutate: async ({ taskId, sprintId }) => {
      await queryClient.cancelQueries({ queryKey: tasksKey })
      const previous = queryClient.getQueryData<Task[]>(tasksKey)
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        (old ?? []).map((t) => (t.id === taskId ? { ...t, sprint_id: sprintId } : t)),
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(tasksKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksKey })
      queryClient.invalidateQueries({ queryKey: sprintsKey })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ sprintId, status }: { sprintId: number; status: SprintStatus }) =>
      updateSprint(sprintId, { status }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: sprintsKey }),
  })

  if (sprintsQuery.isLoading) return <LoadingState label="A carregar sprints…" />
  if (sprintsQuery.isError) return <ErrorState message="Não foi possível carregar os sprints." />

  const renderTasks = (list: Task[], emptyTitle: string) =>
    list.length === 0 ? (
      <EmptyState title={emptyTitle} />
    ) : (
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
        {list.map((task) => {
          const column = columnsById.get(task.board_column_id)
          const overdue = isOverdue(task.due_at, column?.is_done_column ?? false)
          const moveTargets = sprints.filter((s) => s.status !== 'completed' || s.id === task.sprint_id)
          return (
            <li key={task.id} className="flex flex-wrap items-center gap-3 p-2 text-sm">
              <button
                type="button"
                onClick={() => onOpenTask(task)}
                className="min-w-0 flex-1 truncate text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {task.title}
              </button>
              <Badge variant="outline">{column?.name ?? '—'}</Badge>
              <Badge variant={PRIORITY_VARIANT[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
              {task.due_at && (
                <span className={overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}>
                  {formatDate(task.due_at)}
                  {overdue && ' (atrasada)'}
                </span>
              )}
              <Select
                value={task.sprint_id == null ? BACKLOG_VALUE : String(task.sprint_id)}
                onValueChange={(value) =>
                  moveMutation.mutate({
                    taskId: task.id,
                    sprintId: value === BACKLOG_VALUE ? null : Number(value),
                  })
                }
              >
                <SelectTrigger className="w-48" aria-label={`Mover "${task.title}" para sprint ou backlog`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BACKLOG_VALUE}>Backlog do projecto</SelectItem>
                  {moveTargets.map((sprint) => (
                    <SelectItem key={sprint.id} value={String(sprint.id)}>
                      {sprint.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          )
        })}
      </ul>
    )

  const backlogTasks = tasksBySprint.get(null) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Use o selector de cada tarefa para a mover entre o backlog do projecto e os sprints.
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo sprint
        </Button>
      </div>

      {moveMutation.isError && (
        <p className="text-sm text-destructive" role="alert">
          {mutationErrorMessage(moveMutation.error, 'Não foi possível mover a tarefa.')}
        </p>
      )}
      {statusMutation.isError && (
        <p className="text-sm text-destructive" role="alert">
          {mutationErrorMessage(statusMutation.error, 'Não foi possível actualizar o sprint.')}
        </p>
      )}

      {sprints.map((sprint) => {
        const sprintTasks = tasksBySprint.get(sprint.id) ?? []
        return (
          <Card key={sprint.id} aria-labelledby={`sprint-${sprint.id}-title`} role="region">
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <CardTitle id={`sprint-${sprint.id}-title`}>{sprint.name}</CardTitle>
                  <Badge variant={STATUS_VARIANT[sprint.status]}>{SPRINT_STATUS_LABEL[sprint.status]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {sprintTasks.length} tarefa(s)
                  </span>
                </div>
                <CardDescription>
                  {formatDate(sprint.starts_at)} → {formatDate(sprint.ends_at)}
                  {sprint.goal && <> · {sprint.goal}</>}
                </CardDescription>
              </div>
              {sprint.status === 'planned' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate({ sprintId: sprint.id, status: 'active' })}
                >
                  Iniciar sprint
                </Button>
              )}
              {sprint.status === 'active' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate({ sprintId: sprint.id, status: 'completed' })}
                >
                  Concluir sprint
                </Button>
              )}
            </CardHeader>
            <CardContent>{renderTasks(sprintTasks, 'Sem tarefas neste sprint')}</CardContent>
          </Card>
        )
      })}

      <Card role="region" aria-labelledby="project-backlog-title">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle id="project-backlog-title">Backlog do projecto</CardTitle>
            <span className="text-xs text-muted-foreground">{backlogTasks.length} tarefa(s)</span>
          </div>
          <CardDescription>Tarefas ainda não atribuídas a nenhum sprint.</CardDescription>
        </CardHeader>
        <CardContent>{renderTasks(backlogTasks, 'O backlog do projecto está vazio')}</CardContent>
      </Card>

      <SprintFormDialog projectId={projectId} open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
