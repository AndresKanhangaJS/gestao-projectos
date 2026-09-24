import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'

const createClientMock = vi.fn()

vi.mock('@/api/infra', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
  updateClient: vi.fn(),
}))

import { ClientFormDialog } from './ClientFormDialog'

function validationError(errors: Record<string, string[]>): AxiosError {
  const headers = new AxiosHeaders()
  return new AxiosError('Unprocessable', 'ERR_BAD_REQUEST', { headers }, null, {
    status: 422,
    statusText: 'Unprocessable Content',
    headers: {},
    config: { headers },
    data: { message: 'Invalid', errors },
  })
}

describe('ClientFormDialog', () => {
  it('mostra junto ao campo o erro 422 devolvido pela API', async () => {
    createClientMock.mockRejectedValue(validationError({ name: ['Já existe um cliente com este nome.'] }))
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ClientFormDialog client={null} open onOpenChange={() => {}} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByLabelText('Nome'), 'Level-Soft')
    await user.click(screen.getByRole('button', { name: /criar cliente/i }))

    const message = await screen.findByText('Já existe um cliente com este nome.')
    expect(message).toHaveAttribute('id', 'c-name-error')
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'true')
  })

  it('valida o email no cliente antes de chamar a API', async () => {
    const user = userEvent.setup()
    createClientMock.mockClear()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ClientFormDialog client={null} open onOpenChange={() => {}} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByLabelText('Nome'), 'Cliente')
    await user.type(screen.getByLabelText('Email de contacto'), 'nao-e-email')
    await user.click(screen.getByRole('button', { name: /criar cliente/i }))

    expect(await screen.findByText('Introduza um email válido.')).toBeInTheDocument()
    expect(createClientMock).not.toHaveBeenCalled()
  })
})
