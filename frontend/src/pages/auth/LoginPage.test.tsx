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
})
