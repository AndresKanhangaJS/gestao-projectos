import { api } from './client'
import type { Sprint, SprintStatus } from '@/types/projects'

export interface SprintPayload {
  name: string
  goal?: string | null
  starts_at?: string | null
  ends_at?: string | null
  status?: SprintStatus | null
}

export async function listSprints(projectId: number): Promise<Sprint[]> {
  const { data } = await api.get<{ data: Sprint[] }>(`/projects/${projectId}/sprints`)
  return data.data
}

export async function createSprint(projectId: number, payload: SprintPayload): Promise<Sprint> {
  const { data } = await api.post<{ data: Sprint }>(`/projects/${projectId}/sprints`, payload)
  return data.data
}

export async function updateSprint(
  sprintId: number,
  payload: Partial<SprintPayload>,
): Promise<Sprint> {
  const { data } = await api.patch<{ data: Sprint }>(`/projects/sprints/${sprintId}`, payload)
  return data.data
}

export async function deleteSprint(sprintId: number): Promise<void> {
  await api.delete(`/projects/sprints/${sprintId}`)
}

export interface CompleteSprintPayload {
  /** `backlog` = tarefas por terminar voltam ao backlog; `sprint` = passam para `target_sprint_id`. */
  move_unfinished_to: 'backlog' | 'sprint'
  target_sprint_id?: number
}

export interface CompleteSprintResult {
  sprint: Sprint
  movedCount: number
}

/**
 * Conclui o sprint e move as tarefas por terminar numa única operação atómica no backend
 * (`POST sprints/{sprint}/complete`). A API decide quais estão por terminar.
 */
export async function completeSprint(
  sprintId: number,
  payload: CompleteSprintPayload,
): Promise<CompleteSprintResult> {
  const { data } = await api.post<{ data: Sprint; moved_count: number }>(
    `/projects/sprints/${sprintId}/complete`,
    payload,
  )
  return { sprint: data.data, movedCount: data.moved_count }
}
