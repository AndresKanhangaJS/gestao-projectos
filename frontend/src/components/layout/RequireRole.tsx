import { Outlet } from 'react-router-dom'
import { useHasRole } from '@/hooks/useHasRole'
import type { Role } from '@/lib/roles'
import NoAccessPage from '@/pages/NoAccessPage'

/** Guarda de rotas por papel (só UX: a API recusa com 403 de qualquer forma). */
export function RequireRole({ roles }: { roles: readonly Role[] }) {
  const allowed = useHasRole(...roles)
  return allowed ? <Outlet /> : <NoAccessPage />
}
