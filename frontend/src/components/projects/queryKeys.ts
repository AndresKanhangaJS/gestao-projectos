import type { TaskSprintFilter } from '@/types/projects'

/**
 * Chaves partilhadas do TanStack Query para as vistas de um projecto (Kanban, Lista, Backlog, detalhe).
 *
 * `projectTasksKey` é o prefixo de todas as listas de tarefas do projecto: invalidá-lo (ou usar
 * `setQueriesData` com ele) actualiza tanto a lista completa como as listas filtradas por sprint.
 */
export const projectTasksKey = (projectId: number) => ['tasks', 'board', projectId] as const
/** Lista de tarefas filtrada por sprint; `all` partilha a cache da lista completa. */
export const projectTasksFilterKey = (projectId: number, sprint: TaskSprintFilter) =>
  sprint === 'all'
    ? projectTasksKey(projectId)
    : ([...projectTasksKey(projectId), { sprint }] as const)
export const projectSprintsKey = (projectId: number) => ['sprints', projectId] as const
export const projectBoardsKey = (projectId: number) => ['boards', projectId] as const
export const projectLabelsKey = (projectId: number) => ['labels', projectId] as const
export const projectActivityKey = (projectId: number) => ['activity', 'project', projectId] as const
export const projectKey = (projectId: number) => ['projects', projectId] as const
export const projectsKey = ['projects'] as const
export const projectLinkOptionsKey = ['projects', 'link-options'] as const
export const workspacesKey = ['workspaces'] as const
export const workspaceKey = (workspaceId: number) => ['workspaces', workspaceId] as const
export const userSearchKey = (search: string) => ['users', 'search', search] as const

/** Prefixo de todas as tarefas em cache (listas de todos os projectos e detalhes). */
export const tasksRootKey = ['tasks'] as const

export const taskKey = (taskId: number) => ['tasks', 'detail', taskId] as const
/** Prefixo de todos os detalhes de tarefa em cache. */
export const taskDetailsKey = ['tasks', 'detail'] as const
export const taskRelationsKey = (taskId: number) =>
  ['tasks', 'detail', taskId, 'relations'] as const
export const taskAttachmentsKey = (taskId: number) =>
  ['tasks', 'detail', taskId, 'attachments'] as const
export const taskActivityKey = (taskId: number) => ['activity', 'task', taskId] as const
