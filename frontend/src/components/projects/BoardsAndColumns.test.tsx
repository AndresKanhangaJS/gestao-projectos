import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import type { Board } from '@/types/projects'

const createBoardMock = vi.fn()
const createColumnMock = vi.fn()
const deleteColumnMock = vi.fn()

vi.mock('@/api/boards', () => ({
  createBoard: (...args: unknown[]) => createBoardMock(...args),
  createColumn: (...args: unknown[]) => createColumnMock(...args),
  deleteColumn: (...args: unknown[]) => deleteColumnMock(...args),
  updateColumn: vi.fn(),
  reorderColumns: vi.fn(),
}))

import { BoardFormDialog } from './BoardFormDialog'
import { ColumnsManagerDialog } from './ColumnsManagerDialog'

function withClient(ui: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)
}

describe('BoardFormDialog', () => {
  beforeEach(() => {
    createBoardMock
      .mockReset()
      .mockResolvedValue({ id: 9, project_id: 1, name: 'Q', is_default: true, columns: [] })
    createColumnMock.mockReset()
  })

  it('pede à API as colunas base e não as cria no cliente', async () => {
    const user = userEvent.setup()
    withClient(<BoardFormDialog open projectId={1} isFirstBoard onOpenChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: /criar quadro/i }))

    await waitFor(() => expect(createBoardMock).toHaveBeenCalledTimes(1))
    expect(createBoardMock).toHaveBeenCalledWith(1, {
      name: 'Quadro principal',
      is_default: true,
      with_default_columns: true,
    })
    expect(createColumnMock).not.toHaveBeenCalled()
  })

  it('envia with_default_columns=false quando a opção é desmarcada', async () => {
    const user = userEvent.setup()
    withClient(<BoardFormDialog open projectId={1} isFirstBoard={false} onOpenChange={() => {}} />)

    await user.type(screen.getByLabelText('Nome'), 'Suporte')
    await user.click(screen.getByLabelText(/criar colunas base/i))
    await user.click(screen.getByRole('button', { name: /criar quadro/i }))

    await waitFor(() => expect(createBoardMock).toHaveBeenCalledTimes(1))
    expect(createBoardMock.mock.calls[0][1]).toMatchObject({
      name: 'Suporte',
      with_default_columns: false,
    })
    expect(createColumnMock).not.toHaveBeenCalled()
  })
})

describe('ColumnsManagerDialog: apagar coluna', () => {
  const board: Board = {
    id: 3,
    project_id: 1,
    name: 'Principal',
    is_default: true,
    columns: [
      { id: 21, board_id: 3, name: 'Em curso', position: 0, color: null, is_done_column: false },
    ],
  }

  it('mostra a mensagem 422 da API quando a coluna tem tarefas', async () => {
    const headers = new AxiosHeaders()
    deleteColumnMock.mockRejectedValue(
      new AxiosError('Unprocessable', 'ERR_BAD_REQUEST', { headers }, null, {
        status: 422,
        statusText: 'Unprocessable Content',
        headers: {},
        config: { headers },
        data: {
          message: 'A coluna tem tarefas.',
          errors: { column: ['Não é possível apagar a coluna “Em curso”: tem 3 tarefa(s).'] },
        },
      }),
    )
    const user = userEvent.setup()
    withClient(<ColumnsManagerDialog projectId={1} board={board} open onOpenChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: /apagar coluna em curso/i }))
    const confirm = await screen.findByRole('alertdialog')
    await user.click(within(confirm).getByRole('button', { name: 'Apagar' }))

    expect(
      await within(confirm).findByText(
        'Não é possível apagar a coluna “Em curso”: tem 3 tarefa(s).',
      ),
    ).toBeInTheDocument()
    expect(deleteColumnMock).toHaveBeenCalledWith(21)
  })
})
