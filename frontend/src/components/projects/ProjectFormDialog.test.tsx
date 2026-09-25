import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError, AxiosHeaders } from 'axios'
import type { Project, ProjectLinkOptions, Workspace } from '@/types/projects'

const createProjectMock = vi.fn()
const updateProjectMock = vi.fn()

const linkOptions: ProjectLinkOptions = {
  software_products: [
    {
      id: 1,
      name: 'Level-School',
      modules: [
        { id: 11, name: 'Matrículas' },
        { id: 12, name: 'Propinas' },
        { id: 13, name: 'Avaliações' },
      ],
      clients: [
        { id: 100, name: 'Pitruca', all_modules: false, module_ids: [11, 12] },
        { id: 101, name: 'ENSASI', all_modules: true, module_ids: [] },
      ],
    },
    {
      id: 2,
      name: 'Level-RH',
      modules: [{ id: 21, name: 'Salários' }],
      clients: [{ id: 200, name: 'Grupo Pitruca', all_modules: true, module_ids: [] }],
    },
  ],
}

vi.mock('@/api/projects', () => ({
  getProjectLinkOptions: vi.fn(() => Promise.resolve(linkOptions)),
  createProject: (...args: unknown[]) => createProjectMock(...args),
  updateProject: (...args: unknown[]) => updateProjectMock(...args),
}))

import { ProjectFormDialog } from './ProjectFormDialog'

const workspaces: Workspace[] = [
  { id: 5, name: 'Level-Soft', slug: 'level-soft', description: null, created_at: '2026-09-01' },
]

function renderDialog(props: { project?: Project | null } = {}) {
  const onOpenChange = vi.fn()
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ProjectFormDialog open onOpenChange={onOpenChange} workspaces={workspaces} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { onOpenChange }
}

async function pick(user: ReturnType<typeof userEvent.setup>, label: RegExp, option: RegExp) {
  await user.click(await screen.findByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('ProjectFormDialog: relação com o cliente', () => {
  beforeEach(() => {
    createProjectMock.mockReset().mockResolvedValue({ id: 9 })
    updateProjectMock.mockReset().mockResolvedValue({ id: 3 })
  })

  it('filtra em cascata: clientes do software e só os módulos activos do cliente', async () => {
    const user = userEvent.setup()
    renderDialog()

    await screen.findByRole('combobox', { name: /^software/i })
    expect(screen.getByRole('combobox', { name: /^cliente/i })).toBeDisabled()
    expect(screen.getByText('Escolha primeiro o software.')).toBeInTheDocument()
    expect(
      screen.getByText('Os módulos aparecem depois de escolher o software.'),
    ).toBeInTheDocument()

    await pick(user, /^software/i, /Level-School/)
    await user.click(screen.getByRole('combobox', { name: /^cliente/i }))
    const clientOptions = within(screen.getByRole('listbox')).getAllByRole('option')
    expect(clientOptions.map((o) => o.textContent)).toEqual([
      'Nenhum (projecto interno do produto)',
      'Pitruca',
      'ENSASI',
    ])
    // Sem cliente: todos os módulos do software.
    await user.keyboard('{Escape}')
    const modulesList = screen.getByRole('list', { name: 'Módulos do projecto' })
    expect(within(modulesList).getAllByRole('checkbox')).toHaveLength(3)

    await pick(user, /^cliente/i, /^Pitruca$/)
    const limited = screen.getByRole('list', { name: 'Módulos do projecto' })
    expect(
      within(limited)
        .getAllByRole('checkbox')
        .map((c) => c.id),
    ).toEqual(['p-module-11', 'p-module-12'])

    // Cliente com todos os módulos: mostra todos.
    await pick(user, /^cliente/i, /ENSASI/)
    expect(
      within(screen.getByRole('list', { name: 'Módulos do projecto' })).getAllByRole('checkbox'),
    ).toHaveLength(3)
  })

  it('ao mudar de software limpa o cliente e os módulos que deixam de existir', async () => {
    const user = userEvent.setup()
    renderDialog()

    await pick(user, /^software/i, /Level-School/)
    await pick(user, /^cliente/i, /^Pitruca$/)
    await user.click(screen.getByRole('checkbox', { name: 'Matrículas' }))

    await pick(user, /^software/i, /Level-RH/)
    expect(screen.getByRole('combobox', { name: /^cliente/i })).toHaveValue(
      'Nenhum (projecto interno do produto)',
    )
    expect(screen.getByRole('checkbox', { name: 'Salários' })).not.toBeChecked()

    await user.type(screen.getByLabelText('Chave (ex.: PROJ)'), 'rh')
    await user.type(screen.getByLabelText('Nome'), 'Salários 2027')
    await user.click(screen.getByRole('button', { name: 'Criar projecto' }))

    await waitFor(() => expect(createProjectMock).toHaveBeenCalledTimes(1))
    expect(createProjectMock).toHaveBeenCalledWith({
      workspace_id: 5,
      key: 'RH',
      name: 'Salários 2027',
      description: null,
      software_product_id: 2,
      client_id: null,
      module_ids: [],
    })
  })

  it('cria um projecto ligado a cliente e módulos', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText('Chave (ex.: PROJ)'), 'pit')
    await user.type(screen.getByLabelText('Nome'), 'Portal de propinas')
    await pick(user, /^software/i, /Level-School/)
    await pick(user, /^cliente/i, /^Pitruca$/)
    await user.click(screen.getByRole('checkbox', { name: 'Propinas' }))
    await user.click(screen.getByRole('button', { name: 'Criar projecto' }))

    await waitFor(() => expect(createProjectMock).toHaveBeenCalledTimes(1))
    expect(createProjectMock.mock.calls[0][0]).toMatchObject({
      key: 'PIT',
      software_product_id: 1,
      client_id: 100,
      module_ids: [12],
    })
  })

  it('edita a ligação de um projecto existente e mostra o erro 422 junto ao campo', async () => {
    const headers = new AxiosHeaders()
    updateProjectMock.mockRejectedValue(
      new AxiosError('Unprocessable', 'ERR_BAD_REQUEST', { headers }, null, {
        status: 422,
        statusText: 'Unprocessable Content',
        headers: {},
        config: { headers },
        data: {
          message: 'Dados inválidos.',
          errors: { client_id: ['O cliente não tem este software instalado.'] },
        },
      }),
    )
    const project: Project = {
      id: 3,
      workspace_id: 5,
      key: 'LS',
      name: 'Level-School 2027',
      description: null,
      status: 'active',
      software_product: { id: 1, name: 'Level-School' },
      client: { id: 100, name: 'Pitruca' },
      modules: [{ id: 11, name: 'Matrículas' }],
      created_at: '2026-09-01',
    }
    const user = userEvent.setup()
    renderDialog({ project })

    expect(screen.getByRole('heading', { name: 'Editar projecto' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /workspace/i })).not.toBeInTheDocument()
    expect(await screen.findByRole('checkbox', { name: 'Matrículas' })).toBeChecked()
    expect(screen.getByRole('combobox', { name: /^cliente/i })).toHaveValue('Pitruca')

    await user.click(screen.getByRole('button', { name: 'Guardar alterações' }))

    await waitFor(() => expect(updateProjectMock).toHaveBeenCalledTimes(1))
    expect(updateProjectMock).toHaveBeenCalledWith(3, {
      key: 'LS',
      name: 'Level-School 2027',
      description: null,
      software_product_id: 1,
      client_id: 100,
      module_ids: [11],
    })
    const error = await screen.findByText('O cliente não tem este software instalado.')
    expect(error).toHaveAttribute('id', 'p-client-error')
  })
})
