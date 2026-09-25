import { Avatar, AvatarFallback, initials } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import type { UserSummary } from '@/types/projects'

const MAX_VISIBLE = 3

/** Avatares (iniciais) dos responsáveis de uma tarefa, com os nomes acessíveis a leitores de ecrã. */
export function AssigneeAvatars({
  assignees,
  className,
}: {
  assignees: UserSummary[] | undefined
  className?: string
}) {
  const list = assignees ?? []
  if (list.length === 0) return null
  const visible = list.slice(0, MAX_VISIBLE)
  const hidden = list.length - visible.length
  const names = list.map((a) => a.name).join(', ')

  return (
    <span className={cn('flex items-center', className)} title={`Responsáveis: ${names}`}>
      <span className="sr-only">Responsáveis: {names}</span>
      <span className="flex -space-x-1.5" aria-hidden="true">
        {visible.map((user) => (
          <Avatar key={user.id} className="h-6 w-6 border-2 border-card">
            <AvatarFallback className="text-[10px]">{initials(user.name)}</AvatarFallback>
          </Avatar>
        ))}
        {hidden > 0 && (
          <Avatar className="h-6 w-6 border-2 border-card">
            <AvatarFallback className="text-[10px]">+{hidden}</AvatarFallback>
          </Avatar>
        )}
      </span>
    </span>
  )
}
