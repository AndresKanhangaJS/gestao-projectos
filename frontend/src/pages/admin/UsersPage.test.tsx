import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AxiosError, AxiosHeaders } from 'axios'
import type { AdminUser } from '@/types/admin'

let currentRoles: string[] = ['admin']
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Ana Admin', email: 'ana@x.pt', roles: currentRoles } }),
}))

const createMock = vi.fn()
const deactivateMock = vi.fn()
const listMock = vi.fn()

const users: AdminUser[] = [
  {
    id: 1,
    name: 'Ana Admin',
    email: 'ana@x.pt',
    roles: ['admin'],
    is_active: true,
    last_login_at: '2026-09-24T09:00:00Z',
    created_at: '2026-09-01T00:00:00Z',
    workspaces_count: 2,
  },
  {
    id: 2,
    name: 'Bruno Infra',
    email: 'bruno@x.pt',
    roles: ['infra', 'member'],
    is_active: true,
    last_login_at: null,
    created_at: '2026-09-01T00:00:00Z',
    workspaces_count: 1,
  },
]

vi.mock('@/api/adminUsers', () => ({
  listAdminUsers: (...args: unknown[]) => listMock(...args),
  listRoles: vi.fn().mockResolvedValue([
    {
      name: 'admin',
      label_pt: 'Administrador',
      description_pt: 'Acesso total, incluindo utilizadores.',
    },
    {
      name: 'project_manager',
      label_pt: 'Gestor de projectos',
      description_pt: 'Cria workspaces e projectos.',
    },
    { name: 'infra', label_pt: 'Infra-estrutura', description_pt: 'Gere o Controlo de Software.' },
    { name: 'member', label_pt: 'Membro', description_pt: 'Trabalha nos projectos onde é membro.' },
  ]),
  createAdminUser: (...args: unknown[]) => createMock(...args),
  updateAdminUser: vi.fn(),
  resetAdminUserPassword: vi.fn(),
  deactivateAdminUser: (...args: unknown[]) => deactivateMock(...args),
  activateAdminUser: vi.fn(),
}))

import { RequireRole } from '@/components/layout/RequireRole'
import { ADMIN_ROLES } from '@/lib/roles'
import UsersPage from './UsersPage'

function renderPage() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route path="/admin" element={<RequireRole roles={ADMIN_ROLES} />}>
            <Route path="users" element={<UsersPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function unprocessable(errors: Record<string, string[]>) {
  const headers = new AxiosHeaders()
  return new AxiosError('Unprocessable', 'ERR_BAD_REQUEST', { headers }, null, {
    status: 422,
    statusText: 'Unprocessable Content',
    headers: {},
    config: { headers },
    data: { message: Object.values(errors)[0][0], errors },
  })
}

describe('Gestão de utilizadores', () => {
  beforeEach(() => {
    currentRoles = ['admin']
    listMock.mockReset().mockResolvedValue({
      data: users,
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 2, from: 1, to: 2 },
    })
    createMock.mockReset().mockResolvedValue(users[1])
    deactivateMock.mockReset().mockResolvedValue({ ...users[1], is_active: false })
  })

  it('só administradores entram na página', () => {
    currentRoles = ['project_manager']
    renderPage()
    expect(screen.getByRole('heading', { name: /sem acesso/i })).toBeInTheDocument()
    expect(listMock).not.toHaveBeenCalled()
  })

  it('lista utilizadores com papéis, último acesso, e esconde ao próprio admin a acção de se desactivar', async () => {
    renderPage()

    const table = await screen.findByRole('table', { name: 'Utilizadores' })
    const rows = within(table).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Ana Admin (eu)')
    expect(rows[1]).toHaveTextContent('Administrador')
    expect(rows[2]).toHaveTextContent('Nunca entrou')
    expect(
      within(rows[2]).getByLabelText('Infra-estrutura: Gere o Controlo de Software.'),
    ).toBeInTheDocument()
    expect(
      within(rows[1]).queryByRole('button', { name: 'Desactivar Ana Admin' }),
    ).not.toBeInTheDocument()
    expect(
      within(rows[2]).getByRole('button', { name: 'Desactivar Bruno Infra' }),
    ).toBeInTheDocument()
  })

  it('cria um utilizador com os papéis escolhidos', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('table', { name: 'Utilizadores' })
    await user.click(screen.getByRole('button', { name: 'Novo utilizador' }))
    const dialog = await screen.findByRole('dialog', { name: 'Novo utilizador' })
    await user.type(within(dialog).getByLabelText('Nome'), 'Carla Nova')
    await user.type(within(dialog).getByLabelText('Email'), 'carla@x.pt')
    await user.type(within(dialog).getByLabelText('Palavra-passe'), 'segredo123')
    await user.type(within(dialog).getByLabelText('Confirmar palavra-passe'), 'segredo123')
    // "Membro" vem marcado por omissão; junta-se "Infra-estrutura".
    expect(within(dialog).getByRole('checkbox', { name: 'Membro' })).toBeChecked()
    await user.click(within(dialog).getByRole('checkbox', { name: 'Infra-estrutura' }))
    await user.click(within(dialog).getByRole('button', { name: 'Criar utilizador' }))

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1))
    expect(createMock).toHaveBeenCalledWith({
      name: 'Carla Nova',
      email: 'carla@x.pt',
      password: 'segredo123',
      password_confirmation: 'segredo123',
      roles: ['member', 'infra'],
    })
  })

  it('valida palavras-passe diferentes e papéis vazios sem chamar a API', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('table', { name: 'Utilizadores' })
    await user.click(screen.getByRole('button', { name: 'Novo utilizador' }))
    const dialog = await screen.findByRole('dialog', { name: 'Novo utilizador' })
    await user.type(within(dialog).getByLabelText('Nome'), 'X')
    await user.type(within(dialog).getByLabelText('Email'), 'x@x.pt')
    await user.type(within(dialog).getByLabelText('Palavra-passe'), 'segredo123')
    await user.type(within(dialog).getByLabelText('Confirmar palavra-passe'), 'outra-coisa')
    await user.click(within(dialog).getByRole('checkbox', { name: 'Membro' }))
    await user.click(within(dialog).getByRole('button', { name: 'Criar utilizador' }))

    expect(await within(dialog).findByText('As palavras-passe não coincidem.')).toBeInTheDocument()
    expect(within(dialog).getByText('Escolha pelo menos um papel.')).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('ao editar-se a si próprio, não pode retirar o papel de administrador', async () => {
    const user = userEvent.setup()
    renderPage()

    const table = await screen.findByRole('table', { name: 'Utilizadores' })
    await user.click(within(table).getByRole('button', { name: 'Editar Ana Admin' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar utilizador' })
    const adminBox = within(dialog).getByRole('checkbox', { name: 'Administrador' })
    expect(adminBox).toBeChecked()
    expect(adminBox).toBeDisabled()
    expect(
      within(dialog).getByText(/não pode retirar a si próprio o papel de administrador/i),
    ).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Palavra-passe')).not.toBeInTheDocument()
  })

  it('desactiva outro utilizador depois de confirmar e mostra as salvaguardas da API', async () => {
    const user = userEvent.setup()
    renderPage()

    const table = await screen.findByRole('table', { name: 'Utilizadores' })
    await user.click(within(table).getByRole('button', { name: 'Desactivar Bruno Infra' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Desactivar Bruno Infra?' })
    expect(deactivateMock).not.toHaveBeenCalled()

    deactivateMock.mockRejectedValueOnce(
      unprocessable({ user: ['Tem de existir sempre pelo menos um administrador activo.'] }),
    )
    await user.click(within(confirm).getByRole('button', { name: 'Desactivar' }))
    expect(
      await within(confirm).findByText('Tem de existir sempre pelo menos um administrador activo.'),
    ).toBeInTheDocument()

    await user.click(within(confirm).getByRole('button', { name: 'Desactivar' }))
    await waitFor(() => expect(deactivateMock).toHaveBeenCalledTimes(2))
    expect(deactivateMock).toHaveBeenLastCalledWith(2)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })
})
