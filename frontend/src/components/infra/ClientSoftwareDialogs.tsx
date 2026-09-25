import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createClientSoftware,
  listSoftwareModules,
  listSoftwareProducts,
  syncClientSoftwareModules,
  updateClientSoftware,
} from '@/api/infra'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { FormField, FormServerError } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ComboboxField } from '@/components/ui/ComboboxField'
import { SelectField } from '@/components/ui/SelectField'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { mutationErrorMessage } from '@/lib/errors'
import { applyServerErrors, emptyToNull, fieldA11y } from '@/lib/forms'
import { CLIENT_SOFTWARE_STATUS_LABEL, optionKeys } from '@/lib/labels'
import type { ClientSoftware } from '@/types/infra'
import { infraRootKey, softwareModulesKey, softwareProductsKey } from './queryKeys'

const STATUSES = [
  'desenvolvimento',
  'desenvolvimento_local',
  'testes',
  'producao',
  'manutencao',
  'descontinuado',
] as const

const schema = z.object({
  software_product_id: z.string().min(1, 'Seleccione o produto de software.'),
  status: z.enum(STATUSES, { error: 'Seleccione o estado.' }),
  activated_at: z.string(),
  notes: z.string(),
})
type FormValues = z.infer<typeof schema>

/** Criar (instance = null) ou editar uma instalação cliente ↔ software. O produto não muda na edição. */
export function ClientSoftwareFormDialog({
  clientId,
  instance,
  onClose,
}: {
  clientId: number
  instance: ClientSoftware | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const productsQuery = useQuery({ queryKey: softwareProductsKey, queryFn: listSoftwareProducts })
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      software_product_id: instance ? String(instance.software_product_id) : '',
      status: instance?.status ?? 'desenvolvimento',
      activated_at: instance?.activated_at?.slice(0, 10) ?? '',
      notes: instance?.notes ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const common = {
        status: values.status,
        activated_at: values.activated_at || null,
        notes: emptyToNull(values.notes),
      }
      return instance
        ? updateClientSoftware(instance.id, common)
        : createClientSoftware({
            ...common,
            client_id: clientId,
            software_product_id: Number(values.software_product_id),
          })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: infraRootKey })
      onClose()
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['software_product_id', 'status', 'activated_at', 'notes'],
        fallback: 'Não foi possível guardar a instalação.',
      }),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {instance ? 'Editar software do cliente' : 'Associar software ao cliente'}
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
        >
          <FormField id="cs-product" label="Produto de software" error={errors.software_product_id}>
            <ComboboxField
              control={control}
              name="software_product_id"
              id="cs-product"
              disabled={instance != null || productsQuery.isLoading}
              invalid={!!errors.software_product_id}
              placeholder={productsQuery.isLoading ? 'A carregar…' : 'Pesquise o software…'}
              options={(productsQuery.data ?? []).map((p) => ({
                value: String(p.id),
                label: p.name,
                description: p.category ?? undefined,
              }))}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="cs-status" label="Estado" error={errors.status}>
              <SelectField
                control={control}
                name="status"
                id="cs-status"
                invalid={!!errors.status}
                options={optionKeys(CLIENT_SOFTWARE_STATUS_LABEL).map((k) => ({
                  value: k,
                  label: CLIENT_SOFTWARE_STATUS_LABEL[k],
                }))}
              />
            </FormField>
            <FormField id="cs-activated" label="Activado em" error={errors.activated_at}>
              <Input
                type="date"
                {...fieldA11y('cs-activated', errors.activated_at)}
                {...register('activated_at')}
              />
            </FormField>
          </div>
          <FormField id="cs-notes" label="Notas" error={errors.notes}>
            <Textarea {...fieldA11y('cs-notes', errors.notes)} {...register('notes')} />
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

/** Activar/desactivar os módulos do produto para esta instalação (sincroniza todos de uma vez). */
export function ClientSoftwareModulesDialog({
  instance,
  onClose,
  canWrite = true,
}: {
  instance: ClientSoftware
  onClose: () => void
  /** Quem pode registar módulos no software (mostra a ligação para o fazer). */
  canWrite?: boolean
}) {
  const queryClient = useQueryClient()
  const modulesQuery = useQuery({
    queryKey: softwareModulesKey(instance.software_product_id),
    queryFn: () => listSoftwareModules(instance.software_product_id),
  })
  const [active, setActive] = useState<Set<number>>(
    () => new Set((instance.modules ?? []).filter((m) => m.active !== false).map((m) => m.id)),
  )

  const mutation = useMutation({
    mutationFn: () =>
      syncClientSoftwareModules(
        instance.id,
        (modulesQuery.data ?? []).map((m) => ({
          software_module_id: m.id,
          active: active.has(m.id),
        })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: infraRootKey })
      onClose()
    },
  })

  function toggle(id: number, checked: boolean) {
    setActive((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const modules = modulesQuery.data ?? []

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Módulos activos</DialogTitle>
          <DialogDescription>
            Seleccione os módulos de {instance.software_product?.name ?? 'este software'} que o
            cliente utiliza.
          </DialogDescription>
        </DialogHeader>
        {modulesQuery.isLoading ? (
          <LoadingState label="A carregar módulos…" />
        ) : modulesQuery.isError ? (
          <ErrorState message="Não foi possível carregar os módulos." />
        ) : modules.length === 0 ? (
          <EmptyState
            title="Este software ainda não tem módulos registados"
            description="Os módulos registam-se uma vez no software e depois activam-se aqui, por cliente."
            action={
              canWrite ? (
                <Button asChild size="sm">
                  <Link
                    to={`/infra/software/${instance.software_product_id}#modulos`}
                    onClick={onClose}
                  >
                    Registar módulos deste software
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Módulos">
            {modules.map((module) => {
              const inputId = `cs-${instance.id}-module-${module.id}`
              return (
                <li key={module.id} className="flex items-center gap-2">
                  <Checkbox
                    id={inputId}
                    checked={active.has(module.id)}
                    onCheckedChange={(checked) => toggle(module.id, checked === true)}
                  />
                  <Label htmlFor={inputId} className="font-normal">
                    {module.name}
                  </Label>
                </li>
              )
            })}
          </ul>
        )}
        {mutation.isError && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {mutationErrorMessage(mutation.error, 'Não foi possível guardar os módulos.')}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={mutation.isPending || modules.length === 0}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'A guardar…' : 'Guardar módulos'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
