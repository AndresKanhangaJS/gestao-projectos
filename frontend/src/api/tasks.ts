import { api } from './client'
import type { Paginated, PaginationMeta } from './pagination'
import type {
  ActivityEntry,
  Task,
  TaskAttachment,
  TaskComment,
  TaskPriority,
  TaskRelation,
  TaskRelationType,
  TaskType,
  UserSummary,
} from '@/types/projects'

export async function listTasks(projectId: number): Promise<Task[]> {
  const { data } = await api.get<{ data: Task[] }>(`/projects/${projectId}/tasks`)
  return data.data
}

export async function getTask(taskId: number): Promise<Task> {
  const { data } = await api.get<{ data: Task }>(`/projects/tasks/${taskId}`)
  return data.data
}

export interface CreateTaskPayload {
  project_id: number
  board_column_id: number
  title: string
  description?: string | null
  type: TaskType
  priority: TaskPriority
  sprint_id?: number | null
  due_at?: string | null
  label_ids?: number[]
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { project_id, ...body } = payload
  const { data } = await api.post<{ data: Task }>(`/projects/${project_id}/tasks`, body)
  return data.data
}

export async function createSubtask(taskId: number, title: string): Promise<Task> {
  const { data } = await api.post<{ data: Task }>(`/projects/tasks/${taskId}/subtasks`, { title })
  return data.data
}

export interface UpdateTaskPayload {
  title?: string
  description?: string | null
  type?: TaskType
  priority?: TaskPriority
  sprint_id?: number | null
  estimate?: number | null
  starts_at?: string | null
  due_at?: string | null
  label_ids?: number[]
}

export async function updateTask(taskId: number, payload: UpdateTaskPayload): Promise<Task> {
  const { data } = await api.put<{ data: Task }>(`/projects/tasks/${taskId}`, payload)
  return data.data
}

export async function moveTask(
  taskId: number,
  payload: { board_column_id: number; position: number },
): Promise<Task> {
  const { data } = await api.post<{ data: Task }>(`/projects/tasks/${taskId}/move`, payload)
  return data.data
}

export async function deleteTask(taskId: number): Promise<void> {
  await api.delete(`/projects/tasks/${taskId}`)
}

// Comentários

export async function listComments(taskId: number): Promise<TaskComment[]> {
  const { data } = await api.get<{ data: TaskComment[] }>(`/projects/tasks/${taskId}/comments`)
  return data.data
}

export async function addComment(taskId: number, body: string): Promise<TaskComment> {
  const { data } = await api.post<{ data: TaskComment }>(`/projects/tasks/${taskId}/comments`, { body })
  return data.data
}

// Responsáveis e observadores

export async function syncAssignees(taskId: number, userIds: number[]): Promise<Task> {
  const { data } = await api.put<{ data: Task }>(`/projects/tasks/${taskId}/assignees`, {
    user_ids: userIds,
  })
  return data.data
}

/** Liga/desliga o utilizador autenticado como observador. Devolve a lista actualizada de observadores. */
export async function toggleWatch(taskId: number): Promise<UserSummary[]> {
  const { data } = await api.post<{ data: UserSummary[] }>(`/projects/tasks/${taskId}/watch`)
  return data.data
}

// Relações

export async function listRelations(taskId: number): Promise<TaskRelation[]> {
  const { data } = await api.get<{ data: TaskRelation[] }>(`/projects/tasks/${taskId}/relations`)
  return data.data
}

export async function createRelation(
  taskId: number,
  payload: { related_task_id: number; type: TaskRelationType },
): Promise<TaskRelation> {
  const { data } = await api.post<{ data: TaskRelation }>(`/projects/tasks/${taskId}/relations`, payload)
  return data.data
}

export async function deleteRelation(taskId: number, relationId: number): Promise<void> {
  await api.delete(`/projects/tasks/${taskId}/relations/${relationId}`)
}

// Anexos

export async function listAttachments(taskId: number): Promise<TaskAttachment[]> {
  const { data } = await api.get<{ data: TaskAttachment[] }>(`/projects/tasks/${taskId}/attachments`)
  return data.data
}

export async function uploadAttachment(taskId: number, file: File): Promise<TaskAttachment> {
  const body = new FormData()
  body.append('file', file)
  const { data } = await api.post<{ data: TaskAttachment }>(`/projects/tasks/${taskId}/attachments`, body)
  return data.data
}

export async function deleteAttachment(taskId: number, attachmentId: number): Promise<void> {
  await api.delete(`/projects/tasks/${taskId}/attachments/${attachmentId}`)
}

/**
 * O download é um endpoint autenticado (cookie de sessão Sanctum): pede o ficheiro como blob via
 * axios e dispara a transferência no browser, em vez de um link directo.
 */
export async function downloadAttachment(taskId: number, attachment: TaskAttachment): Promise<void> {
  const { data } = await api.get<Blob>(`/projects/tasks/${taskId}/attachments/${attachment.id}/download`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = attachment.original_name
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Actividade

export type ActivityPage = Paginated<ActivityEntry, Partial<PaginationMeta>>

export async function getTaskActivity(taskId: number, page = 1): Promise<ActivityPage> {
  const { data } = await api.get<ActivityPage>(`/projects/tasks/${taskId}/activity`, { params: { page } })
  return { data: data.data, meta: data.meta ?? {} }
}

export async function getProjectActivity(projectId: number, page = 1): Promise<ActivityPage> {
  const { data } = await api.get<ActivityPage>(`/projects/${projectId}/activity`, { params: { page } })
  return { data: data.data, meta: data.meta ?? {} }
}
