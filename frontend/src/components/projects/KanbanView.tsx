import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { moveTask } from '@/api/tasks'
import { Column } from '@/components/kanban/Column'
import type { BoardColumn, Task } from '@/types/projects'
import { projectTasksKey } from './queryKeys'

export function KanbanView({
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
  const tasksKey = projectTasksKey(projectId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const moveMutation = useMutation({
    mutationFn: ({ taskId, columnId, position }: { taskId: number; columnId: number; position: number }) =>
      moveTask(taskId, { board_column_id: columnId, position }),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: tasksKey })
    },
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
    if (!over) return

    const taskId = Number(active.id)
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const overColumnId = tasksByColumn.has(Number(over.id))
      ? Number(over.id)
      : (tasks.find((t) => t.id === Number(over.id))?.board_column_id ?? task.board_column_id)

    const destinationTasks = tasksByColumn.get(overColumnId) ?? []
    const position = destinationTasks.length

    queryClient.setQueryData<Task[]>(tasksKey, (old) =>
      (old ?? []).map((t) => (t.id === taskId ? { ...t, board_column_id: overColumnId, position } : t)),
    )

    moveMutation.mutate({ taskId, columnId: overColumnId, position })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={tasksByColumn.get(column.id) ?? []}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>
    </DndContext>
  )
}
