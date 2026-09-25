import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, DatabaseBackup, Server, Stethoscope } from 'lucide-react'
import { getInfraAlerts } from '@/api/infra'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import { formatDateTime } from '@/lib/format'

const linkClass =
  'font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function AlertGroup({
  id,
  title,
  description,
  icon,
  count,
  emptyTitle,
  children,
}: {
  id: string
  title: string
  description: string
  icon: ReactNode
  count: number
  emptyTitle: string
  children: ReactNode
}) {
  return (
    <Card role="region" aria-labelledby={id}>
      <CardHeader>
        <CardTitle id={id} className="flex items-center gap-2">
          {icon}
          {title}
          <Badge variant={count > 0 ? 'warning' : 'success'}>{count}</Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <EmptyState title={emptyTitle} />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {children}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default function AlertsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['infra', 'alerts'],
    queryFn: getInfraAlerts,
  })

  if (isLoading) return <LoadingState label="A carregar alertas…" />
  if (isError || !data) return <ErrorState message="Não foi possível carregar os alertas." />

  const { machines_tradicional, software_without_backup, deployments_not_recently_checked } = data

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
        <h1 className="text-xl font-semibold">Alertas de infra-estrutura</h1>
      </div>

      <AlertGroup
        id="alerts-tradicional"
        title="Máquinas em ambiente Tradicional"
        description="Máquinas sem Docker, candidatas a migração."
        icon={<Server className="h-4 w-4" aria-hidden="true" />}
        count={machines_tradicional.length}
        emptyTitle="Todas as máquinas usam Docker"
      >
        {machines_tradicional.map((machine) => (
          <li
            key={machine.id}
            className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
          >
            <Link to={`/infra/machines/${machine.id}`} className={linkClass}>
              {machine.name}
            </Link>
            <span className="text-muted-foreground">
              {machine.ip_address ?? 'IP desconhecido'} ·{' '}
              {machine.operating_system ?? 'SO desconhecido'}
            </span>
          </li>
        ))}
      </AlertGroup>

      <AlertGroup
        id="alerts-backup"
        title="Softwares sem backup"
        description="Instalações de clientes sem nenhuma política de backup nos seus deployments."
        icon={<DatabaseBackup className="h-4 w-4" aria-hidden="true" />}
        count={software_without_backup.length}
        emptyTitle="Todos os softwares têm política de backup"
      >
        {software_without_backup.map((instance) => (
          <li
            key={instance.id}
            className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
          >
            <span>
              <Link to={`/infra/clients/${instance.client_id}`} className={linkClass}>
                {instance.client?.name ?? `Cliente #${instance.client_id}`}
              </Link>
              <span className="text-muted-foreground">
                {' '}
                · {instance.software_product?.name ?? `Software #${instance.software_product_id}`}
              </span>
            </span>
            <Link to="/infra/backups" className="text-xs text-primary hover:underline">
              Configurar backup
            </Link>
          </li>
        ))}
      </AlertGroup>

      <AlertGroup
        id="alerts-stale"
        title="Deployments sem verificação recente"
        description="Nunca verificados ou sem verificação nos últimos 30 dias."
        icon={<Stethoscope className="h-4 w-4" aria-hidden="true" />}
        count={deployments_not_recently_checked.length}
        emptyTitle="Todos os deployments foram verificados recentemente"
      >
        {deployments_not_recently_checked.map((deployment) => {
          const instance = deployment.client_software
          return (
            <li
              key={deployment.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <span>
                <span className="capitalize">{deployment.component}</span>
                {deployment.port ? ` :${deployment.port}` : ''}
                {instance && (
                  <>
                    {': '}
                    <Link to={`/infra/clients/${instance.client_id}`} className={linkClass}>
                      {instance.client?.name ?? `Cliente #${instance.client_id}`}
                    </Link>
                    {instance.software_product && (
                      <span className="text-muted-foreground">
                        {' '}
                        · {instance.software_product.name}
                      </span>
                    )}
                  </>
                )}
                {' em '}
                <Link to={`/infra/machines/${deployment.machine_id}`} className={linkClass}>
                  {deployment.machine?.name ?? `Máquina #${deployment.machine_id}`}
                </Link>
              </span>
              <span className="text-muted-foreground">
                Última verificação:{' '}
                {deployment.last_checked_at ? formatDateTime(deployment.last_checked_at) : 'nunca'}
              </span>
            </li>
          )
        })}
      </AlertGroup>
    </div>
  )
}
