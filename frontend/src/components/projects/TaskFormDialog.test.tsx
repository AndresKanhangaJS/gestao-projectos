import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { BoardColumn } from '@/types/projects'

const createTaskMock = vi.fn()

vi.mock('@/api/tasks', () => ({
  createTask: (...args: unknown[]) => createTaskMock(...args),
}))
vi.mock('@/api/sprints', () => ({
  listSprints: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/api/labels', () => ({
  listLabels: vi.fn().mockResolvedValue([
    { id: 3, project_id: 1, name: 'Frontend', color: '#6366f1' },
    { id: 4, project_id: 1, name: 'Urgente', color: '#ef4444' },
  ]),
  createLabel: vi.fn(),
}))

import { TaskFormDialog } from './TaskFormDialog'

const columns: BoardColumn[] = [
  { id: 10, board_id: 1, name: 'Por fazer', position: 0, color: null, is_done_column: false },
  { id: 11, board_id: 1, name: 'Concluído', position: 1, color: null, is_done_column: true },
]

function renderDialog() {
  const onOpenChange = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TaskFormDialog open projectId={1} columns={columns} onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  )
  return { onOpenChange }
}

describe('TaskFormDialog — criar tarefa', () => {
  beforeEach(() => {
    createTaskMock.mockReset().mockResolvedValue({ id: 99 })
  })

  it('valida o título com Zod e não chama a API', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: /criar tarefa/i }))

    const error = await screen.findByText('O título é obrigatório.')
    expect(error).toHaveAttribute('id', 'task-title-error')
    expect(screen.getByLabelText('Título')).toHaveAttribute('aria-invalid', 'true')
    expect(createTaskMock).not.toHaveBeenCalled()
  })

  it('rejeita títulos só com espaços', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText('Título'), '   ')
    await user.click(screen.getByRole('button', { name: /criar tarefa/i }))

    expect(await screen.findByText('O título é obrigatório.')).toBeInTheDocument()
    expect(createTaskMock).not.toHaveBeenCalled()
  })

  it('cria a tarefa com coluna por omissão, prazo e etiquetas escolhidas', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()

    await user.type(screen.getByLabelText('Título'), 'Configurar CI')
    await user.type(screen.getByLabelText('Descrição'), 'Pipeline no GitHub Actions')
    await user.type(screen.getByLabelText('Prazo'), '2026-10-01')
    await user.click(await screen.findByRole('button', { name: 'Frontend' }))
    expect(screen.getByRole('button', { name: 'Frontend' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: /criar tarefa/i }))

    await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1))
    expect(createTaskMock).toHaveBeenCalledWith({
      project_id: 1,
      title: 'Configurar CI',
      description: 'Pipeline no GitHub Actions',
      type: 'task',
      priority: 'medium',
      board_column_id: 10,
      due_at: '2026-10-01',
      sprint_id: null,
      label_ids: [3],
    })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})
