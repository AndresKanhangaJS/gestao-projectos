import { api } from './client'
import { listWorkspaces } from './workspaces'
import type { Project } from '@/types/projects'

export { getBoard, listProjectBoards } from './boards'

async function listWorkspaceProjects(workspaceId: number): Promise<Project[]> {
  const { data } = await api.get<{ data: Project[] }>(`/projects/workspaces/${workspaceId}/projects`)
  return data.data
}

/** Não existe endpoint global de listagem — agrega os projectos de todos os workspaces do utilizador. */
export async function listProjects(): Promise<Project[]> {
  const workspaces = await listWorkspaces()
  const perWorkspace = await Promise.all(workspaces.map((w) => listWorkspaceProjects(w.id)))
  return perWorkspace.flat()
}

export async function getProject(projectId: number): Promise<Project> {
  const { data } = await api.get<{ data: Project }>(`/projects/${projectId}`)
  return data.data
}

export interface CreateProjectPayload {
  workspace_id: number
  key: string
  name: string
  description?: string | null
}

/** A API cria automaticamente um quadro por omissão (com colunas) para o novo projecto. */
export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const { workspace_id, ...body } = payload
  const { data } = await api.post<{ data: Project }>(`/projects/workspaces/${workspace_id}/projects`, body)
  return data.data
}
