import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const syncMembersMock = vi.fn()
const searchUsersMock = vi.fn()

vi.mock('@/api/workspaces', () => ({
  getWorkspace: vi.fn().mockResolvedValue({
    id: 5,
    name: 'Level-Soft',
    slug: 'level-soft',
    description: null,
    owner: { id: 1, name: 'Ana Dona', email: 'ana@x.pt' },
    members: [
      { id: 1, name: 'Ana Dona', email: 'ana@x.pt', role: 'owner' },
      { id: 2, name: 'Bruno Membro', email: 'bruno@x.pt', role: 'member' },
      { id: 3, name: 'Carla Leitora', email: 'carla@x.pt', role: 'viewer' },
    ],
    created_at: '2026-09-01T00:00:00Z',
  }),
  syncWorkspaceMembers: (...args: unknown[]) => syncMembersMock(...args),
}))
vi.mock('@/api/users', () => ({
  searchUsers: (...args: unknown[]) => searchUsersMock(...args),
}))

let currentRoles: string[] = ['project_manager']
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 9, name: 'Gestor', email: 'g@x.pt', roles: currentRoles } }),
}))

import { WorkspaceMembersDialog } from './WorkspaceMembersDialog'

function renderDialog() {
  const onOpenChange = vi.fn()
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <WorkspaceMembersDialog workspaceId={5} open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  )
  return { onOpenChange }
}

describe('WorkspaceMembersDialog', () => {
  beforeEach(() => {
    currentRoles = ['project_manager']
    syncMembersMock.mockReset().mockResolvedValue({ id: 5 })
    searchUsersMock.mockReset().mockResolvedValue([
      { id: 2, name: 'Bruno Membro', email: 'bruno@x.pt' },
      { id: 4, name: 'Diana Nova', email: 'diana@x.pt' },
    ])
  })

  it('muda papéis, remove, adiciona por pesquisa e grava a lista completa', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderDialog()

    const list = await screen.findByRole('list', { name: 'Membros do workspace' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    // O dono não pode ser removido nem mudar de papel.
    expect(screen.getByRole('combobox', { name: 'Papel de Ana Dona' })).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'Remover Ana Dona do workspace' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remover Bruno Membro do workspace' }))

    await user.click(screen.getByRole('combobox', { name: 'Papel de Carla Leitora' }))
    // Quem não é dono nem administrador não pode atribuir o papel de dono.
    expect(screen.queryByRole('option', { name: 'Dono' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('option', { name: 'Gestor' }))
    expect(screen.getByRole('combobox', { name: 'Papel de Carla Leitora' })).toHaveTextContent(
      'Gestor',
    )

    await user.type(screen.getByLabelText('Adicionar pessoa'), 'Dia')
    await waitFor(() => expect(searchUsersMock).toHaveBeenCalledWith('Dia'))
    const results = await screen.findByRole('list', { name: 'Resultados da pesquisa' })
    // Quem já foi removido pode voltar a ser adicionado; quem já é membro não aparece.
    expect(within(results).queryByText(/Ana Dona/)).not.toBeInTheDocument()
    await user.click(within(results).getByRole('button', { name: 'Adicionar Diana Nova' }))

    await user.click(screen.getByRole('button', { name: 'Guardar membros' }))

    await waitFor(() => expect(syncMembersMock).toHaveBeenCalledTimes(1))
    expect(syncMembersMock).toHaveBeenCalledWith(5, [
      { user_id: 1, role: 'owner' },
      { user_id: 3, role: 'manager' },
      { user_id: 4, role: 'member' },
    ])
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('explica os papéis', async () => {
    renderDialog()
    await screen.findByRole('list', { name: 'Membros do workspace' })
    expect(screen.getByRole('button', { name: 'Ajuda: Papéis no workspace' })).toBeInTheDocument()
    expect(screen.getByText('O que pode fazer cada papel?')).toBeInTheDocument()
  })

  it('um administrador pode atribuir o papel de dono', async () => {
    currentRoles = ['admin']
    const user = userEvent.setup()
    renderDialog()

    await user.click(await screen.findByRole('combobox', { name: 'Papel de Bruno Membro' }))
    expect(await screen.findByRole('option', { name: 'Dono' })).toBeInTheDocument()
    expect(
      screen.queryByText(/só o dono do workspace ou um administrador pode atribuir/i),
    ).not.toBeInTheDocument()
  })
})
