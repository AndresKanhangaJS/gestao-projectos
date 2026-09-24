import { useAuth } from '@/context/AuthContext'
import {
  ACCESS_LOG_ROLES,
  CREDENTIAL_ROLES,
  INFRA_VIEW_ROLES,
  INFRA_WRITE_ROLES,
  hasAnyRole,
  type Role,
} from '@/lib/roles'

/**
 * `true` se o utilizador autenticado tiver pelo menos um dos papéis indicados.
 * Serve só para UX (esconder o que não pode usar) — o backend continua a ser a barreira real.
 */
export function useHasRole(...roles: Role[]): boolean {
  const { user } = useAuth()
  return hasAnyRole(user?.roles, roles)
}

/** Permissões derivadas dos papéis para o módulo de Controlo de Software. */
export function useInfraPermissions() {
  const { user } = useAuth()
  const roles = user?.roles
  return {
    canView: hasAnyRole(roles, INFRA_VIEW_ROLES),
    canWrite: hasAnyRole(roles, INFRA_WRITE_ROLES),
    canManageCredentials: hasAnyRole(roles, CREDENTIAL_ROLES),
    canViewAccessLogs: hasAnyRole(roles, ACCESS_LOG_ROLES),
  }
}
