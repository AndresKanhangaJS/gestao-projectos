import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Board, Project, ProjectPermissions, Task } from '@/types/projects'

const ALL: ProjectPermissions = {
  create_task: true,
  delete_task: true,
  manage_board: true,
  manage_sprints: true,
  manage_members: true,
}
const NONE: ProjectPermissions = {
  create_task: false,
  delete_task: false,
  manage_board: false,
  manage_sprints: false,
  manage_members: false,
}

function makeTask(id: number, title: string, sprintId: number | null): Task {
  return {
    id,
    project_id: 1,
    board_column_id: 10,
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
    assignees: [{ id: 2, name: 'Bruno Membro' }],
    labels: [],
    created_at: '2026-09-20T10:00:00Z',
  }
}

const sprintTask = makeTask(1, 'Tarefa do sprint', 3)
const backlogTask = makeTask(2, 'Tarefa do backlog', null)

let project: Project
const board: Board = {
  id: 1,
  project_id: 1,
  name: 'Principal',
  is_default: true,
  columns: [
    { id: 10, board_id: 1, name: 'Por fazer', position: 0, color: null, is_done_column: false },
    { id: 11, board_id: 1, name: 'Concluído', position: 1, color: null, is_done_column: true },
  ],
}

const listTasksMock = vi.fn((_projectId: number, params?: { sprint?: string }) => {
  if (params?.sprint === 'active') return Promise.resolve([sprintTask])
  if (params?.sprint === 'backlog') return Promise.resolve([backlogTask])
  return Promise.resolve([sprintTask, backlogTask])
})

vi.mock('@/api/projects', () => ({ getProject: vi.fn(() => Promise.resolve(project)) }))
vi.mock('@/api/boards', () => ({
  listProjectBoards: vi.fn(() => Promise.resolve([board])),
  createBoard: vi.fn(),
  createColumn: vi.fn(),
  updateColumn: vi.fn(),
  deleteColumn: vi.fn(),
  reorderColumns: vi.fn(),
}))
vi.mock('@/api/tasks', () => ({
  listTasks: (projectId: number, params?: { sprint?: string }) => listTasksMock(projectId, params),
  getProjectActivity: vi.fn().mockResolvedValue({ data: [], meta: {} }),
  moveTask: vi.fn(),
  createTask: vi.fn(),
  getTask: vi.fn(),
}))
vi.mock('@/api/sprints', () => ({
  listSprints: vi.fn().mockResolvedValue([
    {
      id: 3,
      project_id: 1,
      name: 'Sprint 3',
      goal: null,
      starts_at: null,
      ends_at: null,
      status: 'active',
    },
  ]),
}))
vi.mock('@/api/labels', () => ({ listLabels: vi.fn().mockResolvedValue([]), createLabel: vi.fn() }))
vi.mock('@/api/workspaces', () => ({
  getWorkspace: vi.fn().mockResolvedValue({
    id: 5,
    name: 'WS',
    members: [{ id: 1, name: 'Ana Admin', role: 'owner' }],
  }),
}))
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Ana Admin', email: 'a@x.pt', roles: ['member'] } }),
}))

import KanbanBoardPage from './KanbanBoardPage'

function renderPage(path = '/projects/1') {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/projects/:projectId" element={<KanbanBoardPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function baseProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    workspace_id: 5,
    key: 'LS',
    name: 'Level',
    description: null,
    status: 'active',
    my_role: 'manager',
    can: ALL,
    active_sprint: {
      id: 3,
      name: 'Sprint 3',
      starts_at: '2026-09-21',
      ends_at: '2026-10-04',
      goal: null,
    },
    created_at: '2026-09-01T00:00:00Z',
    ...overrides,
  }
}

describe('KanbanBoardPage: Kanban alinhado com sprints', () => {
  beforeEach(() => {
    listTasksMock.mockClear()
    window.localStorage.clear()
    project = baseProject()
  })

  it('por omissão mostra só as tarefas do sprint activo (?sprint=active)', async () => {
    renderPage()

    expect(
      await screen.findByRole('button', { name: /^Tarefa: Tarefa do sprint/ }),
    ).toBeInTheDocument()
    expect(listTasksMock).toHaveBeenCalledWith(1, { sprint: 'active' })
    expect(
      screen.queryByRole('button', { name: /^Tarefa: Tarefa do backlog/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Mostrar' })).toHaveTextContent(
      'Sprint activo: Sprint 3',
    )
    expect(screen.queryByText(/sem sprint activo/i)).not.toBeInTheDocument()
    // Avatares dos responsáveis no cartão (nome acessível).
    expect(screen.getByRole('button', { name: /^Tarefa: Tarefa do sprint/ })).toHaveAccessibleName(
      expect.stringContaining('Responsáveis: Bruno Membro'),
    )
  })

  it('sem sprint activo mostra todas as tarefas e um aviso a orientar para o Backlog', async () => {
    project = baseProject({ active_sprint: null })
    renderPage()

    expect(
      await screen.findByRole('button', { name: /^Tarefa: Tarefa do backlog/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Tarefa: Tarefa do sprint/ })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Sem sprint activo, por isso estão a ser mostradas todas as tarefas. Planeie um sprint no Backlog.',
      ),
    ).toBeInTheDocument()
    expect(listTasksMock).not.toHaveBeenCalledWith(1, { sprint: 'active' })
  })

  it('respeita ?sprint=backlog', async () => {
    renderPage('/projects/1?sprint=backlog')

    expect(
      await screen.findByRole('button', { name: /^Tarefa: Tarefa do backlog/ }),
    ).toBeInTheDocument()
    expect(listTasksMock).toHaveBeenCalledWith(1, { sprint: 'backlog' })
    expect(
      screen.queryByRole('button', { name: /^Tarefa: Tarefa do sprint/ }),
    ).not.toBeInTheDocument()
  })

  it('"Nova tarefa" com o filtro do sprint activo pré-preenche esse sprint', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('button', { name: /^Tarefa: Tarefa do sprint/ })
    await user.click(screen.getByRole('button', { name: 'Nova tarefa' }))

    const dialog = await screen.findByRole('dialog', { name: 'Nova tarefa' })
    await waitFor(() =>
      expect(within(dialog).getByRole('combobox', { name: /sprint/i })).toHaveTextContent(
        'Sprint 3',
      ),
    )
    expect(within(dialog).getByRole('combobox', { name: /coluna/i })).toHaveTextContent('Por fazer')
  })
})

describe('KanbanBoardPage: acções conforme permissões', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('para quem só pode ler, esconde gestão de quadro/colunas/membros e desactiva "Nova tarefa" com explicação', async () => {
    project = baseProject({ my_role: 'viewer', can: NONE })
    renderPage()

    await screen.findByRole('button', { name: /^Tarefa: Tarefa do sprint/ })
    expect(screen.queryByRole('button', { name: /novo quadro/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /gerir colunas/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^membros$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nova tarefa' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Porque não está disponível: Nova tarefa' }),
    ).toBeInTheDocument()
    // O cartão só abre o detalhe (não arrasta).
    expect(screen.getByRole('button', { name: /^Tarefa: Tarefa do sprint/ })).toHaveAccessibleName(
      expect.stringContaining('Prima Enter para abrir.'),
    )
  })

  it('para gestores mostra as acções de gestão', async () => {
    project = baseProject()
    renderPage()

    await screen.findByRole('button', { name: /^Tarefa: Tarefa do sprint/ })
    expect(screen.getByRole('button', { name: /novo quadro/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gerir colunas/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^membros$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nova tarefa' })).toBeEnabled()
  })
})

describe('KanbanBoardPage: painel "Como funciona"', () => {
  beforeEach(() => {
    window.localStorage.clear()
    project = baseProject()
  })

  it('pode ser fechado e fica lembrado no browser', async () => {
    const user = userEvent.setup()
    renderPage()

    const toggle = await screen.findByRole('button', { name: /como funciona/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Planear um sprint')).toBeVisible()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(window.localStorage.getItem('projects.howItWorks.collapsed')).toBe('1')
  })
})

describe('KanbanBoardPage: relação com o cliente', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('mostra software, cliente e módulos no cabeçalho e permite editar a quem gere o projecto', async () => {
    project = baseProject({
      software_product: { id: 1, name: 'Level-School' },
      client: { id: 100, name: 'Pitruca' },
      modules: [{ id: 11, name: 'Matrículas' }],
    })
    renderPage()

    const badges = await screen.findByRole('list', { name: 'Relação com o cliente' })
    expect(badges).toHaveTextContent('Software:Level-School')
    expect(badges).toHaveTextContent('Cliente:Pitruca')
    expect(badges).toHaveTextContent('Módulo:Matrículas')
    expect(screen.getByRole('button', { name: 'Editar projecto' })).toBeInTheDocument()
  })

  it('projecto interno do produto (sem cliente) e sem botão de editar para leitores', async () => {
    project = baseProject({
      my_role: 'viewer',
      can: NONE,
      software_product: { id: 1, name: 'Level-School' },
      client: null,
      modules: [],
    })
    renderPage()

    const badges = await screen.findByRole('list', { name: 'Relação com o cliente' })
    expect(badges).toHaveTextContent('Projecto interno do produto')
    expect(screen.queryByRole('button', { name: 'Editar projecto' })).not.toBeInTheDocument()
  })
})
