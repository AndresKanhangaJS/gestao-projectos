import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createDeployment, listClientSoftware, listMachines, listSoftwareModules, updateDeployment } from '@/api/infra'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { FormField, FormServerError } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { SelectField } from '@/components/ui/SelectField'
import { Textarea } from '@/components/ui/Textarea'
import { applyServerErrors, emptyToNull, fieldA11y } from '@/lib/forms'
import {
  DEPLOYMENT_COMPONENT_LABEL,
  DEPLOYMENT_STATUS_LABEL,
  MACHINE_ENVIRONMENT_LABEL,
  optionKeys,
} from '@/lib/labels'
import type { Deployment } from '@/types/infra'
import { clientSoftwareKey, infraRootKey, machinesKey, softwareModulesKey } from './queryKeys'

const schema = z.object({
  client_software_id: z.string().min(1, 'Seleccione a instalação cliente/software.'),
  software_module_id: z.string(),
  machine_id: z.string().min(1, 'Seleccione a máquina.'),
  component: z.enum(['frontend', 'backend', 'full', 'worker'], { error: 'Seleccione o componente.' }),
  port: z
    .string()
    .regex(/^\d*$/, 'A porta tem de ser um número.')
    .refine((v) => v === '' || (Number(v) >= 1 && Number(v) <= 65535), 'A porta tem de estar entre 1 e 65535.'),
  stack: z.string().max(255, 'Máximo de 255 caracteres.'),
  database_engine: z.string().max(255, 'Máximo de 255 caracteres.'),
  database_name: z.string().max(255, 'Máximo de 255 caracteres.'),
  database_host: z.string().max(255, 'Máximo de 255 caracteres.'),
  environment_type: z.enum(['docker', 'tradicional'], { error: 'Seleccione o ambiente.' }),
  start_command: z.string(),
  status: z.enum(['activo', 'testes', 'parado'], { error: 'Seleccione o estado.' }),
  last_checked_at: z.string(),
})
type FormValues = z.infer<typeof schema>
const FIELDS = Object.keys(schema.shape) as (keyof FormValues)[]

/** ISO → valor de `<input type="datetime-local">` (hora local). */
function toLocalInput(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIso(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Criar (deployment = null) ou editar um deployment. `defaultMachineId` pré-selecciona a máquina. */
export function DeploymentFormDialog({
  deployment,
  defaultMachineId,
  onClose,
}: {
  deployment: Deployment | null
  defaultMachineId?: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const instancesQuery = useQuery({ queryKey: clientSoftwareKey, queryFn: listClientSoftware })
  const machinesQuery = useQuery({ queryKey: machinesKey, queryFn: listMachines })

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_software_id: deployment ? String(deployment.client_software_id) : '',
      software_module_id: deployment?.software_module_id != null ? String(deployment.software_module_id) : '',
      machine_id: deployment
        ? String(deployment.machine_id)
        : defaultMachineId != null
          ? String(defaultMachineId)
          : '',
      component: deployment?.component ?? 'full',
      port: deployment?.port != null ? String(deployment.port) : '',
      stack: deployment?.stack ?? '',
      database_engine: deployment?.database_engine ?? '',
      database_name: deployment?.database_name ?? '',
      database_host: deployment?.database_host ?? '',
      environment_type: deployment?.environment_type ?? 'docker',
      start_command: deployment?.start_command ?? '',
      status: deployment?.status ?? 'activo',
      last_checked_at: toLocalInput(deployment?.last_checked_at),
    },
  })

  const instanceId = useWatch({ control, name: 'client_software_id' })
  const instance = (instancesQuery.data ?? []).find((i) => String(i.id) === instanceId)
  const productId = instance?.software_product_id
  const modulesQuery = useQuery({
    queryKey: softwareModulesKey(productId ?? 0),
    queryFn: () => listSoftwareModules(productId as number),
    enabled: productId != null,
  })

  const mutation = useMutation({
    mutationFn: (v: FormValues) => {
      const payload = {
        client_software_id: Number(v.client_software_id),
        software_module_id: v.software_module_id ? Number(v.software_module_id) : null,
        machine_id: Number(v.machine_id),
        component: v.component,
        port: v.port ? Number(v.port) : null,
        stack: emptyToNull(v.stack),
        database_engine: emptyToNull(v.database_engine),
        database_name: emptyToNull(v.database_name),
        database_host: emptyToNull(v.database_host),
        environment_type: v.environment_type,
        start_command: emptyToNull(v.start_command),
        status: v.status,
        last_checked_at: toIso(v.last_checked_at),
      }
      return deployment ? updateDeployment(deployment.id, payload) : createDeployment(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: infraRootKey })
      onClose()
    },
    onError: (error) =>
      applyServerErrors(error, setError, { fields: FIELDS, fallback: 'Não foi possível guardar o deployment.' }),
  })

  const instanceOptions = (instancesQuery.data ?? []).map((i) => ({
    value: String(i.id),
    label: `${i.client?.name ?? `Cliente #${i.client_id}`} / ${i.software_product?.name ?? `Software #${i.software_product_id}`}`,
  }))

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deployment ? 'Editar deployment' : 'Novo deployment'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="d-instance" label="Cliente / software" error={errors.client_software_id}>
              <SelectField
                control={control}
                name="client_software_id"
                id="d-instance"
                invalid={!!errors.client_software_id}
                placeholder={instancesQuery.isLoading ? 'A carregar…' : 'Seleccione…'}
                options={instanceOptions}
                onValueChange={() => setValue('software_module_id', '')}
              />
            </FormField>
            <FormField id="d-module" label="Módulo (opcional)" error={errors.software_module_id}>
              <SelectField
                control={control}
                name="software_module_id"
                id="d-module"
                emptyLabel="Nenhum"
                disabled={productId == null}
                invalid={!!errors.software_module_id}
                options={(modulesQuery.data ?? []).map((m) => ({ value: String(m.id), label: m.name }))}
              />
            </FormField>
            <FormField id="d-machine" label="Máquina" error={errors.machine_id}>
              <SelectField
                control={control}
                name="machine_id"
                id="d-machine"
                invalid={!!errors.machine_id}
                placeholder={machinesQuery.isLoading ? 'A carregar…' : 'Seleccione…'}
                options={(machinesQuery.data ?? []).map((m) => ({
                  value: String(m.id),
                  label: m.ip_address ? `${m.name} (${m.ip_address})` : m.name,
                }))}
              />
            </FormField>
            <FormField id="d-component" label="Componente" error={errors.component}>
              <SelectField
                control={control}
                name="component"
                id="d-component"
                invalid={!!errors.component}
                options={optionKeys(DEPLOYMENT_COMPONENT_LABEL).map((k) => ({
                  value: k,
                  label: DEPLOYMENT_COMPONENT_LABEL[k],
                }))}
              />
            </FormField>
            <FormField id="d-port" label="Porta" error={errors.port}>
              <Input inputMode="numeric" {...fieldA11y('d-port', errors.port)} {...register('port')} />
            </FormField>
            <FormField id="d-stack" label="Stack" error={errors.stack}>
              <Input placeholder="Laravel + React" {...fieldA11y('d-stack', errors.stack)} {...register('stack')} />
            </FormField>
            <FormField id="d-env" label="Ambiente" error={errors.environment_type}>
              <SelectField
                control={control}
                name="environment_type"
                id="d-env"
                invalid={!!errors.environment_type}
                options={optionKeys(MACHINE_ENVIRONMENT_LABEL).map((k) => ({
                  value: k,
                  label: MACHINE_ENVIRONMENT_LABEL[k],
                }))}
              />
            </FormField>
            <FormField id="d-status" label="Estado" error={errors.status}>
              <SelectField
                control={control}
                name="status"
                id="d-status"
                invalid={!!errors.status}
                options={optionKeys(DEPLOYMENT_STATUS_LABEL).map((k) => ({
                  value: k,
                  label: DEPLOYMENT_STATUS_LABEL[k],
                }))}
              />
            </FormField>
            <FormField id="d-db-engine" label="Motor de base de dados" error={errors.database_engine}>
              <Input {...fieldA11y('d-db-engine', errors.database_engine)} {...register('database_engine')} />
            </FormField>
            <FormField id="d-db-name" label="Nome da base de dados" error={errors.database_name}>
              <Input {...fieldA11y('d-db-name', errors.database_name)} {...register('database_name')} />
            </FormField>
            <FormField id="d-db-host" label="Host da base de dados" error={errors.database_host}>
              <Input {...fieldA11y('d-db-host', errors.database_host)} {...register('database_host')} />
            </FormField>
            <FormField id="d-checked" label="Última verificação" error={errors.last_checked_at}>
              <Input
                type="datetime-local"
                {...fieldA11y('d-checked', errors.last_checked_at)}
                {...register('last_checked_at')}
              />
            </FormField>
          </div>
          <FormField id="d-start" label="Comando de arranque" error={errors.start_command}>
            <Textarea
              className="font-mono text-xs"
              {...fieldA11y('d-start', errors.start_command)}
              {...register('start_command')}
            />
          </FormField>
          <FormServerError message={errors.root?.server?.message} />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'A guardar…' : deployment ? 'Guardar alterações' : 'Criar deployment'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
