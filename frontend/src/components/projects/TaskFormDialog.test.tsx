import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { BoardColumn, Sprint } from '@/types/projects'

const createTaskMock = vi.fn()
const sprints: Sprint[] = [
  {
    id: 7,
    project_id: 1,
    name: 'Sprint 7',
    goal: null,
    starts_at: null,
    ends_at: null,
    status: 'active',
  },
  {
    id: 6,
    project_id: 1,
    name: 'Sprint 6',
    goal: null,
    starts_at: null,
    ends_at: null,
    status: 'completed',
  },
]

vi.mock('@/api/tasks', () => ({
  createTask: (...args: unknown[]) => createTaskMock(...args),
}))
vi.mock('@/api/sprints', () => ({
  listSprints: vi.fn(() => Promise.resolve(sprints)),
}))
vi.mock('@/api/labels', () => ({
  listLabels: vi.fn().mockResolvedValue([
    { id: 3, project_id: 1, name: 'Frontend', color: '#6366f1' },
    { id: 4, project_id: 1, name: 'Urgente', color: '#ef4444' },
  ]),
  createLabel: vi.fn(),
}))
vi.mock('@/api/projects', () => ({
  getProject: vi
    .fn()
    .mockResolvedValue({ id: 1, workspace_id: 5, key: 'LS', name: 'Level', status: 'active' }),
}))
vi.mock('@/api/workspaces', () => ({
  getWorkspace: vi.fn().mockResolvedValue({
    id: 5,
    name: 'WS',
    members: [
      { id: 1, name: 'Ana Admin', role: 'owner' },
      { id: 2, name: 'Bruno Membro', role: 'member' },
    ],
  }),
}))
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Ana Admin', email: 'a@x.pt', roles: ['admin'] } }),
}))

import { TaskFormDialog } from './TaskFormDialog'

const columns: BoardColumn[] = [
  { id: 10, board_id: 1, name: 'Por fazer', position: 0, color: null, is_done_column: false },
  { id: 11, board_id: 1, name: 'Concluído', position: 1, color: null, is_done_column: true },
]

function renderDialog(props: { defaultSprintId?: number | null } = {}) {
  const onOpenChange = vi.fn()
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <TaskFormDialog
          open
          projectId={1}
          columns={columns}
          onOpenChange={onOpenChange}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { onOpenChange }
}

describe('TaskFormDialog: criar tarefa', () => {
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

  it('cria a tarefa com coluna por omissão, prazo, responsáveis e etiquetas escolhidas', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()

    await user.type(screen.getByLabelText('Título'), 'Configurar CI')
    await user.type(screen.getByLabelText('Descrição'), 'Pipeline no GitHub Actions')
    await user.type(screen.getByLabelText('Prazo'), '2026-10-01')
    await user.type(screen.getByLabelText('Estimativa'), '3,5')
    await user.click(await screen.findByRole('checkbox', { name: 'Bruno Membro' }))
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
      sprint_id: null,
      starts_at: null,
      due_at: '2026-10-01',
      estimate: 3.5,
      assignee_ids: [2],
      label_ids: [3],
    })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('pré-preenche o sprint indicado (ex.: secção do Backlog ou Kanban do sprint activo)', async () => {
    const user = userEvent.setup()
    renderDialog({ defaultSprintId: 7 })

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /sprint/i })).toHaveTextContent('Sprint 7'),
    )
    await user.type(screen.getByLabelText('Título'), 'Nova no sprint')
    await user.click(screen.getByRole('button', { name: /criar tarefa/i }))

    await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1))
    expect(createTaskMock.mock.calls[0][0]).toMatchObject({ sprint_id: 7, board_column_id: 10 })
  })

  it('não deixa escolher sprints concluídos', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('combobox', { name: /sprint/i }))
    const options = await screen.findAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual([
      'Backlog do projecto (sem sprint)',
      'Sprint 7',
    ])
  })
})
