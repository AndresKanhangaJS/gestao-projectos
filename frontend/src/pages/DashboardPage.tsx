import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { getDashboard } from '@/api/dashboard'
import { getInfraAlerts } from '@/api/infra'
import { useInfraPermissions } from '@/hooks/useHasRole'
import { isForbidden } from '@/lib/errors'
import { PRIORITY_LABEL, TASK_TYPE_LABEL } from '@/lib/labels'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Spinner'
import type { DashboardData } from '@/types/projects'

function labelFor(record: Record<string, string>, key: string): string {
  return record[key] ?? key
}

/** `by_status` pode vir como mapa `{ estado: total }` ou lista `{ name, total }[]`. */
function statusRows(byStatus: DashboardData['by_status']): { label: string; total: number }[] {
  if (!byStatus) return []
  if (Array.isArray(byStatus)) return byStatus.map((row) => ({ label: row.name, total: row.total }))
  return Object.entries(byStatus).map(([label, total]) => ({ label, total }))
}

function CountList({ rows, emptyTitle }: { rows: { label: string; total: number }[]; emptyTitle: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{emptyTitle}</p>
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.label} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{row.label}</span>
          <span className="font-medium">{row.total}</span>
        </li>
      ))}
    </ul>
  )
}

/** Resumo dos alertas de infra (independente do dashboard de projectos: falhas aqui não bloqueiam a página). */
function InfraAlertsSummary() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['infra', 'alerts'],
    queryFn: getInfraAlerts,
    retry: (count, err) => !isForbidden(err) && count < 2,
  })

  if (isError && isForbidden(error)) return null

  const rows = data
    ? [
        { label: 'Máquinas em ambiente Tradicional', total: data.machines_tradicional.length },
        { label: 'Softwares sem backup', total: data.software_without_backup.length },
        { label: 'Deployments sem verificação recente', total: data.deployments_not_recently_checked.length },
      ]
    : []
  const total = rows.reduce((sum, row) => sum + row.total, 0)

  return (
    <Card role="region" aria-labelledby="dashboard-infra-alerts">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle id="dashboard-infra-alerts" className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
          Alertas de infra-estrutura
        </CardTitle>
        <Link to="/infra/alerts" className="text-sm text-primary hover:underline">
          Ver alertas{data ? ` (${total})` : ''}
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingState label="A carregar alertas…" />
        ) : isError || !data ? (
          <ErrorState message="Não foi possível carregar os alertas." />
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={row.total > 0 ? 'font-medium text-warning' : 'font-medium'}>{row.total}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { canView: canViewInfra } = useInfraPermissions()
  const { data, isLoading, isError } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })

  if (isLoading) return <LoadingState label="A carregar dashboard…" />
  if (isError || !data) return <ErrorState />

  const urgent = data.tasks_by_priority.urgent ?? 0
  const byStatus = statusRows(data.by_status)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Projectos</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{data.projects_count}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tarefas</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{data.tasks_count}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tarefas atrasadas</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-destructive">{data.overdue_tasks_count}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Urgentes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-warning">{urgent}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tarefas por prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <CountList
              emptyTitle="Sem tarefas."
              rows={Object.entries(data.tasks_by_priority).map(([key, total]) => ({
                label: labelFor(PRIORITY_LABEL, key),
                total,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarefas por tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <CountList
              emptyTitle="Sem tarefas."
              rows={Object.entries(data.tasks_by_type).map(([key, total]) => ({
                label: labelFor(TASK_TYPE_LABEL, key),
                total,
              }))}
            />
          </CardContent>
        </Card>

        {byStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tarefas por estado</CardTitle>
            </CardHeader>
            <CardContent>
              <CountList rows={byStatus} emptyTitle="Sem tarefas." />
            </CardContent>
          </Card>
        )}
      </div>

      {canViewInfra && <InfraAlertsSummary />}

      <Card>
        <CardHeader>
          <CardTitle>Carga por responsável</CardTitle>
        </CardHeader>
        <CardContent>
          {data.tasks_per_assignee.length === 0 ? (
            <EmptyState title="Ainda não há tarefas atribuídas" />
          ) : (
            <CountList
              emptyTitle=""
              rows={data.tasks_per_assignee.map((row) => ({ label: row.name, total: row.total }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
