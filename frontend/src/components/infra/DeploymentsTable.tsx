import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { deleteDeployment, deploymentLabel } from '@/api/infra'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { EMPTY_VALUE, formatDateTime } from '@/lib/format'
import { DATABASE_HOST_LOCALHOST } from '@/lib/infraOptions'
import {
  DEPLOYMENT_COMPONENT_LABEL,
  DEPLOYMENT_STATUS_LABEL,
  MACHINE_ENVIRONMENT_LABEL,
} from '@/lib/labels'
import type { Deployment } from '@/types/infra'
import { DeploymentFormDialog } from './DeploymentFormDialog'
import { infraRootKey } from './queryKeys'

const STATUS_VARIANT: Record<Deployment['status'], 'success' | 'warning' | 'secondary'> = {
  activo: 'success',
  testes: 'warning',
  parado: 'secondary',
}

/**
 * Base de dados do deployment em texto legível: "MySQL · levelschool em localhost (mesma máquina)".
 * Sem motor definido mostra "Sem base de dados".
 */
export function DatabaseSummary({ deployment: d }: { deployment: Deployment }) {
  if (!d.database_engine && !d.database_name && !d.database_host) {
    return <span className="text-muted-foreground">Sem base de dados</span>
  }
  const host =
    d.database_host === DATABASE_HOST_LOCALHOST.value
      ? 'localhost (mesma máquina)'
      : d.database_host
  return (
    <span className="flex flex-col text-sm">
      <span>{d.database_engine ?? 'Motor não definido'}</span>
      {(d.database_name || host) && (
        <span className="text-xs text-muted-foreground">
          {d.database_name && <span className="font-mono">{d.database_name}</span>}
          {d.database_name && host && ' em '}
          {host}
        </span>
      )}
    </span>
  )
}

/** Tabela de deployments com edição/remoção (quando `canWrite`). */
export function DeploymentsTable({
  deployments,
  canWrite,
  showMachine = true,
}: {
  deployments: Deployment[]
  canWrite: boolean
  showMachine?: boolean
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Deployment | null>(null)
  const [toDelete, setToDelete] = useState<Deployment | null>(null)

  return (
    <>
      <Table aria-label="Deployments">
        <TableHeader>
          <TableRow>
            {showMachine && <TableHead>Máquina</TableHead>}
            <TableHead>Cliente / software</TableHead>
            <TableHead>Componente</TableHead>
            <TableHead>Porta</TableHead>
            <TableHead>Stack</TableHead>
            <TableHead>Base de dados</TableHead>
            <TableHead>Ambiente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Verificado</TableHead>
            {canWrite && (
              <TableHead>
                <span className="sr-only">Acções</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {deployments.map((d) => {
            const instance = d.client_software
            return (
              <TableRow key={d.id}>
                {showMachine && (
                  <TableCell>
                    <Link
                      to={`/infra/machines/${d.machine_id}`}
                      className="text-primary hover:underline"
                    >
                      {d.machine?.name ?? `Máquina #${d.machine_id}`}
                    </Link>
                  </TableCell>
                )}
                <TableCell>
                  {instance ? (
                    <>
                      <Link
                        to={`/infra/clients/${instance.client_id}`}
                        className="text-primary hover:underline"
                      >
                        {instance.client?.name ?? `Cliente #${instance.client_id}`}
                      </Link>
                      {' / '}
                      <Link
                        to={`/infra/software/${instance.software_product_id}`}
                        className="text-primary hover:underline"
                      >
                        {instance.software_product?.name ??
                          `Software #${instance.software_product_id}`}
                      </Link>
                    </>
                  ) : (
                    `#${d.client_software_id}`
                  )}
                </TableCell>
                <TableCell>{DEPLOYMENT_COMPONENT_LABEL[d.component] ?? d.component}</TableCell>
                <TableCell className={d.port == null ? 'text-muted-foreground' : undefined}>
                  {d.port ?? EMPTY_VALUE}
                </TableCell>
                <TableCell className={d.stack ? undefined : 'text-muted-foreground'}>
                  {d.stack ?? EMPTY_VALUE}
                </TableCell>
                <TableCell>
                  <DatabaseSummary deployment={d} />
                </TableCell>
                <TableCell>
                  <Badge variant={d.environment_type === 'tradicional' ? 'warning' : 'secondary'}>
                    {MACHINE_ENVIRONMENT_LABEL[d.environment_type] ?? d.environment_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[d.status] ?? 'secondary'}>
                    {DEPLOYMENT_STATUS_LABEL[d.status] ?? d.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDateTime(d.last_checked_at)}
                </TableCell>
                {canWrite && (
                  <TableCell className="whitespace-nowrap text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar deployment ${deploymentLabel(d)}`}
                      onClick={() => setEditing(d)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label={`Apagar deployment ${deploymentLabel(d)}`}
                      onClick={() => setToDelete(d)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {editing && (
        <DeploymentFormDialog
          key={editing.id}
          deployment={editing}
          onClose={() => setEditing(null)}
        />
      )}
      <DeleteConfirmDialog
        key={toDelete?.id ?? 'none'}
        item={toDelete}
        onClose={() => setToDelete(null)}
        title="Apagar deployment?"
        description={
          toDelete
            ? `“${deploymentLabel(toDelete)}” será removido, com as suas credenciais e backups.`
            : undefined
        }
        remove={(d) => deleteDeployment(d.id)}
        onDeleted={() => queryClient.invalidateQueries({ queryKey: infraRootKey })}
        errorFallback="Não foi possível apagar o deployment."
      />
    </>
  )
}
