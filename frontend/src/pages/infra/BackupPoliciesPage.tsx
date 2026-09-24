import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { deploymentLabel, listBackupPolicies, listDeployments, listMachines, toTargetType } from '@/api/infra'
import { BackupPolicyFormDialog, type BackupTargetOption } from '@/components/infra/BackupPolicyFormDialog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useInfraPermissions } from '@/hooks/useHasRole'
import { isForbidden } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { BACKUP_FREQUENCY_LABEL } from '@/lib/labels'
import type { BackupPolicy } from '@/types/infra'

type DialogState = { open: false } | { open: true; policy: BackupPolicy | null }

export default function BackupPoliciesPage() {
  const [dialog, setDialog] = useState<DialogState>({ open: false })
  const { canWrite } = useInfraPermissions()

  const policiesQuery = useQuery({ queryKey: ['infra', 'backup-policies'], queryFn: () => listBackupPolicies() })
  const machinesQuery = useQuery({ queryKey: ['infra', 'machines'], queryFn: listMachines })
  const deploymentsQuery = useQuery({ queryKey: ['infra', 'deployments'], queryFn: () => listDeployments() })

  const targets = useMemo<BackupTargetOption[]>(() => {
    const machines = machinesQuery.data ?? []
    const machinesById = new Map(machines.map((m) => [m.id, m]))
    return [
      ...machines.map<BackupTargetOption>((m) => ({ type: 'machine', id: m.id, label: m.name })),
      ...(deploymentsQuery.data ?? []).map<BackupTargetOption>((d) => ({
        type: 'deployment',
        id: d.id,
        label: deploymentLabel(d, {
          machineName: d.machine?.name ?? machinesById.get(d.machine_id)?.name ?? `Máquina #${d.machine_id}`,
        }),
      })),
    ]
  }, [machinesQuery.data, deploymentsQuery.data])

  const targetLabel = useMemo(() => {
    const byKey = new Map(targets.map((t) => [`${t.type}:${t.id}`, t.label]))
    return (policy: BackupPolicy) => {
      const type = toTargetType(policy.backupable_type)
      return byKey.get(`${type}:${policy.backupable_id}`) ?? `#${policy.backupable_id}`
    }
  }, [targets])

  if (policiesQuery.isLoading || machinesQuery.isLoading || deploymentsQuery.isLoading) {
    return <LoadingState label="A carregar políticas de backup…" />
  }
  if (policiesQuery.isError || machinesQuery.isError || deploymentsQuery.isError) {
    const error = policiesQuery.error ?? machinesQuery.error ?? deploymentsQuery.error
    return (
      <ErrorState
        message={
          isForbidden(error)
            ? 'Não tem permissão para consultar as políticas de backup.'
            : 'Não foi possível carregar as políticas de backup.'
        }
      />
    )
  }

  const policies = policiesQuery.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Políticas de backup</h1>
        {canWrite && (
          <Button onClick={() => setDialog({ open: true, policy: null })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova política
          </Button>
        )}
      </div>

      {policies.length === 0 ? (
        <EmptyState
          title="Ainda não existem políticas de backup"
          description="Os softwares sem backup aparecem na página de Alertas."
        />
      ) : (
        <Table aria-label="Políticas de backup">
          <TableHeader>
            <TableRow>
              <TableHead>Recurso</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Frequência</TableHead>
              <TableHead>Retenção</TableHead>
              <TableHead>Última execução</TableHead>
              <TableHead>Próxima execução</TableHead>
              <TableHead>
                <span className="sr-only">Acções</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((policy) => {
              const type = toTargetType(policy.backupable_type)
              const label = targetLabel(policy)
              return (
                <TableRow key={policy.id}>
                  <TableCell>
                    {type === 'machine' ? (
                      <Link
                        to={`/infra/machines/${policy.backupable_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {label}
                      </Link>
                    ) : (
                      <span className="font-medium">{label}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{type === 'deployment' ? 'Deployment' : 'Máquina'}</Badge>
                  </TableCell>
                  <TableCell>{BACKUP_FREQUENCY_LABEL[policy.frequency] ?? policy.frequency}</TableCell>
                  <TableCell>{policy.retention_count} cópia(s)</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(policy.last_run_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(policy.next_run_at)}</TableCell>
                  <TableCell className="text-right">
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar política de backup de ${label}`}
                        onClick={() => setDialog({ open: true, policy })}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {dialog.open && (
        <BackupPolicyFormDialog
          key={dialog.policy?.id ?? 'new'}
          open
          onOpenChange={(open) => !open && setDialog({ open: false })}
          policy={dialog.policy}
          targets={targets}
        />
      )}
    </div>
  )
}
