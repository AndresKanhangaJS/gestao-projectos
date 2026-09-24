import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { User } from '@/types/auth'

let currentUser: User = { id: 1, name: 'Membro', email: 'm@level-soft.local', roles: ['member'] }

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: currentUser, isAuthenticated: true, isLoading: false }),
}))

import { Sidebar } from './Sidebar'
import { RequireRole } from './RequireRole'
import { INFRA_VIEW_ROLES } from '@/lib/roles'

function renderInfraRoute() {
  return render(
    <MemoryRouter initialEntries={['/infra/clients']}>
      <Routes>
        <Route path="/infra" element={<RequireRole roles={INFRA_VIEW_ROLES} />}>
          <Route path="clients" element={<p>Lista de clientes</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Controlo de acesso por papel (UX)', () => {
  beforeEach(() => {
    currentUser = { id: 1, name: 'Membro', email: 'm@level-soft.local', roles: ['member'] }
  })

  it('esconde a secção Infra do menu a um member', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /projectos/i })).toBeInTheDocument()
    expect(screen.queryByText(/controlo de software/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /clientes/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /máquinas/i })).not.toBeInTheDocument()
  })

  it('mostra "Sem acesso" a um member que abre uma rota de Infra', () => {
    renderInfraRoute()
    expect(screen.getByRole('heading', { name: /sem acesso/i })).toBeInTheDocument()
    expect(screen.queryByText('Lista de clientes')).not.toBeInTheDocument()
  })

  it.each(['admin', 'infra', 'project_manager'])('mostra a secção Infra ao papel %s', (role) => {
    currentUser = { ...currentUser, roles: [role] }
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /clientes/i })).toBeInTheDocument()
  })

  it('permite a rota de Infra a quem tem papel', () => {
    currentUser = { ...currentUser, roles: ['infra'] }
    renderInfraRoute()
    expect(screen.getByText('Lista de clientes')).toBeInTheDocument()
  })
})
