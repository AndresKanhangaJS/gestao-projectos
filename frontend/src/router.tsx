import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireRole } from '@/components/layout/RequireRole'
import { ADMIN_ROLES, INFRA_VIEW_ROLES } from '@/lib/roles'
import LoginPage from '@/pages/auth/LoginPage'
import NoAccessPage from '@/pages/NoAccessPage'
import * as Pages from '@/routes/lazyPages'

const { LazyPage } = Pages

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <LazyPage component={Pages.RegisterPage} /> },
  // Fora do AppLayout: é acessível (e obrigatória) com palavra-passe provisória.
  { path: '/change-password', element: <LazyPage component={Pages.ChangePasswordPage} /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <LazyPage component={Pages.DashboardPage} /> },
      { path: 'search', element: <LazyPage component={Pages.SearchPage} /> },
      { path: 'projects', element: <LazyPage component={Pages.ProjectsListPage} /> },
      { path: 'projects/:projectId', element: <LazyPage component={Pages.KanbanBoardPage} /> },
      {
        // Só UX: esconde o módulo a quem não tem papel; a API responde 403 de qualquer forma.
        path: 'infra',
        element: <RequireRole roles={INFRA_VIEW_ROLES} />,
        children: [
          { path: 'clients', element: <LazyPage component={Pages.ClientsPage} /> },
          { path: 'clients/:clientId', element: <LazyPage component={Pages.ClientDetailPage} /> },
          { path: 'software', element: <LazyPage component={Pages.SoftwareProductsPage} /> },
          {
            path: 'software/:productId',
            element: <LazyPage component={Pages.SoftwareProductDetailPage} />,
          },
          { path: 'machines', element: <LazyPage component={Pages.MachinesPage} /> },
          {
            path: 'machines/:machineId',
            element: <LazyPage component={Pages.MachineDetailPage} />,
          },
          { path: 'deployments', element: <LazyPage component={Pages.DeploymentsPage} /> },
          { path: 'backups', element: <LazyPage component={Pages.BackupPoliciesPage} /> },
          { path: 'alerts', element: <LazyPage component={Pages.AlertsPage} /> },
        ],
      },
      {
        // Gestão de utilizadores: só admin (a API responde 403 aos restantes).
        path: 'admin',
        element: <RequireRole roles={ADMIN_ROLES} />,
        children: [{ path: 'users', element: <LazyPage component={Pages.UsersPage} /> }],
      },
      { path: 'no-access', element: <NoAccessPage /> },
    ],
  },
])
