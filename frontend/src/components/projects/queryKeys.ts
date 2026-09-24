/** Chaves partilhadas do TanStack Query para as vistas de um projecto (Kanban, Lista, Backlog, detalhe). */
export const projectTasksKey = (projectId: number) => ['tasks', 'board', projectId] as const
export const projectSprintsKey = (projectId: number) => ['sprints', projectId] as const
export const projectBoardsKey = (projectId: number) => ['boards', projectId] as const
export const projectLabelsKey = (projectId: number) => ['labels', projectId] as const
export const projectActivityKey = (projectId: number) => ['activity', 'project', projectId] as const
export const projectKey = (projectId: number) => ['projects', projectId] as const
export const workspaceKey = (workspaceId: number) => ['workspaces', workspaceId] as const

export const taskKey = (taskId: number) => ['tasks', 'detail', taskId] as const
export const taskRelationsKey = (taskId: number) => ['tasks', 'detail', taskId, 'relations'] as const
export const taskAttachmentsKey = (taskId: number) => ['tasks', 'detail', taskId, 'attachments'] as const
export const taskActivityKey = (taskId: number) => ['activity', 'task', taskId] as const
