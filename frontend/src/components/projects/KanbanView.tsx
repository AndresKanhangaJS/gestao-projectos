import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { moveTask } from '@/api/tasks'
import { Column } from '@/components/kanban/Column'
import { mutationErrorMessage } from '@/lib/errors'
import type { BoardColumn, Task } from '@/types/projects'
import { invalidateProjectTasks } from './invalidation'
import { endOfColumnPosition } from './kanbanPosition'
import { projectTasksKey } from './queryKeys'

export function KanbanView({
  projectId,
  columns,
  tasks,
  onOpenTask,
  canMove = true,
}: {
  projectId: number
  columns: BoardColumn[]
  tasks: Task[]
  onOpenTask: (task: Task) => void
  /** Sem permissão para alterar tarefas, os cartões não se arrastam (só abrem o detalhe). */
  canMove?: boolean
}) {
  const queryClient = useQueryClient()
  const tasksKey = projectTasksKey(projectId)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // Toque: é preciso manter o dedo ~250 ms para arrastar; um gesto rápido faz scroll normal.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const moveMutation = useMutation({
    mutationFn: ({
      taskId,
      columnId,
      position,
    }: {
      taskId: number
      columnId: number
      position: number
    }) => moveTask(taskId, { board_column_id: columnId, position }),
    onMutate: async ({ taskId, columnId, position }) => {
      // Actualização optimista em todas as listas do projecto (Kanban filtrado, Lista, Backlog).
      await queryClient.cancelQueries({ queryKey: tasksKey })
      const previous = queryClient.getQueriesData<Task[]>({ queryKey: tasksKey })
      queryClient.setQueriesData<Task[]>({ queryKey: tasksKey }, (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, board_column_id: columnId, position } : t)),
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data)
    },
    onSettled: (_data, _error, { taskId }) =>
      invalidateProjectTasks(queryClient, projectId, taskId),
  })

  const tasksByColumn = useMemo(() => {
    const map = new Map<number, Task[]>()
    for (const column of columns) map.set(column.id, [])
    for (const task of tasks) {
      const list = map.get(task.board_column_id)
      if (list) list.push(task)
      else map.set(task.board_column_id, [task])
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position)
    return map
  }, [columns, tasks])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || !canMove) return

    const taskId = Number(active.id)
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const overColumnId = tasksByColumn.has(Number(over.id))
      ? Number(over.id)
      : (tasks.find((t) => t.id === Number(over.id))?.board_column_id ?? task.board_column_id)

    if (overColumnId === task.board_column_id) return

    // Fim da coluna real (todas as tarefas do projecto), não da lista filtrada por sprint.
    const allTasks = queryClient.getQueryData<Task[]>(tasksKey) ?? tasks
    const position = endOfColumnPosition(allTasks, overColumnId, taskId)
    moveMutation.mutate({ taskId, columnId: overColumnId, position })
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      {moveMutation.isError && (
        <p className="text-sm text-destructive" role="alert">
          {mutationErrorMessage(moveMutation.error, 'Não foi possível mover a tarefa.')}
        </p>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="relative flex flex-1 gap-3 overflow-x-auto overscroll-x-contain pb-4 sm:gap-4">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              tasks={tasksByColumn.get(column.id) ?? []}
              onOpenTask={onOpenTask}
              canMove={canMove}
            />
          ))}
        </div>
      </DndContext>
    </div>
  )
}
