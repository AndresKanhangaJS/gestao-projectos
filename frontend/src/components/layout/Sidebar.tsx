import { NavLink } from 'react-router-dom'
import {
  AlertTriangle,
  Boxes,
  Building2,
  DatabaseBackup,
  KanbanSquare,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Rocket,
  Server,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useHasRole, useInfraPermissions } from '@/hooks/useHasRole'
import { ADMIN_ROLES } from '@/lib/roles'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

interface NavSection {
  id: string
  title: string
  items: NavItem[]
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

const adminLinks: NavItem[] = [{ to: '/admin/users', label: 'Utilizadores', icon: Users }]

export const SIDEBAR_SHORTCUT_LABEL = 'Ctrl+B'

function NavItems({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[]
  collapsed: boolean
  onNavigate?: () => void
}) {
  return items.map(({ to, label, icon: Icon, end }) => (
    <Tooltip key={to} content={label} disabled={!collapsed}>
      <NavLink
        to={to}
        end={end}
        onClick={onNavigate}
        aria-label={collapsed ? label : undefined}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2 rounded-md py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            collapsed ? 'justify-center px-0' : 'px-3',
            isActive && 'bg-muted text-foreground',
          )
        }
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {!collapsed && <span className="truncate">{label}</span>}
      </NavLink>
    </Tooltip>
  ))
}

/**
 * Menu de navegação. Em desktop pode ser colapsado (só ícones, com o nome numa dica); em mobile
 * é mostrado dentro de uma gaveta (`variant="drawer"`), sempre expandido.
 */
export function Sidebar({
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
  variant = 'desktop',
}: {
  collapsed?: boolean
  onToggleCollapsed?: () => void
  /** Chamado ao escolher uma opção (a gaveta mobile fecha-se). */
  onNavigate?: () => void
  variant?: 'desktop' | 'drawer'
}) {
  const { canView: canViewInfra } = useInfraPermissions()
  const isAdmin = useHasRole(...ADMIN_ROLES)
  const isCollapsed = variant === 'desktop' && collapsed

  const sections: NavSection[] = [
    { id: 'projects', title: 'Projectos', items: projectLinks },
    ...(canViewInfra ? [{ id: 'infra', title: 'Controlo de Software', items: infraLinks }] : []),
    ...(isAdmin ? [{ id: 'admin', title: 'Administração', items: adminLinks }] : []),
  ]

  const nav = (
    <nav
      className="flex flex-1 flex-col gap-1 overflow-y-auto p-2"
      aria-label="Navegação principal"
    >
      {sections.map((section, index) => (
        <div
          key={section.id}
          role="group"
          aria-labelledby={`nav-section-${section.id}`}
          className="flex flex-col gap-1"
        >
          {isCollapsed ? (
            <>
              {/* Colapsado: a secção passa a um separador discreto (o título fica para leitores de ecrã). */}
              {index > 0 && <hr className="my-2 border-border" aria-hidden="true" />}
              <span id={`nav-section-${section.id}`} className="sr-only">
                {section.title}
              </span>
            </>
          ) : (
            <p
              id={`nav-section-${section.id}`}
              className={cn(
                'px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                index > 0 && 'mt-4',
              )}
            >
              {section.title}
            </p>
          )}
          <NavItems items={section.items} collapsed={isCollapsed} onNavigate={onNavigate} />
        </div>
      ))}
    </nav>
  )

  if (variant === 'drawer') return nav

  const toggleLabel = collapsed ? 'Expandir menu' : 'Ocultar menu'

  return (
    <aside
      className={cn(
        'hidden shrink-0 border-r border-border bg-card transition-[width] duration-200 ease-out motion-reduce:transition-none md:flex md:flex-col',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b border-border',
          collapsed ? 'justify-center' : 'justify-between gap-2 px-4',
        )}
      >
        {!collapsed && <span className="truncate text-sm font-semibold">Level-Soft</span>}
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={toggleLabel}
            title={`${toggleLabel} (${SIDEBAR_SHORTCUT_LABEL})`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {nav}
    </aside>
  )
}
