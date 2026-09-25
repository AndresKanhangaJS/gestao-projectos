import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteSprint, listSprints, updateSprint } from '@/api/sprints'
import { updateTask } from '@/api/tasks'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import { mutationErrorMessage } from '@/lib/errors'
import { formatDate, formatDateRange, isOverdue } from '@/lib/format'
import { HELP } from '@/lib/help'
import {
  BACKLOG_OPTION_LABEL,
  PRIORITY_LABEL,
  PRIORITY_VARIANT,
  SPRINT_STATUS_LABEL,
  sprintOptionLabel,
} from '@/lib/labels'
import { NO_PERMISSION_REASON, canEditTasks } from '@/lib/projectPermissions'
import type { BoardColumn, ProjectPermissions, Sprint, SprintStatus, Task } from '@/types/projects'
import { AssigneeAvatars } from './AssigneeAvatars'
import { CompleteSprintDialog } from './CompleteSprintDialog'
import { SprintFormDialog } from './SprintFormDialog'
import { TaskFormDialog } from './TaskFormDialog'
import { invalidateProjectTasks, invalidateSprints } from './invalidation'
import { projectSprintsKey, projectTasksKey } from './queryKeys'

/** Valor do Select que representa "sem sprint" (Radix Select não aceita string vazia). */
const BACKLOG_VALUE = 'backlog'

const STATUS_ORDER: Record<SprintStatus, number> = { active: 0, planned: 1, completed: 2 }
const STATUS_VARIANT: Record<SprintStatus, 'success' | 'secondary' | 'outline'> = {
  active: 'success',
  planned: 'secondary',
  completed: 'outline',
}
const STATUS_HELP = {
  planned: HELP.sprintPlanned,
  active: HELP.sprintActive,
  completed: HELP.sprintCompleted,
} as const

function sortSprints(sprints: Sprint[]): Sprint[] {
  return [...sprints].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (a.starts_at ?? '9999').localeCompare(b.starts_at ?? '9999') ||
      a.id - b.id,
  )
}

/** Diálogo "Nova tarefa" aberto a partir de uma secção: `null` = backlog do projecto. */
type NewTaskTarget = { sprintId: number | null }

/**
 * Planeamento: sprints (activo, planeados, concluídos) e o backlog do projecto. As tarefas movem-se
 * entre secções com o selector de cada linha; "Concluir sprint" pergunta o que fazer às pendentes.
 * Mostra todas as tarefas do projecto (de todos os quadros), porque os sprints são do projecto.
 */
export function BacklogView({
  projectId,
  columns,
  boardColumns,
  tasks,
  can,
  onOpenTask,
}: {
  projectId: number
  /** Colunas de todos os quadros (para saber a coluna e se está concluída). */
  columns: BoardColumn[]
  /** Colunas do quadro seleccionado (para criar tarefas; a primeira é a de omissão). */
  boardColumns: BoardColumn[]
  tasks: Task[]
  can: ProjectPermissions
  onOpenTask: (task: Task) => void
}) {
  const queryClient = useQueryClient()
  const [sprintForm, setSprintForm] = useState<{ sprint: Sprint | null } | null>(null)
  const [newTask, setNewTask] = useState<NewTaskTarget | null>(null)
  const [completing, setCompleting] = useState<Sprint | null>(null)
  const [deleting, setDeleting] = useState<Sprint | null>(null)
  const tasksKey = projectTasksKey(projectId)
  const sprintsKey = projectSprintsKey(projectId)
  const canEdit = canEditTasks(can)

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
      const previous = queryClient.getQueriesData<Task[]>({ queryKey: tasksKey })
      queryClient.setQueriesData<Task[]>({ queryKey: tasksKey }, (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, sprint_id: sprintId } : t)),
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data)
    },
    onSettled: (_data, _error, { taskId }) =>
      invalidateProjectTasks(queryClient, projectId, taskId),
  })

  const statusMutation = useMutation({
    mutationFn: ({ sprintId, status }: { sprintId: number; status: SprintStatus }) =>
      updateSprint(sprintId, { status }),
    onSettled: () => invalidateSprints(queryClient, projectId),
  })

  if (sprintsQuery.isLoading) return <LoadingState label="A carregar sprints…" />
  if (sprintsQuery.isError) return <ErrorState message="Não foi possível carregar os sprints." />

  const isDone = (task: Task) => columnsById.get(task.board_column_id)?.is_done_column ?? false
  const nextPlannedSprint = (current: Sprint) =>
    sprints.find((s) => s.status === 'planned' && s.id !== current.id) ?? null

  const newTaskButton = (sprintId: number | null, sectionName: string) =>
    can.create_task ? (
      <Button
        size="sm"
        variant="outline"
        disabled={boardColumns.length === 0}
        onClick={() => setNewTask({ sprintId })}
        aria-label={`Nova tarefa em ${sectionName}`}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nova tarefa
      </Button>
    ) : null

  const renderTasks = (list: Task[], empty: { title: string; description: string }) =>
    list.length === 0 ? (
      <EmptyState title={empty.title} description={empty.description} />
    ) : (
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
        {list.map((task) => {
          const column = columnsById.get(task.board_column_id)
          const overdue = isOverdue(task.due_at, column?.is_done_column ?? false)
          const moveTargets = sprints.filter(
            (s) => s.status !== 'completed' || s.id === task.sprint_id,
          )
          return (
            <li key={task.id} className="flex flex-wrap items-center gap-3 p-2 text-sm">
              <button
                type="button"
                onClick={() => onOpenTask(task)}
                className="min-w-0 flex-1 truncate text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {task.title}
              </button>
              <AssigneeAvatars assignees={task.assignees} />
              <Badge variant="outline">{column?.name ?? 'Coluna desconhecida'}</Badge>
              <Badge variant={PRIORITY_VARIANT[task.priority]}>
                {PRIORITY_LABEL[task.priority]}
              </Badge>
              {task.due_at && (
                <span
                  className={overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}
                >
                  {formatDate(task.due_at)}
                  {overdue && ' (atrasada)'}
                </span>
              )}
              <Select
                value={task.sprint_id == null ? BACKLOG_VALUE : String(task.sprint_id)}
                disabled={!canEdit}
                onValueChange={(value) =>
                  moveMutation.mutate({
                    taskId: task.id,
                    sprintId: value === BACKLOG_VALUE ? null : Number(value),
                  })
                }
              >
                <SelectTrigger className="w-56" aria-label={`Sprint da tarefa "${task.title}"`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BACKLOG_VALUE}>{BACKLOG_OPTION_LABEL}</SelectItem>
                  {moveTargets.map((sprint) => (
                    <SelectItem
                      key={sprint.id}
                      value={String(sprint.id)}
                      disabled={sprint.status === 'completed'}
                    >
                      {sprintOptionLabel(sprint)}
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
  const hasActive = sprints.some((s) => s.status === 'active')
  const completingTasks = completing ? (tasksBySprint.get(completing.id) ?? []) : []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          Planeie aqui: crie sprints e use o selector de cada tarefa para a passar do backlog para
          um sprint.
          <InfoTooltip {...HELP.sprintStatus} />
        </p>
        <div className="flex items-center gap-1">
          <Button disabled={!can.manage_sprints} onClick={() => setSprintForm({ sprint: null })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo sprint
          </Button>
          {!can.manage_sprints && (
            <InfoTooltip
              icon="lock"
              label="Novo sprint"
              text={NO_PERMISSION_REASON.manage_sprints}
            />
          )}
        </div>
      </div>

      {moveMutation.isError && (
        <p className="text-sm text-destructive" role="alert">
          {mutationErrorMessage(moveMutation.error, 'Não foi possível mover a tarefa.')}
        </p>
      )}

      {sprints.length === 0 && (
        <EmptyState
          title="Ainda não há sprints"
          description={
            can.manage_sprints
              ? 'Crie um sprint (ex.: 2 semanas), junte-lhe tarefas do backlog e inicie-o para o Kanban mostrar só esse trabalho.'
              : 'Um gestor do workspace pode criar sprints para planear o trabalho por períodos curtos.'
          }
        />
      )}

      {sprints.map((sprint) => {
        const sprintTasks = tasksBySprint.get(sprint.id) ?? []
        const doneCount = sprintTasks.filter(isDone).length
        const statusError =
          statusMutation.isError && statusMutation.variables?.sprintId === sprint.id
            ? statusMutation.error
            : null
        return (
          <Card key={sprint.id} aria-labelledby={`sprint-${sprint.id}-title`} role="region">
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle id={`sprint-${sprint.id}-title`}>{sprint.name}</CardTitle>
                  <span className="flex items-center gap-0.5">
                    <Badge variant={STATUS_VARIANT[sprint.status]}>
                      {SPRINT_STATUS_LABEL[sprint.status]}
                    </Badge>
                    <InfoTooltip {...STATUS_HELP[sprint.status]} />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {sprintTasks.length} tarefa(s)
                    {sprintTasks.length > 0 && ` · ${doneCount} concluída(s)`}
                  </span>
                </div>
                <CardDescription>
                  <span className="first-letter:uppercase">
                    {formatDateRange(sprint.starts_at, sprint.ends_at)}
                  </span>
                  {sprint.goal && <> · {sprint.goal}</>}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sprint.status !== 'completed' && newTaskButton(sprint.id, sprint.name)}
                {can.manage_sprints && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setSprintForm({ sprint })}
                      aria-label={`Editar sprint ${sprint.name}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    {sprint.status !== 'active' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleting(sprint)}
                        aria-label={`Apagar sprint ${sprint.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                    {sprint.status === 'planned' && (
                      <Button
                        size="sm"
                        variant={hasActive ? 'outline' : 'default'}
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({ sprintId: sprint.id, status: 'active' })
                        }
                      >
                        Iniciar sprint
                      </Button>
                    )}
                    {sprint.status === 'active' && (
                      <Button
                        size="sm"
                        disabled={statusMutation.isPending}
                        onClick={() => setCompleting(sprint)}
                      >
                        Concluir sprint
                      </Button>
                    )}
                  </>
                )}
              </div>
              {statusError != null && (
                <p className="basis-full text-sm text-destructive" role="alert">
                  {mutationErrorMessage(statusError, 'Não foi possível actualizar o sprint.')}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {renderTasks(sprintTasks, {
                title: 'Sem tarefas neste sprint',
                description:
                  sprint.status === 'completed'
                    ? 'Este sprint terminou sem tarefas associadas.'
                    : 'Passe tarefas do backlog do projecto para aqui com o selector de cada tarefa, ou crie uma nova.',
              })}
            </CardContent>
          </Card>
        )
      })}

      <Card role="region" aria-labelledby="project-backlog-title">
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <CardTitle id="project-backlog-title">Backlog do projecto</CardTitle>
              <InfoTooltip {...HELP.backlog} />
              <span className="text-xs text-muted-foreground">{backlogTasks.length} tarefa(s)</span>
            </div>
            <CardDescription>Tarefas ainda não planeadas em nenhum sprint.</CardDescription>
          </div>
          {newTaskButton(null, 'Backlog do projecto')}
        </CardHeader>
        <CardContent>
          {renderTasks(backlogTasks, {
            title: 'O backlog do projecto está vazio',
            description: 'As tarefas novas criadas sem sprint aparecem aqui.',
          })}
        </CardContent>
      </Card>

      {sprintForm && (
        <SprintFormDialog
          open
          projectId={projectId}
          sprint={sprintForm.sprint}
          onOpenChange={(open) => !open && setSprintForm(null)}
        />
      )}
      {newTask && (
        <TaskFormDialog
          open
          projectId={projectId}
          columns={boardColumns}
          defaultSprintId={newTask.sprintId}
          onOpenChange={(open) => !open && setNewTask(null)}
        />
      )}
      {completing && (
        <CompleteSprintDialog
          open
          projectId={projectId}
          sprint={completing}
          pendingTasks={completingTasks.filter((t) => !isDone(t))}
          nextSprint={nextPlannedSprint(completing)}
          onOpenChange={(open) => !open && setCompleting(null)}
        />
      )}
      <DeleteConfirmDialog
        key={deleting?.id ?? 'none'}
        item={deleting}
        onClose={() => setDeleting(null)}
        title={`Apagar o sprint “${deleting?.name ?? ''}”?`}
        description="As tarefas deste sprint não são apagadas: voltam ao backlog do projecto."
        remove={(sprint) => deleteSprint(sprint.id)}
        onDeleted={() => invalidateSprints(queryClient, projectId)}
        errorFallback="Não foi possível apagar o sprint."
      />
    </div>
  )
}
