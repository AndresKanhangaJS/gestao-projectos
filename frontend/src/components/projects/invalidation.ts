import type { QueryClient } from '@tanstack/react-query'
import {
  projectActivityKey,
  projectKey,
  projectSprintsKey,
  projectTasksKey,
  taskActivityKey,
  taskKey,
} from './queryKeys'

/**
 * Depois de criar/alterar/mover/apagar tarefas: refresca todas as listas de tarefas do projecto
 * (Kanban filtrado, Lista, Backlog), as contagens dos sprints e a actividade. Com `taskId`,
 * refresca também o detalhe dessa tarefa.
 */
export function invalidateProjectTasks(
  queryClient: QueryClient,
  projectId: number,
  taskId?: number,
): void {
  void queryClient.invalidateQueries({ queryKey: projectTasksKey(projectId) })
  void queryClient.invalidateQueries({ queryKey: projectSprintsKey(projectId) })
  void queryClient.invalidateQueries({ queryKey: projectActivityKey(projectId) })
  if (taskId != null) {
    void queryClient.invalidateQueries({ queryKey: taskKey(taskId) })
    void queryClient.invalidateQueries({ queryKey: taskActivityKey(taskId) })
  }
}

/**
 * Depois de mudar o estado/dados de um sprint: o projecto (`active_sprint`) e a lista do Kanban
 * ("sprint activo") mudam também.
 */
export function invalidateSprints(queryClient: QueryClient, projectId: number): void {
  void queryClient.invalidateQueries({ queryKey: projectKey(projectId) })
  invalidateProjectTasks(queryClient, projectId)
}
