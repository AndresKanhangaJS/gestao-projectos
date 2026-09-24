import { api } from './client'

/** Metadados de paginação devolvidos pelo `LengthAwarePaginator` do Laravel via API Resources. */
export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export interface Paginated<T, M extends object = PaginationMeta> {
  data: T[]
  meta: M
}

/** Número máximo de páginas a pedir, para nunca entrar num ciclo infinito se a API mudar. */
const MAX_PAGES = 50

/**
 * Percorre todas as páginas de um endpoint paginado do Laravel e devolve a colecção completa.
 * Também aceita respostas não paginadas (`{ data: T[] }` sem `meta`), devolvendo apenas `data`.
 */
export async function fetchAllPages<T>(url: string, params?: Record<string, unknown>): Promise<T[]> {
  const items: T[] = []

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data } = await api.get<{ data: T[]; meta?: Partial<PaginationMeta> }>(url, {
      params: { ...params, page },
    })
    items.push(...data.data)
    if (page >= (data.meta?.last_page ?? 1)) break
  }

  return items
}
