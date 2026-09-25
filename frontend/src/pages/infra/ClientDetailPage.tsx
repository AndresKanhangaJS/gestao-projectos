import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteClient, deleteClientSoftware, getClientOverview } from '@/api/infra'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { ClientFormDialog } from '@/components/infra/ClientFormDialog'
import {
  ClientSoftwareFormDialog,
  ClientSoftwareModulesDialog,
} from '@/components/infra/ClientSoftwareDialogs'
import { LinkedProjectsSection } from '@/components/infra/LinkedProjectsSection'
import { clientOverviewKey, infraRootKey } from '@/components/infra/queryKeys'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import { useInfraPermissions } from '@/hooks/useHasRole'
import { isForbidden } from '@/lib/errors'
import { EMPTY_VALUE, formatDate } from '@/lib/format'
import {
  CLIENT_SOFTWARE_STATUS_LABEL,
  CLIENT_STATUS_LABEL,
  DEPLOYMENT_COMPONENT_LABEL,
} from '@/lib/labels'
import type { ClientSoftware } from '@/types/infra'

type InstanceDialog =
  | { kind: 'form'; instance: ClientSoftware | null }
  | { kind: 'modules'; instance: ClientSoftware }
  | null

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const id = Number(clientId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { canWrite } = useInfraPermissions()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteClientOpen, setDeleteClientOpen] = useState(false)
  const [instanceDialog, setInstanceDialog] = useState<InstanceDialog>(null)
  const [instanceToDelete, setInstanceToDelete] = useState<ClientSoftware | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: clientOverviewKey(id),
    queryFn: () => getClientOverview(id),
  })

  if (isLoading) return <LoadingState />
  if (isError || !data) {
    return (
      <ErrorState
        message={
          isForbidden(error)
            ? 'Não tem acesso a este cliente.'
            : 'Não foi possível carregar o cliente.'
        }
      />
    )
  }

  const { client, software, projects } = data

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{client.name}</h1>
          <Badge variant={client.status === 'active' ? 'success' : 'secondary'}>
            {CLIENT_STATUS_LABEL[client.status] ?? client.status}
          </Badge>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Editar
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteClientOpen(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Apagar
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Pessoa</p>
            <p className={client.contact_name ? undefined : 'text-muted-foreground'}>
              {client.contact_name ?? EMPTY_VALUE}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className={client.contact_email ? undefined : 'text-muted-foreground'}>
              {client.contact_email ?? EMPTY_VALUE}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Telefone</p>
            <p className={client.contact_phone ? undefined : 'text-muted-foreground'}>
              {client.contact_phone ?? EMPTY_VALUE}
            </p>
          </div>
          {client.notes && (
            <p className="whitespace-pre-wrap text-muted-foreground sm:col-span-3">
              {client.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Softwares deste cliente</CardTitle>
          {canWrite && (
            <Button size="sm" onClick={() => setInstanceDialog({ kind: 'form', instance: null })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Associar software
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {software.length === 0 ? (
            <EmptyState title="Sem softwares associados" />
          ) : (
            software.map((cs) => {
              const name = cs.software_product?.name ?? `Software #${cs.software_product_id}`
              const activeModules = (cs.modules ?? []).filter((m) => m.active !== false)
              return (
                <div
                  key={cs.id}
                  className="flex flex-col gap-2 rounded-md border border-border p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/infra/software/${cs.software_product_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {name}
                      </Link>
                      <Badge>{CLIENT_SOFTWARE_STATUS_LABEL[cs.status] ?? cs.status}</Badge>
                      {cs.activated_at && (
                        <span className="text-xs text-muted-foreground">
                          desde {formatDate(cs.activated_at)}
                        </span>
                      )}
                    </div>
                    {canWrite && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setInstanceDialog({ kind: 'modules', instance: cs })}
                        >
                          <Boxes className="h-4 w-4" aria-hidden="true" />
                          Módulos
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Editar ${name}`}
                          onClick={() => setInstanceDialog({ kind: 'form', instance: cs })}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          aria-label={`Remover ${name} deste cliente`}
                          onClick={() => setInstanceToDelete(cs)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeModules.length ? (
                      activeModules.map((module) => (
                        <Badge key={module.id} variant="outline">
                          {module.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem módulos activos.</span>
                    )}
                  </div>
                  {cs.deployments && cs.deployments.length > 0 && (
                    <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {cs.deployments.map((d) => (
                        <li key={d.id}>
                          {DEPLOYMENT_COMPONENT_LABEL[d.component] ?? d.component}
                          {d.port ? ` :${d.port}` : ''} em{' '}
                          <Link
                            to={`/infra/machines/${d.machine_id}`}
                            className="text-primary hover:underline"
                          >
                            {d.machine?.name ?? `Máquina #${d.machine_id}`}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {cs.notes && <p className="text-xs text-muted-foreground">{cs.notes}</p>}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <LinkedProjectsSection
        projects={projects}
        description="Projectos de desenvolvimento ou suporte feitos para este cliente."
        emptyDescription="Para ligar um projecto a este cliente, edite o projecto e escolha o software e o cliente em “Relação com o cliente”."
      />

      {editOpen && <ClientFormDialog open client={client} onOpenChange={setEditOpen} />}
      {instanceDialog?.kind === 'form' && (
        <ClientSoftwareFormDialog
          key={instanceDialog.instance?.id ?? 'new'}
          clientId={client.id}
          instance={instanceDialog.instance}
          onClose={() => setInstanceDialog(null)}
        />
      )}
      {instanceDialog?.kind === 'modules' && (
        <ClientSoftwareModulesDialog
          key={instanceDialog.instance.id}
          instance={instanceDialog.instance}
          onClose={() => setInstanceDialog(null)}
        />
      )}
      <DeleteConfirmDialog
        key={instanceToDelete?.id ?? 'none'}
        item={instanceToDelete}
        onClose={() => setInstanceToDelete(null)}
        title="Remover software do cliente?"
        description="A instalação e a configuração de módulos deste cliente serão removidas."
        remove={(cs) => deleteClientSoftware(cs.id)}
        onDeleted={() => queryClient.invalidateQueries({ queryKey: infraRootKey })}
        errorFallback="Não foi possível remover o software. Verifique se ainda tem deployments."
      />
      <DeleteConfirmDialog
        item={deleteClientOpen ? client : null}
        onClose={() => setDeleteClientOpen(false)}
        title={`Apagar o cliente “${client.name}”?`}
        description="Esta acção não pode ser desfeita."
        remove={(c) => deleteClient(c.id)}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: infraRootKey })
          navigate('/infra/clients', { replace: true })
        }}
        errorFallback="Não foi possível apagar o cliente."
      />
    </div>
  )
}
