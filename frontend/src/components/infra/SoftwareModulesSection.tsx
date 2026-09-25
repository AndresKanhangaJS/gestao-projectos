import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createSoftwareModule,
  deleteSoftwareModule,
  listSoftwareModules,
  updateSoftwareModule,
} from '@/api/infra'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { FormField, FormServerError } from '@/components/ui/FormField'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Input } from '@/components/ui/Input'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Textarea } from '@/components/ui/Textarea'
import { EMPTY_VALUE } from '@/lib/format'
import { applyServerErrors, emptyToNull, fieldA11y } from '@/lib/forms'
import { HELP } from '@/lib/help'
import type { SoftwareModule } from '@/types/infra'
import { infraRootKey, softwareModulesKey } from './queryKeys'

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome é obrigatório.')
    .max(255, 'O nome não pode ter mais de 255 caracteres.'),
  description: z.string(),
})
type FormValues = z.infer<typeof schema>

function ModuleFormDialog({
  productId,
  module,
  onClose,
}: {
  productId: number
  module: SoftwareModule | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: module?.name ?? '', description: module?.description ?? '' },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = { name: values.name, description: emptyToNull(values.description) }
      return module
        ? updateSoftwareModule(module.id, payload)
        : createSoftwareModule(productId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: infraRootKey })
      onClose()
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['name', 'description'],
        fallback: 'Não foi possível guardar o módulo.',
      }),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{module ? 'Editar módulo' : 'Novo módulo'}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
        >
          <FormField id="mod-name" label="Nome" error={errors.name}>
            <Input {...fieldA11y('mod-name', errors.name)} {...register('name')} />
          </FormField>
          <FormField id="mod-description" label="Descrição" error={errors.description}>
            <Textarea
              {...fieldA11y('mod-description', errors.description)}
              {...register('description')}
            />
          </FormField>
          <FormServerError message={errors.root?.server?.message} />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'A guardar…' : 'Guardar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type EditState = { open: false } | { open: true; module: SoftwareModule | null }

/**
 * Módulos de um produto de software (listar; criar/editar/apagar só com permissão de escrita).
 * Tem `id="modulos"` para as ligações "Módulos" (lista de softwares, diálogo do cliente) virem cá ter.
 */
export function SoftwareModulesSection({
  productId,
  canWrite,
}: {
  productId: number
  canWrite: boolean
}) {
  const queryClient = useQueryClient()
  const [edit, setEdit] = useState<EditState>({ open: false })
  const [toDelete, setToDelete] = useState<SoftwareModule | null>(null)
  const query = useQuery({
    queryKey: softwareModulesKey(productId),
    queryFn: () => listSoftwareModules(productId),
  })

  const modules = query.data ?? []

  return (
    <Card
      id="modulos"
      aria-labelledby="software-modules-title"
      role="region"
      className="scroll-mt-4"
    >
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <CardTitle id="software-modules-title">Módulos</CardTitle>
            <InfoTooltip {...HELP.softwareModules} />
          </div>
          <CardDescription>
            Registe aqui os módulos deste software; depois active-os em cada cliente (botão
            “Módulos” na página do cliente).
          </CardDescription>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => setEdit({ open: true, module: null })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo módulo
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <LoadingState label="A carregar módulos…" />
        ) : query.isError ? (
          <ErrorState message="Não foi possível carregar os módulos." />
        ) : modules.length === 0 ? (
          <EmptyState
            title="Este software ainda não tem módulos"
            description={
              canWrite
                ? 'Registe os módulos (ex.: Matrículas, Propinas) para os poder activar por cliente.'
                : 'Peça a alguém da equipa de infra-estrutura para registar os módulos.'
            }
            action={
              canWrite ? (
                <Button size="sm" onClick={() => setEdit({ open: true, module: null })}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Registar primeiro módulo
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table aria-label="Módulos do produto">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                {canWrite && (
                  <TableHead>
                    <span className="sr-only">Acções</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((module) => (
                <TableRow key={module.id}>
                  <TableCell className="font-medium">{module.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {module.description ?? EMPTY_VALUE}
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar módulo ${module.name}`}
                        onClick={() => setEdit({ open: true, module })}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        aria-label={`Apagar módulo ${module.name}`}
                        onClick={() => setToDelete(module)}
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
      </CardContent>

      {edit.open && (
        <ModuleFormDialog
          key={edit.module?.id ?? 'new'}
          productId={productId}
          module={edit.module}
          onClose={() => setEdit({ open: false })}
        />
      )}
      <DeleteConfirmDialog
        key={toDelete?.id ?? 'none'}
        item={toDelete}
        onClose={() => setToDelete(null)}
        title={`Apagar o módulo “${toDelete?.name ?? ''}”?`}
        description="O módulo deixa de estar disponível para todos os clientes."
        remove={(m) => deleteSoftwareModule(m.id)}
        onDeleted={() => queryClient.invalidateQueries({ queryKey: infraRootKey })}
        errorFallback="Não foi possível apagar o módulo."
      />
    </Card>
  )
}
