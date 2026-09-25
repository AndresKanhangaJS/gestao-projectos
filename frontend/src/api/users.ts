import { api } from './client'
import type { UserSummary } from '@/types/projects'

/**
 * Pesquisa de utilizadores para adicionar a um workspace (`GET /projects/users?search=`).
 * Resposta paginada: devolve só a primeira página (suficiente para um selector com pesquisa).
 */
export async function searchUsers(search: string): Promise<UserSummary[]> {
  const { data } = await api.get<{ data: UserSummary[] }>('/projects/users', { params: { search } })
  return data.data
}
