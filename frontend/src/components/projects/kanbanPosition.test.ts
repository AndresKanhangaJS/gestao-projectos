import { describe, expect, it } from 'vitest'
import type { Task } from '@/types/projects'
import { endOfColumnPosition } from './kanbanPosition'

function task(id: number, columnId: number, sprintId: number | null): Task {
  return {
    id,
    project_id: 1,
    board_column_id: columnId,
    sprint_id: sprintId,
    parent_id: null,
    type: 'task',
    priority: 'medium',
    title: `T${id}`,
    description: null,
    estimate: null,
    starts_at: null,
    due_at: null,
    position: 0,
    created_at: '2026-09-20T10:00:00Z',
  }
}

describe('endOfColumnPosition', () => {
  it('conta todas as tarefas da coluna de destino, incluindo as escondidas pelo filtro de sprint', () => {
    const all = [task(1, 10, 3), task(2, 11, 3), task(3, 11, null), task(4, 11, 7)]
    // Com o filtro "sprint activo" (3), a coluna 11 mostra só 1 tarefa, mas tem 3.
    expect(endOfColumnPosition(all, 11, 1)).toBe(3)
  })

  it('ignora a própria tarefa se já estiver na lista da coluna', () => {
    const all = [task(1, 11, 3), task(2, 11, 3)]
    expect(endOfColumnPosition(all, 11, 1)).toBe(1)
  })
})
