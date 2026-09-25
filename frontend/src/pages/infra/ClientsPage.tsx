import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteClient, listClients } from '@/api/infra'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { ClientFormDialog } from '@/components/infra/ClientFormDialog'
import { clientsKey, infraRootKey } from '@/components/infra/queryKeys'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
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
import { CLIENT_STATUS_LABEL } from '@/lib/labels'
import type { Client } from '@/types/infra'

export default function ClientsPage() {
  const queryClient = useQueryClient()
  const { canWrite } = useInfraPermissions()
  const [editing, setEditing] = useState<{ client: Client | null } | null>(null)
  const [toDelete, setToDelete] = useState<Client | null>(null)
  const { data, isLoading, isError } = useQuery({ queryKey: clientsKey, queryFn: listClients })

  if (isLoading) return <LoadingState />
  if (isError) return <ErrorState message="Não foi possível carregar os clientes." />

  const clients = data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        {canWrite && (
          <Button onClick={() => setEditing({ client: null })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo cliente
          </Button>
        )}
      </div>

      {clients.length === 0 ? (
        <EmptyState title="Ainda não existem clientes" />
      ) : (
        <Table aria-label="Clientes">
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Estado</TableHead>
              {canWrite && (
                <TableHead>
                  <span className="sr-only">Acções</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Link
                    to={`/infra/clients/${client.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {client.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {[client.contact_name, client.contact_email].filter(Boolean).join(' · ') ||
                    'Sem contacto'}
                </TableCell>
                <TableCell>
                  <Badge variant={client.status === 'active' ? 'success' : 'secondary'}>
                    {CLIENT_STATUS_LABEL[client.status] ?? client.status}
                  </Badge>
                </TableCell>
                {canWrite && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar cliente ${client.name}`}
                      onClick={() => setEditing({ client })}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label={`Apagar cliente ${client.name}`}
                      onClick={() => setToDelete(client)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {editing && (
        <ClientFormDialog
          key={editing.client?.id ?? 'new'}
          open
          client={editing.client}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
      <DeleteConfirmDialog
        key={toDelete?.id ?? 'none'}
        item={toDelete}
        onClose={() => setToDelete(null)}
        title={`Apagar o cliente “${toDelete?.name ?? ''}”?`}
        description="Os softwares associados a este cliente e respectivos deployments podem ser afectados."
        remove={(c) => deleteClient(c.id)}
        onDeleted={() => queryClient.invalidateQueries({ queryKey: infraRootKey })}
        errorFallback="Não foi possível apagar o cliente."
      />
    </div>
  )
}
