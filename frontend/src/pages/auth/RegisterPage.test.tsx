import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}))

const getAuthOptionsMock = vi.fn()
const registerMock = vi.fn()

vi.mock('@/api/auth', () => ({
  getAuthOptions: () => getAuthOptionsMock(),
  register: (payload: unknown) => registerMock(payload),
}))

import RegisterPage from './RegisterPage'

function renderRegisterPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillForm() {
  await userEvent.type(screen.getByLabelText(/^nome$/i), 'Nova Pessoa')
  await userEvent.type(screen.getByLabelText(/^email$/i), 'nova@level-soft.local')
  await userEvent.type(screen.getByLabelText(/^palavra-passe$/i), 'segredo-123')
  await userEvent.type(screen.getByLabelText(/confirmar palavra-passe/i), 'segredo-123')
}

describe('RegisterPage', () => {
  beforeEach(() => {
    getAuthOptionsMock.mockReset()
    registerMock.mockReset()
  })

  it('explica que as contas são criadas pelo administrador quando o registo está desactivado', async () => {
    getAuthOptionsMock.mockResolvedValue({ registration_enabled: false })
    renderRegisterPage()

    expect(await screen.findByText(/registo indisponível/i)).toBeInTheDocument()
    expect(screen.getByText(/as contas são criadas por um administrador/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ir para o início de sessão/i })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(screen.queryByRole('button', { name: /criar conta/i })).not.toBeInTheDocument()
  })

  it('mostra o formulário e regista quando o registo está activo', async () => {
    getAuthOptionsMock.mockResolvedValue({ registration_enabled: true })
    registerMock.mockResolvedValue({ id: 1, name: 'Nova Pessoa', email: 'nova@level-soft.local' })
    renderRegisterPage()

    await screen.findByRole('button', { name: /criar conta/i })
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }))

    await waitFor(() =>
      expect(registerMock).toHaveBeenCalledWith({
        name: 'Nova Pessoa',
        email: 'nova@level-soft.local',
        password: 'segredo-123',
        password_confirmation: 'segredo-123',
      }),
    )
  })

  it('mostra a mensagem da API se o registo for recusado com 403', async () => {
    getAuthOptionsMock.mockResolvedValue({ registration_enabled: true })
    const headers = new AxiosHeaders()
    registerMock.mockRejectedValue(
      new AxiosError('Forbidden', 'ERR_BAD_REQUEST', { headers }, null, {
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: { headers },
        data: {
          message:
            'O registo público está desactivado. Peça a um administrador para criar a sua conta.',
        },
      }),
    )
    renderRegisterPage()

    await screen.findByRole('button', { name: /criar conta/i })
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: /criar conta/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O registo público está desactivado. Peça a um administrador para criar a sua conta.',
    )
  })
})
