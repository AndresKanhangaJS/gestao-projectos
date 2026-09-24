import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { PRIORITY_LABEL, PRIORITY_VARIANT, TASK_TYPE_LABEL } from '@/lib/labels'
import { Badge } from '@/components/ui/Badge'
import type { Task } from '@/types/projects'

export function TaskCard({ task, onOpen }: { task: Task; onOpen: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task)}
      className={cn(
        'flex w-full flex-col gap-2 rounded-md border border-border bg-card p-3 text-left text-sm shadow-sm transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging && 'opacity-50',
      )}
      aria-label={`Tarefa: ${task.title}. Prioridade ${PRIORITY_LABEL[task.priority]}. Prima Enter para abrir; espaço e setas para mover.`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{task.title}</span>
        <Badge variant={PRIORITY_VARIANT[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
      </div>
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 text-[10px]"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: label.color ?? 'currentColor' }}
                aria-hidden="true"
              />
              {label.name}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{TASK_TYPE_LABEL[task.type]}</span>
        {task.due_at && <span>{formatDate(task.due_at)}</span>}
      </div>
      {(task.subtasks_count ?? 0) > 0 && (
        <span className="text-xs text-muted-foreground">{task.subtasks_count} subtarefa(s)</span>
      )}
    </button>
  )
}
