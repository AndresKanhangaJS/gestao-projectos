import type { NamedRef, ProjectLinkOptions } from '@/types/projects'

export type ProductOption = ProjectLinkOptions['software_products'][number]

/**
 * Módulos que se podem escolher: os do software; com cliente, só os activos na instalação dele
 * (todos, se o cliente tiver o software completo). Filtro de UX: a API valida o mesmo.
 */
export function selectableModules(
  product: ProductOption | undefined,
  clientId: string,
): NamedRef[] {
  if (!product) return []
  const client = product.clients.find((c) => String(c.id) === clientId)
  if (!client || client.all_modules) return product.modules
  const active = new Set(client.module_ids)
  return product.modules.filter((m) => active.has(m.id))
}
