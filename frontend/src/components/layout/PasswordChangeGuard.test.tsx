import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'

let mustChange = true

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 7,
      name: 'Carla Nova',
      email: 'carla@x.pt',
      roles: ['member'],
      must_change_password: mustChange,
    },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }),
}))
vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}))
vi.mock('./NotificationsMenu', () => ({ NotificationsMenu: () => null }))

import { api } from '@/api/client'
import { AppLayout } from './AppLayout'

function ChangePasswordProbe() {
  const location = useLocation()
  return <p>Página de alteração (vinha de {(location.state as { from?: string } | null)?.from})</p>
}

function renderApp(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<p>Dashboard</p>} />
          <Route path="projects" element={<p>Página de projectos</p>} />
        </Route>
        <Route path="/change-password" element={<ChangePasswordProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Guarda de palavra-passe provisória', () => {
  beforeEach(() => {
    mustChange = true
  })

  it('logo a seguir ao login (ou ao recarregar) leva para /change-password, lembrando a rota pedida', () => {
    renderApp('/projects?x=1')
    expect(screen.getByText('Página de alteração (vinha de /projects?x=1)')).toBeInTheDocument()
    expect(screen.queryByText('Página de projectos')).not.toBeInTheDocument()
  })

  it('sem a obrigação, a aplicação abre normalmente e o menu do utilizador tem "Alterar palavra-passe"', async () => {
    mustChange = false
    const user = userEvent.setup()
    renderApp('/projects')

    expect(screen.getByText('Página de projectos')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Menu do utilizador' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Alterar palavra-passe' }))
    expect(await screen.findByText('Página de alteração (vinha de /projects)')).toBeInTheDocument()
  })
})

describe('Interceptor: 403 password_change_required', () => {
  const assign = vi.fn()
  const originalLocation = window.location

  beforeEach(() => {
    assign.mockReset()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, pathname: '/projects', assign },
    })
  })
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  function rejectWith(status: number, data: unknown) {
    return (config: InternalAxiosRequestConfig) => {
      const headers = new AxiosHeaders()
      return Promise.reject(
        new AxiosError('Erro', 'ERR_BAD_REQUEST', config, null, {
          status,
          statusText: '',
          headers: {},
          config: { ...config, headers },
          data,
        }),
      )
    }
  }

  it('redirecciona para /change-password', async () => {
    await expect(
      api.get('/projects/1', {
        adapter: rejectWith(403, {
          message: 'Tem de alterar a palavra-passe.',
          code: 'password_change_required',
        }),
      }),
    ).rejects.toBeInstanceOf(AxiosError)
    expect(assign).toHaveBeenCalledWith('/change-password')
  })

  it('não entra em ciclo se já estiver na página de alteração, e ignora outros 403', async () => {
    await expect(
      api.get('/x', { adapter: rejectWith(403, { message: 'Sem permissão.' }) }),
    ).rejects.toBeInstanceOf(AxiosError)
    expect(assign).not.toHaveBeenCalled()

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, pathname: '/change-password', assign },
    })
    await expect(
      api.get('/x', { adapter: rejectWith(403, { code: 'password_change_required' }) }),
    ).rejects.toBeInstanceOf(AxiosError)
    expect(assign).not.toHaveBeenCalled()
  })
})
