import { api } from './client'
import type { Task } from '@/types/projects'

/** Pesquisa de tarefas por título/descrição/etiqueta (mínimo 2 caracteres, validado pela API). */
export async function searchTasks(q: string): Promise<Task[]> {
  const { data } = await api.get<{ data: Task[] }>('/projects/search', { params: { q } })
  return data.data
}
