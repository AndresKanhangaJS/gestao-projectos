import type { ActiveSprintSummary, TaskSprintFilter } from '@/types/projects'

const SPRINT_FILTERS: readonly TaskSprintFilter[] = ['active', 'all', 'backlog']

/**
 * Filtro do Kanban: `?sprint=` se válido; por omissão o sprint activo (se existir) ou todas as
 * tarefas. Sem sprint activo, "active" passa a "all".
 */
export function resolveSprintFilter(
  param: string | null,
  activeSprint: ActiveSprintSummary | null | undefined,
): TaskSprintFilter {
  const requested = SPRINT_FILTERS.find((f) => f === param)
  const filter: TaskSprintFilter = requested ?? (activeSprint ? 'active' : 'all')
  return filter === 'active' && !activeSprint ? 'all' : filter
}
