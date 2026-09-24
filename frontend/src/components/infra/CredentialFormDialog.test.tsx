import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Credential } from '@/types/infra'

const updateCredentialMock = vi.fn()
const createCredentialMock = vi.fn()

vi.mock('@/api/infra', () => ({
  updateCredential: (...args: unknown[]) => updateCredentialMock(...args),
  createCredential: (...args: unknown[]) => createCredentialMock(...args),
  toTargetType: (type: string) => type.split('\\').pop()?.toLowerCase() ?? null,
}))

import { CredentialFormDialog } from './CredentialFormDialog'

const credential: Credential = {
  id: 5,
  credentialable_type: 'App\\Models\\Infra\\Machine',
  credentialable_id: 7,
  type: 'ssh',
  username: 'root',
  notes: null,
}

function renderDialog(value: Credential | null) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CredentialFormDialog
        credential={value}
        targets={[{ type: 'machine', id: 7, label: 'Máquina 32' }]}
        onClose={() => {}}
      />
    </QueryClientProvider>,
  )
}

describe('CredentialFormDialog', () => {
  beforeEach(() => {
    updateCredentialMock.mockReset().mockResolvedValue(credential)
    createCredentialMock.mockReset().mockResolvedValue(credential)
  })

  it('na edição nunca pré-preenche o segredo e não o envia quando fica vazio', async () => {
    const user = userEvent.setup()
    renderDialog(credential)

    const secret = screen.getByLabelText('Novo segredo')
    expect(secret).toHaveValue('')
    expect(screen.getByText(/deixar vazio para manter o segredo actual/i)).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Utilizador'))
    await user.type(screen.getByLabelText('Utilizador'), 'admin')
    await user.click(screen.getByRole('button', { name: /guardar alterações/i }))

    await waitFor(() => expect(updateCredentialMock).toHaveBeenCalledTimes(1))
    const [id, payload] = updateCredentialMock.mock.calls[0]
    expect(id).toBe(5)
    expect(payload).toEqual({ type: 'ssh', username: 'admin', notes: null })
    expect(payload).not.toHaveProperty('secret')
  })

  it('na edição envia o segredo quando o utilizador escreve um novo', async () => {
    const user = userEvent.setup()
    renderDialog(credential)

    await user.type(screen.getByLabelText('Novo segredo'), 'n0vo-segredo')
    await user.click(screen.getByRole('button', { name: /guardar alterações/i }))

    await waitFor(() => expect(updateCredentialMock).toHaveBeenCalledTimes(1))
    expect(updateCredentialMock.mock.calls[0][1]).toMatchObject({ secret: 'n0vo-segredo' })
  })

  it('na criação associa ao recurso escolhido', async () => {
    const user = userEvent.setup()
    renderDialog(null)

    await user.click(screen.getByRole('button', { name: /criar credencial/i }))

    await waitFor(() => expect(createCredentialMock).toHaveBeenCalledTimes(1))
    const payload = createCredentialMock.mock.calls[0][0]
    expect(payload).toMatchObject({ credentialable_type: 'machine', credentialable_id: 7, type: 'ssh' })
    expect(payload).not.toHaveProperty('secret')
  })
})
