import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { deleteSoftwareProduct, getSoftwareProductOverview } from '@/api/infra'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { LinkedProjectsSection } from '@/components/infra/LinkedProjectsSection'
import { SoftwareModulesSection } from '@/components/infra/SoftwareModulesSection'
import { SoftwareProductFormDialog } from '@/components/infra/SoftwareProductFormDialog'
import { infraRootKey, softwareProductOverviewKey } from '@/components/infra/queryKeys'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { useInfraPermissions } from '@/hooks/useHasRole'
import { isForbidden } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { CLIENT_SOFTWARE_STATUS_LABEL, DEPLOYMENT_COMPONENT_LABEL } from '@/lib/labels'

/** Vista "por Software": em que clientes está instalado, em que máquinas e portas. */
export default function SoftwareProductDetailPage() {
  const { productId } = useParams<{ productId: string }>()
  const id = Number(productId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { canWrite } = useInfraPermissions()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { hash } = useLocation()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: softwareProductOverviewKey(id),
    queryFn: () => getSoftwareProductOverview(id),
  })

  // Ligações "…#modulos" (lista de softwares, diálogo do cliente) levam directamente aos módulos.
  const loaded = data != null
  useEffect(() => {
    if (loaded && hash === '#modulos') document.getElementById('modulos')?.scrollIntoView?.()
  }, [hash, loaded])

  if (isLoading) return <LoadingState />
  if (isError || !data) {
    return (
      <ErrorState
        message={
          isForbidden(error)
            ? 'Não tem acesso a este software.'
            : 'Não foi possível carregar o software.'
        }
      />
    )
  }

  const { software_product: product, instances, projects } = data

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{product.name}</h1>
          {product.category && <p className="text-sm text-muted-foreground">{product.category}</p>}
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

      {product.description && <p className="whitespace-pre-wrap text-sm">{product.description}</p>}

      <SoftwareModulesSection productId={product.id} canWrite={canWrite} />

      <Card>
        <CardHeader>
          <CardTitle>Instalações em clientes</CardTitle>
          <CardDescription>
            {instances.length} cliente(s) com este software. Para associar um cliente, use a página
            do cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <EmptyState title="Nenhum cliente usa este software" />
          ) : (
            <Table aria-label="Clientes com este software">
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Activado em</TableHead>
                  <TableHead>Deployments (máquina : porta)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.map((instance) => (
                  <TableRow key={instance.id}>
                    <TableCell>
                      <Link
                        to={`/infra/clients/${instance.client_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {instance.client?.name ?? `Cliente #${instance.client_id}`}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge>
                        {CLIENT_SOFTWARE_STATUS_LABEL[instance.status] ?? instance.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(instance.activated_at)}
                    </TableCell>
                    <TableCell>
                      {instance.deployments?.length ? (
                        <ul className="flex flex-col gap-0.5 text-sm">
                          {instance.deployments.map((d) => (
                            <li key={d.id}>
                              <Link
                                to={`/infra/machines/${d.machine_id}`}
                                className="text-primary hover:underline"
                              >
                                {d.machine?.name ?? `Máquina #${d.machine_id}`}
                              </Link>
                              {d.port ? ` : ${d.port}` : ''}{' '}
                              <span className="text-muted-foreground">
                                ({DEPLOYMENT_COMPONENT_LABEL[d.component] ?? d.component})
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">Sem deployments</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LinkedProjectsSection
        projects={projects}
        description="Projectos sobre este software, para um cliente ou internos do produto."
        emptyDescription="Para ligar um projecto a este software, edite o projecto e escolha-o em “Relação com o cliente”."
      />

      {editOpen && <SoftwareProductFormDialog open product={product} onOpenChange={setEditOpen} />}
      <DeleteConfirmDialog
        item={deleteOpen ? product : null}
        onClose={() => setDeleteOpen(false)}
        title={`Apagar “${product.name}”?`}
        description="As instalações deste software em clientes podem ser afectadas."
        remove={(p) => deleteSoftwareProduct(p.id)}
        onDeleted={() => {
          queryClient.invalidateQueries({ queryKey: infraRootKey })
          navigate('/infra/software', { replace: true })
        }}
        errorFallback="Não foi possível apagar o produto."
      />
    </div>
  )
}
