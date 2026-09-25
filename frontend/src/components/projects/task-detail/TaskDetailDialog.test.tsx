import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { Task } from '@/types/projects'

const task: Task = {
  id: 42,
  project_id: 1,
  board_column_id: 10,
  sprint_id: null,
  parent_id: null,
  type: 'bug',
  priority: 'high',
  title: 'Corrigir login',
  description: 'O login falha com 419.',
  estimate: null,
  starts_at: null,
  due_at: null,
  position: 0,
  created_at: '2026-09-20T10:00:00Z',
  reporter: { id: 1, name: 'Ana Admin' },
  column: { id: 10, name: 'Em curso', is_done_column: false },
  assignees: [],
  watchers: [],
  labels: [],
  subtasks: [
    {
      id: 43,
      title: 'Reproduzir o erro',
      type: 'task',
      priority: 'medium',
      board_column_id: 11,
      column: { id: 11, name: 'Concluído', is_done_column: true },
      completed: true,
      position: 0,
    },
  ],
  comments: [
    {
      id: 2,
      task_id: 42,
      body: 'Já consegui reproduzir.',
      user: { id: 2, name: 'Bruno Infra', email: 'b@x.pt' },
      created_at: '2026-09-21T09:00:00Z',
    },
    {
      id: 1,
      task_id: 42,
      body: 'Alguém consegue ver isto?',
      user: { id: 1, name: 'Ana Admin', email: 'a@x.pt' },
      created_at: '2026-09-20T11:00:00Z',
    },
  ],
}

const syncAssigneesMock = vi.fn()

vi.mock('@/api/tasks', () => ({
  getTask: vi.fn(() => Promise.resolve(task)),
  getTaskActivity: vi.fn().mockResolvedValue({ data: [], meta: {} }),
  listRelations: vi.fn().mockResolvedValue([]),
  listTasks: vi.fn().mockResolvedValue([]),
  listAttachments: vi.fn().mockResolvedValue([]),
  addComment: vi.fn(),
  createSubtask: vi.fn(),
  deleteTask: vi.fn(),
  updateTask: vi.fn(),
  syncAssignees: (...args: unknown[]) => syncAssigneesMock(...args),
  toggleWatch: vi.fn(),
  createRelation: vi.fn(),
  deleteRelation: vi.fn(),
  uploadAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  downloadAttachment: vi.fn(),
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
      { id: 2, name: 'Bruno Infra', role: 'member' },
      { id: 3, name: 'Vera Leitora', role: 'viewer' },
    ],
  }),
}))
vi.mock('@/api/boards', () => ({ listProjectBoards: vi.fn().mockResolvedValue([]) }))
vi.mock('@/api/sprints', () => ({ listSprints: vi.fn().mockResolvedValue([]) }))
vi.mock('@/api/labels', () => ({ listLabels: vi.fn().mockResolvedValue([]), createLabel: vi.fn() }))
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Ana Admin', email: 'a@x.pt', roles: ['admin'] } }),
}))

import { TaskDetailDialog } from './TaskDetailDialog'

describe('TaskDetailDialog', () => {
  it('mostra os comentários devolvidos no detalhe da tarefa, por ordem cronológica e com autor', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <TaskDetailDialog taskId={42} onClose={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const heading = await screen.findByRole('heading', { name: /comentários \(2\)/i })
    const section = heading.closest('section') as HTMLElement
    const items = within(section).getAllByRole('listitem')

    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Ana Admin')
    expect(items[0]).toHaveTextContent('Alguém consegue ver isto?')
    expect(items[1]).toHaveTextContent('Bruno Infra')
    expect(items[1]).toHaveTextContent('Já consegui reproduzir.')
    expect(screen.queryByText(/ainda sem comentários/i)).not.toBeInTheDocument()
  })

  it('lista as subtarefas com o seu estado', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <TaskDetailDialog taskId={42} onClose={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('button', { name: 'Reproduzir o erro' })).toBeInTheDocument()
    expect(screen.getByText(/1\/1 concluídas/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^seguir/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('só propõe como responsáveis membros que não sejam leitores e aplica a lista devolvida pela API', async () => {
    // A API devolve a lista de responsáveis; o detalhe refrescado passa a incluí-los.
    syncAssigneesMock.mockImplementation(async () => {
      task.assignees = [{ id: 2, name: 'Bruno Infra', email: 'b@x.pt' }]
      return task.assignees
    })
    const user = userEvent.setup()
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <TaskDetailDialog taskId={42} onClose={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const bruno = await screen.findByRole('checkbox', { name: 'Bruno Infra' })
    expect(screen.queryByRole('checkbox', { name: 'Vera Leitora' })).not.toBeInTheDocument()

    await user.click(bruno)

    expect(syncAssigneesMock).toHaveBeenCalledWith(42, [2])
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Bruno Infra' })).toBeChecked())
  })
})
