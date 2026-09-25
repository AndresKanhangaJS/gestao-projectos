import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Deployment } from '@/types/infra'

const updateDeploymentMock = vi.fn()
const createDeploymentMock = vi.fn()

vi.mock('@/api/infra', () => ({
  listClientSoftware: vi.fn().mockResolvedValue([
    {
      id: 5,
      client_id: 1,
      software_product_id: 9,
      status: 'producao',
      activated_at: null,
      notes: null,
      client: { id: 1, name: 'Pitruca' },
      software_product: { id: 9, name: 'Level-School', category: null, description: null },
    },
  ]),
  listMachines: vi.fn().mockResolvedValue(
    Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      name: `Máquina ${i + 1}`,
      ip_address: `10.10.10.${i + 1}`,
      operating_system: null,
      access_type: null,
      access_user: null,
      environment: 'docker',
      notes: null,
    })),
  ),
  listSoftwareModules: vi.fn().mockResolvedValue([]),
  createDeployment: (...args: unknown[]) => createDeploymentMock(...args),
  updateDeployment: (...args: unknown[]) => updateDeploymentMock(...args),
}))

import { DeploymentFormDialog } from './DeploymentFormDialog'

const deployment: Deployment = {
  id: 77,
  client_software_id: 5,
  software_module_id: null,
  machine_id: 3,
  component: 'backend',
  port: 8084,
  stack: 'Laravel 7',
  database_engine: 'MySQL',
  database_name: 'pitruca',
  database_host: 'Laragon (host)',
  environment_type: 'tradicional',
  start_command: null,
  status: 'activo',
  last_checked_at: null,
}

function renderDialog(props: { deployment: Deployment | null }) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <DeploymentFormDialog {...props} onClose={() => {}} />
    </QueryClientProvider>,
  )
}

describe('DeploymentFormDialog: base de dados', () => {
  beforeEach(() => {
    updateDeploymentMock.mockReset().mockResolvedValue(deployment)
    createDeploymentMock.mockReset().mockResolvedValue(deployment)
  })

  it('mostra os valores existentes (host fora da lista em "Outro…") e guarda-os sem os alterar', async () => {
    const user = userEvent.setup()
    renderDialog({ deployment })

    expect(screen.getByRole('combobox', { name: /motor de base de dados/i })).toHaveTextContent(
      'MySQL',
    )
    expect(screen.getByRole('textbox', { name: 'Host da base de dados (outro)' })).toHaveValue(
      'Laragon (host)',
    )
    expect(await screen.findByDisplayValue('Máquina 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajuda: Host da base de dados' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Guardar alterações' }))

    await waitFor(() => expect(updateDeploymentMock).toHaveBeenCalledTimes(1))
    expect(updateDeploymentMock.mock.calls[0][1]).toMatchObject({
      machine_id: 3,
      database_engine: 'MySQL',
      database_name: 'pitruca',
      database_host: 'Laragon (host)',
    })
  })

  it('host pode ser a própria máquina ou uma máquina registada; "Sem base de dados" envia null', async () => {
    const user = userEvent.setup()
    renderDialog({ deployment })

    const host = screen.getByRole('combobox', { name: /host da base de dados/i })
    await user.click(host)
    await user.type(host, 'Máquina 12')
    await user.click(await screen.findByRole('option', { name: /Máquina 12/ }))
    expect(
      screen.queryByRole('textbox', { name: 'Host da base de dados (outro)' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: /motor de base de dados/i }))
    await user.click(await screen.findByRole('option', { name: 'Sem base de dados' }))

    await user.click(screen.getByRole('button', { name: 'Guardar alterações' }))
    await waitFor(() => expect(updateDeploymentMock).toHaveBeenCalledTimes(1))
    expect(updateDeploymentMock.mock.calls[0][1]).toMatchObject({
      database_engine: null,
      database_host: 'Máquina 12',
    })
  })

  it('a máquina escolhe-se com pesquisa (lista longa)', async () => {
    const user = userEvent.setup()
    renderDialog({ deployment: null })

    const machine = screen.getByRole('combobox', { name: 'Máquina' })
    await user.click(machine)
    await user.type(machine, '10.10.10.25')
    await user.click(await screen.findByRole('option', { name: /Máquina 25/ }))
    expect(machine).toHaveValue('Máquina 25')
  })
})
