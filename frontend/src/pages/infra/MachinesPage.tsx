import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteMachine, listMachines } from '@/api/infra'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { MachineFormDialog } from '@/components/infra/MachineFormDialog'
import { infraRootKey, machinesKey } from '@/components/infra/queryKeys'
import { EnvironmentBadge } from '@/components/infra/EnvironmentBadge'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { useInfraPermissions } from '@/hooks/useHasRole'
import type { Machine } from '@/types/infra'

export default function MachinesPage() {
  const queryClient = useQueryClient()
  const { canWrite } = useInfraPermissions()
  const [editing, setEditing] = useState<{ machine: Machine | null } | null>(null)
  const [toDelete, setToDelete] = useState<Machine | null>(null)
  const { data, isLoading, isError } = useQuery({ queryKey: machinesKey, queryFn: listMachines })

  if (isLoading) return <LoadingState />
  if (isError) return <ErrorState message="Não foi possível carregar as máquinas." />

  const machines = data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Máquinas / Servidores</h1>
        {canWrite && (
          <Button onClick={() => setEditing({ machine: null })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova máquina
          </Button>
        )}
      </div>

      {machines.length === 0 ? (
        <EmptyState title="Ainda não existem máquinas registadas" />
      ) : (
        <Table aria-label="Máquinas">
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>SO</TableHead>
              <TableHead>Ambiente</TableHead>
              {canWrite && (
                <TableHead>
                  <span className="sr-only">Acções</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.map((machine) => (
              <TableRow key={machine.id}>
                <TableCell>
                  <Link to={`/infra/machines/${machine.id}`} className="font-medium text-primary hover:underline">
                    {machine.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{machine.ip_address ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{machine.operating_system ?? '—'}</TableCell>
                <TableCell>
                  <EnvironmentBadge environment={machine.environment} />
                </TableCell>
                {canWrite && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar máquina ${machine.name}`}
                      onClick={() => setEditing({ machine })}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label={`Apagar máquina ${machine.name}`}
                      onClick={() => setToDelete(machine)}
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
        <MachineFormDialog
          key={editing.machine?.id ?? 'new'}
          open
          machine={editing.machine}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
      <DeleteConfirmDialog
        key={toDelete?.id ?? 'none'}
        item={toDelete}
        onClose={() => setToDelete(null)}
        title={`Apagar a máquina “${toDelete?.name ?? ''}”?`}
        description="Deployments, credenciais e políticas de backup associados podem ser afectados."
        remove={(m) => deleteMachine(m.id)}
        onDeleted={() => queryClient.invalidateQueries({ queryKey: infraRootKey })}
        errorFallback="Não foi possível apagar a máquina."
      />
    </div>
  )
}
