import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { listSprints } from '@/api/sprints'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { PRIORITY_LABEL, PRIORITY_RANK, PRIORITY_VARIANT } from '@/lib/labels'
import { formatDate, isOverdue } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BoardColumn, Task } from '@/types/projects'
import { AssigneeAvatars } from './AssigneeAvatars'
import { projectSprintsKey } from './queryKeys'

type SortKey = 'title' | 'column' | 'sprint' | 'priority' | 'assignees' | 'due_at'
type SortDirection = 'asc' | 'desc'

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Título' },
  { key: 'column', label: 'Coluna' },
  { key: 'sprint', label: 'Sprint' },
  { key: 'priority', label: 'Prioridade' },
  { key: 'assignees', label: 'Responsáveis' },
  { key: 'due_at', label: 'Prazo' },
]

const collator = new Intl.Collator('pt-PT', { sensitivity: 'base', numeric: true })

/** Nome do sprint da tarefa, ou "Backlog" se não estiver em nenhum sprint. */
function sprintLabel(names: Map<number, string>, task: Task): string {
  return task.sprint_id == null
    ? 'Backlog'
    : (names.get(task.sprint_id) ?? `Sprint #${task.sprint_id}`)
}

export function TaskListView({
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
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'column',
    direction: 'asc',
  })

  const sprintsQuery = useQuery({
    queryKey: projectSprintsKey(projectId),
    queryFn: () => listSprints(projectId),
  })
  const columnsById = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns])
  const sprintNames = useMemo(
    () => new Map((sprintsQuery.data ?? []).map((s) => [s.id, s.name])),
    [sprintsQuery.data],
  )
  const sprintName = (task: Task) => sprintLabel(sprintNames, task)

  const sortedTasks = useMemo(() => {
    const compare = (a: Task, b: Task): number => {
      switch (sort.key) {
        case 'title':
          return collator.compare(a.title, b.title)
        case 'sprint':
          return collator.compare(sprintLabel(sprintNames, a), sprintLabel(sprintNames, b))
        case 'column': {
          const pa = columnsById.get(a.board_column_id)?.position ?? Number.MAX_SAFE_INTEGER
          const pb = columnsById.get(b.board_column_id)?.position ?? Number.MAX_SAFE_INTEGER
          return pa - pb || a.position - b.position
        }
        case 'priority':
          return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
        case 'assignees':
          return collator.compare(a.assignees?.[0]?.name ?? '￿', b.assignees?.[0]?.name ?? '￿')
        case 'due_at':
          // Tarefas sem prazo ficam sempre no fim.
          if (!a.due_at && !b.due_at) return 0
          if (!a.due_at) return sort.direction === 'asc' ? 1 : -1
          if (!b.due_at) return sort.direction === 'asc' ? -1 : 1
          return a.due_at.localeCompare(b.due_at)
      }
    }
    const factor = sort.direction === 'asc' ? 1 : -1
    return [...tasks].sort((a, b) => compare(a, b) * factor)
  }, [tasks, sort, columnsById, sprintNames])

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Este quadro ainda não tem tarefas"
        description="Crie a primeira com “Nova tarefa”. As tarefas novas ficam no backlog do projecto até serem planeadas num sprint."
      />
    )
  }

  return (
    <>
      {/* Mobile: cartões (a tabela tem colunas a mais para 360px). */}
      <ul className="flex flex-col gap-2 md:hidden" aria-label="Tarefas do projecto">
        {sortedTasks.map((task) => {
          const column = columnsById.get(task.board_column_id)
          const overdue = isOverdue(task.due_at, column?.is_done_column ?? false)
          return (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onOpenTask(task)}
                className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0 break-words font-medium">
                    {task.title}
                    {task.parent_id != null && (
                      <span className="ml-1 text-xs text-muted-foreground">(subtarefa)</span>
                    )}
                  </span>
                  <Badge variant={PRIORITY_VARIANT[task.priority]}>
                    {PRIORITY_LABEL[task.priority]}
                  </Badge>
                </span>
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant="outline">{column?.name ?? 'Coluna desconhecida'}</Badge>
                  <span>{sprintName(task)}</span>
                  <span aria-hidden="true">·</span>
                  <span className={overdue ? 'font-medium text-destructive' : undefined}>
                    {task.due_at ? formatDate(task.due_at) : 'Sem prazo'}
                    {overdue && ' (atrasada)'}
                  </span>
                </span>
                {task.assignees?.length ? <AssigneeAvatars assignees={task.assignees} /> : null}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="hidden md:block">
        <Table aria-label="Tarefas do projecto">
          <TableHeader>
            <TableRow>
              {COLUMNS.map(({ key, label }) => {
                const active = sort.key === key
                const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown
                return (
                  <TableHead
                    key={key}
                    aria-sort={
                      active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className="inline-flex items-center gap-1 rounded-sm uppercase hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {label}
                      <Icon className={cn('h-3 w-3', !active && 'opacity-40')} aria-hidden="true" />
                    </button>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task) => {
              const column = columnsById.get(task.board_column_id)
              const overdue = isOverdue(task.due_at, column?.is_done_column ?? false)
              return (
                <TableRow key={task.id} className="cursor-pointer" onClick={() => onOpenTask(task)}>
                  <TableCell>
                    <button
                      type="button"
                      className="text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpenTask(task)
                      }}
                    >
                      {task.title}
                    </button>
                    {task.parent_id != null && (
                      <span className="ml-2 text-xs text-muted-foreground">(subtarefa)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{column?.name ?? 'Coluna desconhecida'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{sprintName(task)}</TableCell>
                  <TableCell>
                    <Badge variant={PRIORITY_VARIANT[task.priority]}>
                      {PRIORITY_LABEL[task.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.assignees?.length ? (
                      <span className="flex items-center gap-2">
                        <AssigneeAvatars assignees={task.assignees} />
                        <span aria-hidden="true" className="truncate">
                          {task.assignees.map((a) => a.name).join(', ')}
                        </span>
                      </span>
                    ) : (
                      'Sem responsável'
                    )}
                  </TableCell>
                  <TableCell>
                    {overdue ? (
                      <span className="font-medium text-destructive">
                        {formatDate(task.due_at)} <span className="text-xs">(atrasada)</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {task.due_at ? formatDate(task.due_at) : 'Sem prazo'}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
