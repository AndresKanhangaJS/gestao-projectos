import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CheckCircle2 } from 'lucide-react'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { HELP } from '@/lib/help'
import { TaskCard } from './TaskCard'
import type { BoardColumn, Task } from '@/types/projects'

export function Column({
  column,
  tasks,
  onOpenTask,
  canMove = true,
}: {
  column: BoardColumn
  tasks: Task[]
  onOpenTask: (task: Task) => void
  canMove?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { columnId: column.id },
    disabled: !canMove,
  })
  const headingId = `kanban-column-${column.id}`

  return (
    <section
      aria-labelledby={headingId}
      className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/60"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1">
          <h2 id={headingId} className="truncate text-sm font-semibold">
            {column.name}
          </h2>
          {column.is_done_column && (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              <span className="sr-only">(coluna de conclusão)</span>
              <InfoTooltip {...HELP.doneColumn} />
            </>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          <span aria-hidden="true">{tasks.length}</span>
          <span className="sr-only">{tasks.length} tarefa(s)</span>
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[4rem] flex-1 flex-col gap-2 p-2 transition-colors ${isOver ? 'bg-primary/5' : ''}`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpenTask} canMove={canMove} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted-foreground">Sem tarefas nesta coluna.</p>
        )}
      </div>
    </section>
  )
}
