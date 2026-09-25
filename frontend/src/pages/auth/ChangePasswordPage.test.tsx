import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AxiosError, AxiosHeaders } from 'axios'
import type { User } from '@/types/auth'

let currentUser: User = {
  id: 7,
  name: 'Carla Nova',
  email: 'carla@x.pt',
  roles: ['member'],
  must_change_password: true,
}
const updateUserMock = vi.fn((user: User) => {
  currentUser = user
})
const logoutMock = vi.fn().mockResolvedValue(undefined)
const changePasswordMock = vi.fn()

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: currentUser,
    isLoading: false,
    isAuthenticated: true,
    logout: logoutMock,
    updateUser: updateUserMock,
  }),
}))
vi.mock('@/api/auth', () => ({
  changePassword: (...args: unknown[]) => changePasswordMock(...args),
}))

import ChangePasswordPage from './ChangePasswordPage'

function Destination() {
  const location = useLocation()
  const flash = (location.state as { flash?: string } | null)?.flash
  return (
    <p>
      Destino {location.pathname} {flash}
    </p>
  )
}

function renderPage(state?: { from: string }) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[{ pathname: '/change-password', state }]}>
        <Routes>
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/" element={<Destination />} />
          <Route path="/projects/:id" element={<Destination />} />
          <Route path="/login" element={<p>Ecrã de entrada</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  current: string,
  next: string,
  confirm = next,
) {
  await user.type(screen.getByLabelText('Palavra-passe provisória'), current)
  await user.type(screen.getByLabelText('Nova palavra-passe'), next)
  await user.type(screen.getByLabelText('Confirmar nova palavra-passe'), confirm)
}

describe('ChangePasswordPage (obrigatória)', () => {
  beforeEach(() => {
    currentUser = {
      id: 7,
      name: 'Carla Nova',
      email: 'carla@x.pt',
      roles: ['member'],
      must_change_password: true,
    }
    updateUserMock.mockClear()
    changePasswordMock
      .mockReset()
      .mockResolvedValue({ ...currentUser, must_change_password: false })
  })

  it('explica o motivo, não tem "Cancelar" e permite terminar a sessão', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Defina uma nova palavra-passe' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Por segurança, defina uma nova palavra-passe antes de continuar.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Terminar sessão' }))
    await waitFor(() => expect(logoutMock).toHaveBeenCalled())
    expect(await screen.findByText('Ecrã de entrada')).toBeInTheDocument()
  })

  it('mostra/oculta e valida no cliente (diferente da actual, confirmação igual)', async () => {
    const user = userEvent.setup()
    renderPage()

    const toggle = screen.getByRole('button', { name: 'Mostrar nova palavra-passe' })
    await user.click(toggle)
    expect(screen.getByLabelText('Nova palavra-passe')).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar nova palavra-passe' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await fill(user, 'provisoria1', 'provisoria1', 'outra')
    await user.click(screen.getByRole('button', { name: 'Guardar nova palavra-passe' }))

    expect(
      await screen.findByText('A nova palavra-passe tem de ser diferente da actual.'),
    ).toBeInTheDocument()
    expect(screen.getByText('As palavras-passe não coincidem.')).toBeInTheDocument()
    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it('com sucesso actualiza o utilizador (sem a obrigação) e volta à página pedida', async () => {
    const user = userEvent.setup()
    renderPage({ from: '/projects/3' })

    await fill(user, 'provisoria1', 'nova-segura-2026')
    await user.click(screen.getByRole('button', { name: 'Guardar nova palavra-passe' }))

    await waitFor(() =>
      expect(changePasswordMock).toHaveBeenCalledWith({
        current_password: 'provisoria1',
        password: 'nova-segura-2026',
        password_confirmation: 'nova-segura-2026',
      }),
    )
    expect(updateUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ must_change_password: false }),
    )
    expect(
      await screen.findByText(/Destino \/projects\/3 A sua palavra-passe foi alterada\./),
    ).toBeInTheDocument()
  })

  it('mostra os erros 422 da API junto aos campos', async () => {
    const headers = new AxiosHeaders()
    changePasswordMock.mockRejectedValue(
      new AxiosError('Unprocessable', 'ERR_BAD_REQUEST', { headers }, null, {
        status: 422,
        statusText: 'Unprocessable Content',
        headers: {},
        config: { headers },
        data: {
          message: 'A palavra-passe actual está incorrecta.',
          errors: { current_password: ['A palavra-passe actual está incorrecta.'] },
        },
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await fill(user, 'errada', 'nova-segura-2026')
    await user.click(screen.getByRole('button', { name: 'Guardar nova palavra-passe' }))

    const error = await screen.findByText('A palavra-passe actual está incorrecta.')
    expect(error).toHaveAttribute('id', 'current-password-error')
    expect(screen.getByLabelText('Palavra-passe provisória')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })
})

describe('ChangePasswordPage (opcional, pelo menu do utilizador)', () => {
  it('permite cancelar e voltar', async () => {
    currentUser = {
      id: 7,
      name: 'Carla Nova',
      email: 'carla@x.pt',
      roles: ['member'],
      must_change_password: false,
    }
    const user = userEvent.setup()
    renderPage({ from: '/projects/3' })

    expect(screen.getByRole('heading', { name: 'Alterar palavra-passe' })).toBeInTheDocument()
    expect(screen.getByLabelText('Palavra-passe actual')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(await screen.findByText(/Destino \/projects\/3/)).toBeInTheDocument()
  })
})
