import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

let roles: string[] = ['admin']

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Ana Admin', email: 'ana@level-soft.local', roles },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }),
}))
vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}))
vi.mock('./NotificationsMenu', () => ({ NotificationsMenu: () => null }))

import { AppLayout, SIDEBAR_STORAGE_KEY } from './AppLayout'

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/projects']}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route path="projects" element={<p>Página de projectos</p>} />
          <Route path="infra/clients" element={<p>Página de clientes</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

/** O menu lateral de desktop (a gaveta mobile é um diálogo à parte). */
function desktopNav() {
  return screen.getByRole('complementary')
}

describe('Menu lateral colapsável', () => {
  beforeEach(() => {
    roles = ['admin']
    window.localStorage.clear()
  })

  it('colapsa e expande, lembra o estado e mostra o nome em dica no modo colapsado', async () => {
    const user = userEvent.setup()
    renderLayout()

    const toggle = within(desktopNav()).getByRole('button', { name: 'Ocultar menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('title', 'Ocultar menu (Ctrl+B)')
    expect(within(desktopNav()).getByText('Controlo de Software')).toBeVisible()

    await user.click(toggle)

    const expand = within(desktopNav()).getByRole('button', { name: 'Expandir menu' })
    expect(expand).toHaveAttribute('aria-expanded', 'false')
    expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('1')
    // Só ícones: o nome continua acessível e aparece numa dica ao passar o rato ou dar foco.
    const link = within(desktopNav()).getByRole('link', { name: 'Clientes' })
    expect(link).not.toHaveTextContent('Clientes')
    await user.hover(link)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Clientes')
    await user.unhover(link)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    fireEvent.focus(within(desktopNav()).getByRole('link', { name: 'Utilizadores' }))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Utilizadores')

    await user.click(expand)
    expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe('0')
  })

  it('começa colapsado se foi assim que ficou, e Ctrl+B alterna', () => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, '1')
    renderLayout()
    expect(within(desktopNav()).getByRole('button', { name: 'Expandir menu' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(within(desktopNav()).getByRole('button', { name: 'Ocultar menu' })).toBeInTheDocument()
  })

  it('só mostra "Utilizadores" (Administração) a administradores', () => {
    roles = ['project_manager']
    renderLayout()
    expect(
      within(desktopNav()).queryByRole('link', { name: 'Utilizadores' }),
    ).not.toBeInTheDocument()
    expect(within(desktopNav()).queryByText('Administração')).not.toBeInTheDocument()
  })
})

describe('Menu em gaveta (mobile)', () => {
  beforeEach(() => {
    roles = ['admin']
    window.localStorage.clear()
  })

  it('abre pelo botão do topo, fecha com Escape e ao escolher uma opção', async () => {
    const user = userEvent.setup()
    renderLayout()

    const open = screen.getByRole('button', { name: 'Abrir menu' })
    await user.click(open)
    const drawer = screen.getByRole('dialog', { name: 'Level-Soft' })
    expect(within(drawer).getByRole('link', { name: 'Utilizadores' })).toBeInTheDocument()
    expect(open).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Clientes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Página de clientes')).toBeInTheDocument()
  })
})
