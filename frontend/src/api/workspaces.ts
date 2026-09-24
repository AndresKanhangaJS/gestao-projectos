import { api } from './client'
import type { Workspace } from '@/types/projects'

export async function listWorkspaces(): Promise<Workspace[]> {
  const { data } = await api.get<{ data: Workspace[] }>('/projects/workspaces')
  return data.data
}

/** Detalhe do workspace, incluindo `members` (usado para escolher responsáveis de tarefas). */
export async function getWorkspace(workspaceId: number): Promise<Workspace> {
  const { data } = await api.get<{ data: Workspace }>(`/projects/workspaces/${workspaceId}`)
  return data.data
}

export async function createWorkspace(payload: { name: string; description?: string | null }): Promise<Workspace> {
  const { data } = await api.post<{ data: Workspace }>('/projects/workspaces', payload)
  return data.data
}
