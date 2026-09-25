import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { LoadingState } from '@/components/ui/Spinner'

// Code-splitting: cada página é um chunk próprio, carregado só quando a rota é visitada.
export const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
export const ChangePasswordPage = lazy(() => import('@/pages/auth/ChangePasswordPage'))
export const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
export const SearchPage = lazy(() => import('@/pages/SearchPage'))
export const ProjectsListPage = lazy(() => import('@/pages/projects/ProjectsListPage'))
export const KanbanBoardPage = lazy(() => import('@/pages/projects/KanbanBoardPage'))
export const ClientsPage = lazy(() => import('@/pages/infra/ClientsPage'))
export const ClientDetailPage = lazy(() => import('@/pages/infra/ClientDetailPage'))
export const SoftwareProductsPage = lazy(() => import('@/pages/infra/SoftwareProductsPage'))
export const SoftwareProductDetailPage = lazy(
  () => import('@/pages/infra/SoftwareProductDetailPage'),
)
export const MachinesPage = lazy(() => import('@/pages/infra/MachinesPage'))
export const MachineDetailPage = lazy(() => import('@/pages/infra/MachineDetailPage'))
export const DeploymentsPage = lazy(() => import('@/pages/infra/DeploymentsPage'))
export const BackupPoliciesPage = lazy(() => import('@/pages/infra/BackupPoliciesPage'))
export const AlertsPage = lazy(() => import('@/pages/infra/AlertsPage'))
export const UsersPage = lazy(() => import('@/pages/admin/UsersPage'))

/** Renderiza uma página lazy com um estado de carregamento enquanto o chunk é descarregado. */
export function LazyPage({
  component: Component,
}: {
  component: LazyExoticComponent<ComponentType>
}) {
  return (
    <Suspense fallback={<LoadingState />}>
      <Component />
    </Suspense>
  )
}
