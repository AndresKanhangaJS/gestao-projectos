import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

let currentRoles: string[] = ['member']

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Ana', email: 'a@x.pt', roles: currentRoles } }),
}))
vi.mock('@/api/workspaces', () => ({
  listWorkspaces: vi.fn().mockResolvedValue([
    {
      id: 5,
      name: 'Level-Soft',
      slug: 'level-soft',
      description: null,
      my_role: 'viewer',
      members_count: 4,
      can: {
        create_task: false,
        delete_task: false,
        manage_board: false,
        manage_sprints: false,
        manage_members: false,
        create_project: false,
      },
      created_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 6,
      name: 'Equipa Infra',
      slug: 'infra',
      description: null,
      my_role: 'manager',
      can: {
        create_task: true,
        delete_task: true,
        manage_board: true,
        manage_sprints: true,
        manage_members: true,
        create_project: true,
      },
      created_at: '2026-09-01T00:00:00Z',
    },
    {
      id: 7,
      name: 'API antiga',
      slug: 'antiga',
      description: null,
      created_at: '2026-09-01T00:00:00Z',
    },
  ]),
  createWorkspace: vi.fn(),
}))
const listProjectsMock = vi.fn()

vi.mock('@/api/projects', () => ({
  listProjects: (...args: unknown[]) => listProjectsMock(...args),
  createProject: vi.fn(),
  getProjectLinkOptions: vi.fn().mockResolvedValue({
    software_products: [
      {
        id: 1,
        name: 'Level-School',
        modules: [{ id: 11, name: 'Matrículas' }],
        clients: [{ id: 100, name: 'Pitruca', all_modules: false, module_ids: [11] }],
      },
      {
        id: 2,
        name: 'Level-RH',
        modules: [],
        clients: [{ id: 200, name: 'Grupo Pitruca', all_modules: true, module_ids: [] }],
      },
    ],
  }),
}))

import ProjectsListPage from './ProjectsListPage'

function renderPage(path = '/projects') {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <ProjectsListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProjectsListPage', () => {
  beforeEach(() => {
    currentRoles = ['member']
    listProjectsMock.mockReset().mockResolvedValue([])
  })

  it('esconde "Novo workspace" a quem não é administrador/gestor de projecto e explica porquê', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Level-Soft' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Novo workspace' })).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Porque não está disponível: Novo workspace' }),
    ).toBeInTheDocument()
    expect(screen.getByText('O meu papel: Leitor')).toBeInTheDocument()
  })

  it('"Novo projecto" por workspace segue can.create_project (e fica a cargo da API sem `can`)', async () => {
    renderPage()

    const blocked = await screen.findByRole('button', { name: 'Novo projecto em Level-Soft' })
    expect(blocked).toBeDisabled()
    expect(
      screen.getByRole('button', {
        name: 'Porque não está disponível: Novo projecto em Level-Soft',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Novo projecto em Equipa Infra' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Novo projecto em API antiga' })).toBeEnabled()
    // Membros onde can.manage_members, e no workspace sem `can` (a API decide).
    expect(screen.getAllByRole('button', { name: 'Membros' })).toHaveLength(2)
  })

  it('mostra "Novo workspace" a gestores de projecto', async () => {
    currentRoles = ['project_manager']
    renderPage()

    expect(await screen.findByRole('button', { name: 'Novo workspace' })).toBeInTheDocument()
  })

  it('mostra software, cliente e módulos no cartão do projecto', async () => {
    listProjectsMock.mockResolvedValue([
      {
        id: 3,
        workspace_id: 6,
        key: 'PIT',
        name: 'Portal de propinas',
        description: null,
        status: 'active',
        software_product: { id: 1, name: 'Level-School' },
        client: { id: 100, name: 'Pitruca' },
        modules: [{ id: 11, name: 'Matrículas' }],
        created_at: '2026-09-01',
      },
    ])
    renderPage()

    const badges = await screen.findByRole('list', { name: 'Relação com o cliente' })
    expect(badges).toHaveTextContent('Software:Level-School')
    expect(badges).toHaveTextContent('Cliente:Pitruca')
    expect(badges).toHaveTextContent('Módulo:Matrículas')
    // Dentro do cartão (que já é uma ligação) os badges não são ligações.
    expect(within(badges).queryByRole('link')).not.toBeInTheDocument()
  })

  it('filtra por cliente e software a partir dos parâmetros do endereço', async () => {
    const user = userEvent.setup()
    renderPage('/projects?software_product_id=1&client_id=100')

    await waitFor(() =>
      expect(listProjectsMock).toHaveBeenCalledWith({ client_id: 100, software_product_id: 1 }),
    )
    expect(await screen.findByText('Nenhum projecto com estes filtros')).toBeInTheDocument()

    // Mudar para um software que o cliente não tem retira o filtro de cliente.
    await user.click(screen.getByRole('combobox', { name: 'Software' }))
    await user.click(await screen.findByRole('option', { name: 'Level-RH' }))
    await waitFor(() =>
      expect(listProjectsMock).toHaveBeenLastCalledWith({
        client_id: undefined,
        software_product_id: 2,
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    await waitFor(() =>
      expect(listProjectsMock).toHaveBeenLastCalledWith({
        client_id: undefined,
        software_product_id: undefined,
      }),
    )
  })
})
