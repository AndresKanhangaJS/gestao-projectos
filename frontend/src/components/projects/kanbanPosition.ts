import type { Task } from '@/types/projects'

/**
 * Posição "fim da coluna" ao largar um cartão noutra coluna do Kanban.
 *
 * O `TaskService::move` do backend não limita a posição (grava o valor recebido e só desloca as
 * tarefas com posição >= destino), por isso tem de ser calculada sobre TODAS as tarefas da
 * coluna (e não sobre a lista filtrada por sprint que o Kanban mostra), para não criar buracos
 * nem colidir com tarefas escondidas pelo filtro.
 */
export function endOfColumnPosition(
  allTasks: readonly Task[],
  columnId: number,
  movingTaskId: number,
): number {
  return allTasks.filter((t) => t.board_column_id === columnId && t.id !== movingTaskId).length
}
