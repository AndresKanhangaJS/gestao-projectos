import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const loginMock = vi.fn().mockResolvedValue(undefined)

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    login: loginMock,
  }),
}))

import { AxiosError, AxiosHeaders } from 'axios'
import { readSessionNotice, saveSessionNotice } from '@/lib/sessionNotice'
import LoginPage from './LoginPage'

function renderLoginPage() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  it('shows validation errors when submitted empty', async () => {
    renderLoginPage()

    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByText(/introduza um email válido/i)).toBeInTheDocument()
  })

  it('calls login with the entered credentials', async () => {
    renderLoginPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'user@level-soft.local')
    await userEvent.type(screen.getByLabelText(/palavra-passe/i), 'segredo123')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith({
        email: 'user@level-soft.local',
        password: 'segredo123',
      }),
    )
  })

  it('mostra a mensagem da API quando a sessão terminou por a conta ter sido desactivada', () => {
    saveSessionNotice('A sua conta está desactivada. Contacte um administrador.')
    renderLoginPage()

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A sua conta está desactivada. Contacte um administrador.',
    )
    expect(readSessionNotice()).toBeNull()
  })

  it('mostra o erro 422 da API no login (ex.: conta desactivada)', async () => {
    const headers = new AxiosHeaders()
    loginMock.mockRejectedValueOnce(
      new AxiosError('Unprocessable', 'ERR_BAD_REQUEST', { headers }, null, {
        status: 422,
        statusText: 'Unprocessable Content',
        headers: {},
        config: { headers },
        data: {
          message: 'A sua conta está desactivada. Contacte um administrador.',
          errors: { email: ['A sua conta está desactivada. Contacte um administrador.'] },
        },
      }),
    )
    renderLoginPage()
    await userEvent.type(screen.getByLabelText(/email/i), 'bruno@x.pt')
    await userEvent.type(screen.getByLabelText(/palavra-passe/i), 'segredo123')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A sua conta está desactivada.')
  })
})
