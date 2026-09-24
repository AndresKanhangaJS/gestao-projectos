import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  KanbanSquare,
  Building2,
  Boxes,
  Server,
  Rocket,
  DatabaseBackup,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react'
import { useInfraPermissions } from '@/hooks/useHasRole'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const projectLinks: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projectos', icon: KanbanSquare },
]

const infraLinks: NavItem[] = [
  { to: '/infra/clients', label: 'Clientes', icon: Building2 },
  { to: '/infra/software', label: 'Softwares', icon: Boxes },
  { to: '/infra/machines', label: 'Máquinas', icon: Server },
  { to: '/infra/deployments', label: 'Deployments', icon: Rocket },
  { to: '/infra/backups', label: 'Backups', icon: DatabaseBackup },
  { to: '/infra/alerts', label: 'Alertas', icon: AlertTriangle },
]

function NavItems({ items }: { items: NavItem[] }) {
  return items.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive && 'bg-muted text-foreground',
        )
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </NavLink>
  ))
}

export function Sidebar() {
  const { canView: canViewInfra } = useInfraPermissions()

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span className="text-sm font-semibold">Level-Soft</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Navegação principal">
        <NavItems items={projectLinks} />
        {canViewInfra && (
          <>
            <p className="mt-4 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Controlo de Software
            </p>
            <NavItems items={infraLinks} />
          </>
        )}
      </nav>
    </aside>
  )
}
