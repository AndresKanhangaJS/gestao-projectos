import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError, AxiosHeaders } from 'axios'
import type { BoardColumn, ProjectPermissions, Sprint, Task } from '@/types/projects'

const createTaskMock = vi.fn()
const updateTaskMock = vi.fn()
const updateSprintMock = vi.fn()
const completeSprintMock = vi.fn()

const sprints: Sprint[] = [
  {
    id: 1,
    project_id: 1,
    name: 'Sprint 1',
    goal: null,
    starts_at: '2026-09-14',
    ends_at: '2026-09-27',
    status: 'active',
  },
  {
    id: 2,
    project_id: 1,
    name: 'Sprint 2',
    goal: null,
    starts_at: '2026-09-28',
    ends_at: '2026-10-11',
    status: 'planned',
  },
  {
    id: 9,
    project_id: 1,
    name: 'Sprint 9',
    goal: null,
    starts_at: '2026-08-31',
    ends_at: '2026-09-13',
    status: 'completed',
  },
]

vi.mock('@/api/sprints', () => ({
  listSprints: vi.fn(() => Promise.resolve(sprints)),
  updateSprint: (...args: unknown[]) => updateSprintMock(...args),
  completeSprint: (...args: unknown[]) => completeSprintMock(...args),
  deleteSprint: vi.fn(),
  createSprint: vi.fn(),
}))
vi.mock('@/api/tasks', () => ({
  createTask: (...args: unknown[]) => createTaskMock(...args),
  updateTask: (...args: unknown[]) => updateTaskMock(...args),
}))
vi.mock('@/api/labels', () => ({ listLabels: vi.fn().mockResolvedValue([]), createLabel: vi.fn() }))
vi.mock('@/api/projects', () => ({
  getProject: vi
    .fn()
    .mockResolvedValue({ id: 1, workspace_id: 5, key: 'LS', name: 'Level', status: 'active' }),
}))
vi.mock('@/api/workspaces', () => ({
  getWorkspace: vi.fn().mockResolvedValue({
    id: 5,
    name: 'WS',
    members: [{ id: 1, name: 'Ana Admin', role: 'owner' }],
  }),
}))
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Ana Admin', email: 'a@x.pt', roles: ['admin'] } }),
}))

import { BacklogView } from './BacklogView'

const ALL: ProjectPermissions = {
  create_task: true,
  delete_task: true,
  manage_board: true,
  manage_sprints: true,
  manage_members: true,
}

const columns: BoardColumn[] = [
  { id: 10, board_id: 1, name: 'Por fazer', position: 0, color: null, is_done_column: false },
  { id: 11, board_id: 1, name: 'Concluído', position: 1, color: null, is_done_column: true },
]

function makeTask(id: number, title: string, sprintId: number | null, columnId: number): Task {
  return {
    id,
    project_id: 1,
    board_column_id: columnId,
    sprint_id: sprintId,
    parent_id: null,
    type: 'task',
    priority: 'medium',
    title,
    description: null,
    estimate: null,
    starts_at: null,
    due_at: null,
    position: id,
    created_at: '2026-09-20T10:00:00Z',
  }
}

const tasks: Task[] = [
  makeTask(101, 'Feita no sprint', 1, 11),
  makeTask(102, 'Pendente no sprint', 1, 10),
  makeTask(103, 'No backlog', null, 10),
]

function renderBacklog(can: ProjectPermissions = ALL) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <BacklogView
          projectId={1}
          columns={columns}
          boardColumns={columns}
          tasks={tasks}
          can={can}
          onOpenTask={() => {}}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('BacklogView', () => {
  beforeEach(() => {
    createTaskMock.mockReset().mockResolvedValue({ id: 200 })
    updateTaskMock.mockReset().mockResolvedValue({})
    updateSprintMock.mockReset().mockResolvedValue({})
    completeSprintMock.mockReset().mockResolvedValue({ sprint: sprints[0], movedCount: 1 })
  })

  it('"Nova tarefa" numa secção de sprint pré-preenche o sprint e a primeira coluna', async () => {
    const user = userEvent.setup()
    renderBacklog()

    await user.click(await screen.findByRole('button', { name: 'Nova tarefa em Sprint 2' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nova tarefa' })
    await waitFor(() =>
      expect(within(dialog).getByRole('combobox', { name: /sprint/i })).toHaveTextContent(
        'Sprint 2',
      ),
    )

    await user.type(within(dialog).getByLabelText('Título'), 'Preparar demo')
    await user.click(within(dialog).getByRole('button', { name: /criar tarefa/i }))

    await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1))
    expect(createTaskMock.mock.calls[0][0]).toMatchObject({
      project_id: 1,
      title: 'Preparar demo',
      sprint_id: 2,
      board_column_id: 10,
    })
  })

  it('"Nova tarefa" no backlog do projecto cria sem sprint', async () => {
    const user = userEvent.setup()
    renderBacklog()

    await user.click(
      await screen.findByRole('button', { name: 'Nova tarefa em Backlog do projecto' }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Nova tarefa' })
    expect(within(dialog).getByRole('combobox', { name: /sprint/i })).toHaveTextContent(
      'Backlog do projecto (sem sprint)',
    )

    await user.type(within(dialog).getByLabelText('Título'), 'Ideia')
    await user.click(within(dialog).getByRole('button', { name: /criar tarefa/i }))

    await waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1))
    expect(createTaskMock.mock.calls[0][0]).toMatchObject({ sprint_id: null })
  })

  it('"Concluir sprint" pede à API (uma chamada) que passe as pendentes para o próximo sprint planeado', async () => {
    const user = userEvent.setup()
    renderBacklog()

    await user.click(await screen.findByRole('button', { name: 'Concluir sprint' }))
    const dialog = await screen.findByRole('dialog', { name: /concluir “sprint 1”/i })
    expect(within(dialog).getByText(/1 tarefa\(s\) ainda não estão concluídas/)).toBeInTheDocument()
    expect(within(dialog).getByText('Pendente no sprint')).toBeInTheDocument()
    expect(within(dialog).queryByText('Feita no sprint')).not.toBeInTheDocument()

    await user.click(within(dialog).getByLabelText(/próximo sprint planeado: “Sprint 2”/))
    await user.click(within(dialog).getByRole('button', { name: 'Concluir sprint' }))

    await waitFor(() => expect(completeSprintMock).toHaveBeenCalledTimes(1))
    expect(completeSprintMock).toHaveBeenCalledWith(1, {
      move_unfinished_to: 'sprint',
      target_sprint_id: 2,
    })
    // A lógica de mover tarefas é do backend: nada de PATCH por tarefa nem de status=completed.
    expect(updateTaskMock).not.toHaveBeenCalled()
    expect(updateSprintMock).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('"Concluir sprint" devolve as pendentes ao backlog por omissão', async () => {
    const user = userEvent.setup()
    renderBacklog()

    await user.click(await screen.findByRole('button', { name: 'Concluir sprint' }))
    const dialog = await screen.findByRole('dialog', { name: /concluir “sprint 1”/i })
    await user.click(within(dialog).getByRole('button', { name: 'Concluir sprint' }))

    await waitFor(() => expect(completeSprintMock).toHaveBeenCalledTimes(1))
    expect(completeSprintMock).toHaveBeenCalledWith(1, { move_unfinished_to: 'backlog' })
    expect(updateTaskMock).not.toHaveBeenCalled()
  })

  it('não propõe sprints concluídos como destino de uma tarefa', async () => {
    const user = userEvent.setup()
    renderBacklog()

    await user.click(await screen.findByRole('combobox', { name: 'Sprint da tarefa "No backlog"' }))
    const options = await screen.findAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual([
      'Backlog do projecto (sem sprint)',
      'Sprint 1',
      'Sprint 2',
    ])
  })

  it('"Iniciar sprint" mostra o erro 422 da API quando já existe um sprint activo', async () => {
    const headers = new AxiosHeaders()
    updateSprintMock.mockRejectedValue(
      new AxiosError('Unprocessable', 'ERR_BAD_REQUEST', { headers }, null, {
        status: 422,
        statusText: 'Unprocessable Content',
        headers: {},
        config: { headers },
        data: {
          message: 'Já existe um sprint activo.',
          errors: {
            status: [
              'Já existe um sprint activo neste projecto. Conclua-o antes de iniciar outro.',
            ],
          },
        },
      }),
    )
    const user = userEvent.setup()
    renderBacklog()

    await user.click(await screen.findByRole('button', { name: 'Iniciar sprint' }))

    expect(
      await screen.findByText(
        'Já existe um sprint activo neste projecto. Conclua-o antes de iniciar outro.',
      ),
    ).toBeInTheDocument()
  })

  it('sem permissões esconde a gestão de sprints e a criação de tarefas', async () => {
    renderBacklog({ ...ALL, create_task: false, manage_sprints: false, delete_task: false })

    await screen.findByRole('heading', { name: 'Sprint 1' })
    expect(screen.queryByRole('button', { name: /concluir sprint/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /iniciar sprint/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^nova tarefa em/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo sprint' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Porque não está disponível: Novo sprint' }),
    ).toBeInTheDocument()
  })
})
