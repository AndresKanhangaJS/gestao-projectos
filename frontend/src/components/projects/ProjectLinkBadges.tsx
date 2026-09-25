import { Link } from 'react-router-dom'
import { Boxes, Building2, Puzzle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useInfraPermissions } from '@/hooks/useHasRole'
import { cn } from '@/lib/utils'
import type { Project } from '@/types/projects'

/**
 * Ligação do projecto ao cliente (software, cliente, módulos) em badges. Quem pode ver o módulo
 * de Controlo de Software tem ligações para o software e o cliente em Infra.
 */
export function ProjectLinkBadges({
  project,
  className,
  linked = true,
}: {
  project: Project
  className?: string
  /** `false` dentro de elementos que já são ligações (ex.: cartão da lista de projectos). */
  linked?: boolean
}) {
  const { canView: canViewInfra } = useInfraPermissions()
  const canView = linked && canViewInfra
  const software = project.software_product
  const client = project.client
  const modules = project.modules ?? []
  if (!software && !client && modules.length === 0) return null

  const link = (to: string, text: string) =>
    canView ? (
      <Link
        to={to}
        className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {text}
      </Link>
    ) : (
      text
    )

  return (
    <ul
      className={cn('flex flex-wrap items-center gap-1.5', className)}
      aria-label="Relação com o cliente"
    >
      {software && (
        <li>
          <Badge variant="secondary" className="gap-1">
            <Boxes className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">Software:</span>
            {link(`/infra/software/${software.id}`, software.name)}
          </Badge>
        </li>
      )}
      {client && (
        <li>
          <Badge variant="secondary" className="gap-1">
            <Building2 className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">Cliente:</span>
            {link(`/infra/clients/${client.id}`, client.name)}
          </Badge>
        </li>
      )}
      {software && !client && (
        <li>
          <Badge variant="outline">Projecto interno do produto</Badge>
        </li>
      )}
      {modules.map((module) => (
        <li key={module.id}>
          <Badge variant="outline" className="gap-1">
            <Puzzle className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">Módulo:</span>
            {module.name}
          </Badge>
        </li>
      ))}
    </ul>
  )
}
