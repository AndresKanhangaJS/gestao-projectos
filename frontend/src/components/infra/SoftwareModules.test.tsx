import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ClientSoftware } from '@/types/infra'

const createModuleMock = vi.fn()

vi.mock('@/api/infra', () => ({
  listSoftwareModules: vi.fn().mockResolvedValue([]),
  createSoftwareModule: (...args: unknown[]) => createModuleMock(...args),
  updateSoftwareModule: vi.fn(),
  deleteSoftwareModule: vi.fn(),
  syncClientSoftwareModules: vi.fn(),
  listSoftwareProducts: vi.fn().mockResolvedValue([]),
  createClientSoftware: vi.fn(),
  updateClientSoftware: vi.fn(),
}))

import { ClientSoftwareModulesDialog } from './ClientSoftwareDialogs'
import { SoftwareModulesSection } from './SoftwareModulesSection'

function withProviders(ui: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Registar módulos de um software', () => {
  beforeEach(() => {
    createModuleMock
      .mockReset()
      .mockResolvedValue({ id: 1, software_product_id: 40, name: 'Matrículas', description: null })
  })

  it('o estado vazio da secção Módulos tem um botão que regista o primeiro módulo', async () => {
    const user = userEvent.setup()
    withProviders(<SoftwareModulesSection productId={40} canWrite />)

    await user.click(await screen.findByRole('button', { name: 'Registar primeiro módulo' }))
    await user.type(await screen.findByLabelText('Nome'), 'Matrículas')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(createModuleMock).toHaveBeenCalledWith(40, { name: 'Matrículas', description: null }),
    )
  })

  it('sem permissão de escrita não mostra o botão e explica a quem pedir', async () => {
    withProviders(<SoftwareModulesSection productId={40} canWrite={false} />)
    expect(
      await screen.findByText(/peça a alguém da equipa de infra-estrutura/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /registar primeiro módulo/i }),
    ).not.toBeInTheDocument()
  })

  it('no diálogo de módulos do cliente, um software sem módulos leva ao registo', async () => {
    const instance: ClientSoftware = {
      id: 48,
      client_id: 44,
      software_product_id: 40,
      status: 'desenvolvimento',
      activated_at: null,
      notes: null,
      software_product: { id: 40, name: 'AVK_1', category: null, description: null },
      modules: [],
    }
    withProviders(<ClientSoftwareModulesDialog instance={instance} onClose={() => {}} />)

    const link = await screen.findByRole('link', { name: 'Registar módulos deste software' })
    expect(link).toHaveAttribute('href', '/infra/software/40#modulos')
  })
})
