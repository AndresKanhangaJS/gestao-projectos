import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import type { Credential } from '@/types/infra'

const listMachineCredentialsMock = vi.fn()
const revealCredentialMock = vi.fn()

vi.mock('@/api/infra', () => ({
  listMachineCredentials: (...args: unknown[]) => listMachineCredentialsMock(...args),
  revealCredential: (...args: unknown[]) => revealCredentialMock(...args),
  toTargetType: (type: string) => type.split('\\').pop()?.toLowerCase() ?? null,
}))

import { CredentialsSection, REVEAL_TIMEOUT_SECONDS } from './CredentialsSection'

const credential: Credential = {
  id: 42,
  credentialable_type: 'App\\Models\\Infra\\Machine',
  credentialable_id: 7,
  type: 'ssh',
  username: 'root',
  notes: 'Acesso principal',
}

function forbiddenError(): AxiosError {
  const headers = new AxiosHeaders()
  return new AxiosError('Forbidden', 'ERR_BAD_REQUEST', { headers }, null, {
    status: 403,
    statusText: 'Forbidden',
    headers: {},
    config: { headers },
    data: { message: 'This action is unauthorized.' },
  })
}

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <CredentialsSection machineId={7} targets={[{ type: 'machine', id: 7, label: 'Máquina 32' }]} />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

async function openRevealDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /revelar segredo da credencial ssh de root/i }))
  return screen.findByRole('dialog')
}

describe('CredentialsSection — revelar credencial', () => {
  beforeEach(() => {
    listMachineCredentialsMock.mockResolvedValue([credential])
    revealCredentialMock.mockResolvedValue({ secret: 's3cr3t-pass' })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('lista credenciais sem segredo e pede confirmação antes de chamar a API', async () => {
    const user = userEvent.setup()
    renderSection()

    expect(await screen.findByText('root')).toBeInTheDocument()
    expect(screen.getByText('Máquina 32')).toBeInTheDocument()
    expect(screen.queryByText('s3cr3t-pass')).not.toBeInTheDocument()
    expect(listMachineCredentialsMock).toHaveBeenCalledWith(7)

    const dialog = await openRevealDialog(user)
    expect(within(dialog).getByText(/fica registado em auditoria/i)).toBeInTheDocument()
    // Abrir o diálogo não pode, por si só, pedir o segredo.
    expect(revealCredentialMock).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: /confirmar e revelar/i }))

    await waitFor(() => expect(revealCredentialMock).toHaveBeenCalledTimes(1))
    expect(revealCredentialMock).toHaveBeenCalledWith(42)
    expect(await within(dialog).findByText('s3cr3t-pass')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /copiar segredo/i })).toBeInTheDocument()
  })

  it('não chama a API se o utilizador cancelar', async () => {
    const user = userEvent.setup()
    renderSection()

    const dialog = await openRevealDialog(user)
    await user.click(within(dialog).getByRole('button', { name: /cancelar/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(revealCredentialMock).not.toHaveBeenCalled()
  })

  it('nunca guarda o segredo na cache do TanStack Query', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderSection()

    const dialog = await openRevealDialog(user)
    await user.click(within(dialog).getByRole('button', { name: /confirmar e revelar/i }))
    expect(await within(dialog).findByText('s3cr3t-pass')).toBeInTheDocument()

    const cachedQueries = JSON.stringify(queryClient.getQueryCache().getAll().map((q) => q.state.data))
    expect(cachedQueries).not.toContain('s3cr3t-pass')

    await user.click(within(dialog).getByRole('button', { name: /esconder e fechar/i }))
    await waitFor(() => expect(screen.queryByText('s3cr3t-pass')).not.toBeInTheDocument())
    const cachedMutations = JSON.stringify(queryClient.getMutationCache().getAll().map((m) => m.state.data))
    expect(cachedMutations).not.toContain('s3cr3t-pass')
  })

  it('esconde o segredo automaticamente após o tempo limite', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderSection()

    const dialog = await openRevealDialog(user)
    await user.click(within(dialog).getByRole('button', { name: /confirmar e revelar/i }))
    expect(await screen.findByText('s3cr3t-pass')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(REVEAL_TIMEOUT_SECONDS * 1000)
    })

    expect(screen.queryByText('s3cr3t-pass')).not.toBeInTheDocument()
  })

  it('mostra mensagem em português quando a API devolve 403', async () => {
    revealCredentialMock.mockRejectedValue(forbiddenError())
    const user = userEvent.setup()
    renderSection()

    const dialog = await openRevealDialog(user)
    await user.click(within(dialog).getByRole('button', { name: /confirmar e revelar/i }))

    expect(await within(dialog).findByText(/não tem permissão para revelar esta credencial/i)).toBeInTheDocument()
  })

  it('ignora credenciais de recursos que não pertencem à máquina', async () => {
    listMachineCredentialsMock.mockResolvedValue([
      credential,
      { ...credential, id: 99, credentialable_id: 8, username: 'outra-maquina' },
    ])
    renderSection()

    expect(await screen.findByText('root')).toBeInTheDocument()
    expect(screen.queryByText('outra-maquina')).not.toBeInTheDocument()
  })

  it('mostra mensagem em português quando não pode listar credenciais (403)', async () => {
    listMachineCredentialsMock.mockRejectedValue(forbiddenError())
    renderSection()

    expect(await screen.findByText(/não tem permissão para consultar credenciais/i)).toBeInTheDocument()
  })
})
