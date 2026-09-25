import { api } from './client'
import { listWorkspaces } from './workspaces'
import type { Project, ProjectLinkOptions, ProjectStatus } from '@/types/projects'

export { getBoard, listProjectBoards } from './boards'

/** Filtros de listagem (`?client_id=&software_product_id=`); omitidos = todos. */
export interface ProjectFilters {
  client_id?: number
  software_product_id?: number
}

async function listWorkspaceProjects(
  workspaceId: number,
  filters: ProjectFilters = {},
): Promise<Project[]> {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null))
  const { data } = await api.get<{ data: Project[] }>(
    `/projects/workspaces/${workspaceId}/projects`,
    { params: Object.keys(params).length ? params : undefined },
  )
  return data.data
}

/** Não existe endpoint global de listagem: agrega os projectos de todos os workspaces do utilizador. */
export async function listProjects(filters: ProjectFilters = {}): Promise<Project[]> {
  const workspaces = await listWorkspaces()
  const perWorkspace = await Promise.all(
    workspaces.map((w) => listWorkspaceProjects(w.id, filters)),
  )
  return perWorkspace.flat()
}

export async function getProject(projectId: number): Promise<Project> {
  const { data } = await api.get<{ data: Project }>(`/projects/${projectId}`)
  return data.data
}

/** Ligação opcional do projecto ao cliente: software → cliente com esse software → módulos. */
export interface ProjectLinkPayload {
  software_product_id: number | null
  client_id: number | null
  module_ids: number[]
}

export interface CreateProjectPayload extends Partial<ProjectLinkPayload> {
  workspace_id: number
  key: string
  name: string
  description?: string | null
}

export interface UpdateProjectPayload extends Partial<ProjectLinkPayload> {
  key?: string
  name?: string
  description?: string | null
  status?: ProjectStatus
}

export async function updateProject(
  projectId: number,
  payload: UpdateProjectPayload,
): Promise<Project> {
  const { data } = await api.patch<{ data: Project }>(`/projects/${projectId}`, payload)
  return data.data
}

/** Opções para ligar um projecto a software, cliente e módulos (sem usar endpoints de Infra). */
export async function getProjectLinkOptions(): Promise<ProjectLinkOptions> {
  const { data } = await api.get<ProjectLinkOptions>('/projects/link-options')
  return data
}

/** A API cria automaticamente um quadro por omissão (com colunas) para o novo projecto. */
export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const { workspace_id, ...body } = payload
  const { data } = await api.post<{ data: Project }>(
    `/projects/workspaces/${workspace_id}/projects`,
    body,
  )
  return data.data
}
