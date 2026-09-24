import { api } from './client'
import type { Board, BoardColumn } from '@/types/projects'

export interface BoardPayload {
  name: string
  is_default?: boolean
  /** Omitido = true: a API cria as colunas base (Por fazer, Em curso, Em revisão, Concluído). */
  with_default_columns?: boolean
}

export interface ColumnPayload {
  name: string
  position?: number
  color?: string | null
  is_done_column?: boolean
}

export async function listProjectBoards(projectId: number): Promise<Board[]> {
  const { data } = await api.get<{ data: Board[] }>(`/projects/${projectId}/boards`)
  return data.data
}

export async function getBoard(boardId: number): Promise<Board> {
  const { data } = await api.get<{ data: Board }>(`/projects/boards/${boardId}`)
  return data.data
}

export async function createBoard(projectId: number, payload: BoardPayload): Promise<Board> {
  const { data } = await api.post<{ data: Board }>(`/projects/${projectId}/boards`, payload)
  return data.data
}

export async function updateBoard(boardId: number, payload: Partial<BoardPayload>): Promise<Board> {
  const { data } = await api.patch<{ data: Board }>(`/projects/boards/${boardId}`, payload)
  return data.data
}

export async function deleteBoard(boardId: number): Promise<void> {
  await api.delete(`/projects/boards/${boardId}`)
}

export async function createColumn(boardId: number, payload: ColumnPayload): Promise<BoardColumn> {
  const { data } = await api.post<{ data: BoardColumn }>(`/projects/boards/${boardId}/columns`, payload)
  return data.data
}

export async function updateColumn(columnId: number, payload: Partial<ColumnPayload>): Promise<BoardColumn> {
  const { data } = await api.patch<{ data: BoardColumn }>(`/projects/columns/${columnId}`, payload)
  return data.data
}

export async function deleteColumn(columnId: number): Promise<void> {
  await api.delete(`/projects/columns/${columnId}`)
}

/**
 * Persiste uma nova ordem de colunas: só actualiza as colunas cuja posição mudou
 * (posições normalizadas 0..n-1).
 */
export async function reorderColumns(ordered: BoardColumn[]): Promise<void> {
  const changed = ordered
    .map((column, index) => ({ column, index }))
    .filter(({ column, index }) => column.position !== index)
  await Promise.all(changed.map(({ column, index }) => updateColumn(column.id, { position: index })))
}
