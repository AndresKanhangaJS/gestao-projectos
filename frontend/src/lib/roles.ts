/** Papéis globais (spatie/laravel-permission). A autorização real é sempre feita pelo backend. */
export type Role = 'admin' | 'project_manager' | 'infra' | 'member' | 'client_viewer'

/** Quem pode ver o módulo de Controlo de Software. */
export const INFRA_VIEW_ROLES: readonly Role[] = ['admin', 'infra', 'project_manager']
/** Quem pode criar/editar/apagar entidades de infra. */
export const INFRA_WRITE_ROLES: readonly Role[] = ['admin', 'infra']
/** Quem pode ver/gerir credenciais. */
export const CREDENTIAL_ROLES: readonly Role[] = ['admin', 'infra']
/** Quem pode consultar o histórico de acessos a credenciais. */
export const ACCESS_LOG_ROLES: readonly Role[] = ['admin']

export function hasAnyRole(userRoles: readonly string[] | undefined, roles: readonly string[]): boolean {
  if (!userRoles?.length) return false
  return roles.some((role) => userRoles.includes(role))
}
