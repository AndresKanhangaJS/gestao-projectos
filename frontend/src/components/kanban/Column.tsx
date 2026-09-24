import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskCard } from './TaskCard'
import type { BoardColumn, Task } from '@/types/projects'

export function Column({
  column,
  tasks,
  onOpenTask,
}: {
  column: BoardColumn
  tasks: Task[]
  onOpenTask: (task: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { columnId: column.id } })

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/60">
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-sm font-semibold">{column.name}</h2>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[4rem] flex-1 flex-col gap-2 p-2 transition-colors ${isOver ? 'bg-primary/5' : ''}`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
