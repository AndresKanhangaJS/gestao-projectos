import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteMachine, deploymentLabel, getMachineOverview } from '@/api/infra'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { CredentialsSection, type CredentialTarget } from '@/components/infra/CredentialsSection'
import { DeploymentFormDialog } from '@/components/infra/DeploymentFormDialog'
import { DeploymentsTable } from '@/components/infra/DeploymentsTable'
import { MachineFormDialog } from '@/components/infra/MachineFormDialog'
import { infraRootKey, machineOverviewKey } from '@/components/infra/queryKeys'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import { useInfraPermissions } from '@/hooks/useHasRole'
import { isForbidden } from '@/lib/errors'
import { MACHINE_ACCESS_TYPE_LABEL } from '@/lib/labels'
import type { Deployment, Machine } from '@/types/infra'
import { EnvironmentBadge } from '@/components/infra/EnvironmentBadge'

function credentialTargets(machine: Machine, deployments: Deployment[]): CredentialTarget[] {
  return [
    { type: 'machine', id: machine.id, label: `Máquina ${machine.name}` },
    ...deployments.map<CredentialTarget>((d) => ({
      type: 'deployment',
      id: d.id,
      label: `Deployment ${deploymentLabel(d)}`,
    })),
  ]
}

export default function MachineDetailPage() {
  const { machineId } = useParams<{ machineId: string }>()
  const id = Number(machineId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { canWrite, canManageCredentials, canViewAccessLogs } = useInfraPermissions()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [creatingDeployment, setCreatingDeployment] = useState(false)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: machineOverviewKey(id),
    queryFn: () => getMachineOverview(id),
  })

  if (isLoading) return <LoadingState />
  if (isError || !data) {
    return <ErrorState message={isForbidden(error) ? 'Não tem acesso a esta máquina.' : 'Não foi possível carregar a máquina.'} />
  }

  const { machine, deployments } = data

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{machine.name}</h1>
          <EnvironmentBadge environment={machine.environment} />
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Editar
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Apagar
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">IP</p>
            <p>{machine.ip_address ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">SO</p>
            <p>{machine.operating_system ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Acesso</p>
            <p>{machine.access_type ? MACHINE_ACCESS_TYPE_LABEL[machine.access_type] : '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Utilizador</p>
            <p>{machine.access_user ?? '—'}</p>
          </div>
          {machine.notes && <p className="col-span-full whitespace-pre-wrap text-muted-foreground">{machine.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Deployments nesta máquina</CardTitle>
          {canWrite && (
            <Button size="sm" onClick={() => setCreatingDeployment(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Novo deployment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {deployments.length ? (
            <DeploymentsTable deployments={deployments} canWrite={canWrite} showMachine={false} />
          ) : (
            <EmptyState title="Sem deployments registados nesta máquina" />
          )}
        </CardContent>
      </Card>

      {canManageCredentials && (
        <CredentialsSection
          machineId={machine.id}
          title="Credenciais da máquina e dos seus deployments"
          targets={credentialTargets(machine, deployments)}
          canManage={canManageCredentials}
          canViewAccessLogs={canViewAccessLogs}
        />
      )}

      {editOpen && <MachineFormDialog open machine={machine} onOpenChange={setEditOpen} />}
      {creatingDeployment && (
        <DeploymentFormDialog
          deployment={null}
          defaultMachineId={machine.id}
          onClose={() => setCreatingDeployment(false)}
        />
      )}
      <DeleteConfirmDialog
        item={deleteOpen ? machine : null}
        onClose={() => setDeleteOpen(false)}
        title={`Apagar a máquina “${machine.name}”?`}
        description="Deployments, credenciais e políticas de backup associados podem ser afectados."
        remove={(m) => deleteMachine(m.id)}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: infraRootKey })
          navigate('/infra/machines', { replace: true })
        }}
        errorFallback="Não foi possível apagar a máquina."
      />
    </div>
  )
}
