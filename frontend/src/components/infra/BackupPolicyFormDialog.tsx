import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createBackupPolicy, toTargetType, updateBackupPolicy } from '@/api/infra'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { mutationErrorMessage } from '@/lib/errors'
import { BACKUP_FREQUENCY_LABEL } from '@/lib/labels'
import type { BackupFrequency, BackupPolicy, PolymorphicTargetType } from '@/types/infra'

export interface BackupTargetOption {
  type: PolymorphicTargetType
  id: number
  label: string
}

const FREQUENCIES = Object.keys(BACKUP_FREQUENCY_LABEL) as BackupFrequency[]

const schema = z.object({
  backupable_type: z.enum(['machine', 'deployment'], { error: 'Seleccione o tipo de recurso.' }),
  backupable_id: z.string().min(1, 'Seleccione o recurso a proteger.'),
  frequency: z.enum(['diario', 'semanal', 'mensal'], { error: 'Seleccione a frequência.' }),
  retention_count: z
    .number({ error: 'Indique o número de cópias a reter.' })
    .int('A retenção tem de ser um número inteiro.')
    .min(1, 'A retenção tem de ser pelo menos 1.'),
  last_run_at: z.string(),
  next_run_at: z.string(),
})

type FormValues = z.infer<typeof schema>

/** ISO (UTC) → valor de `<input type="datetime-local">` na hora local. */
function toLocalInput(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Valor de `datetime-local` (hora local) → ISO 8601 com fuso, ou null. */
function toIso(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function defaultsFor(policy: BackupPolicy | null): FormValues {
  if (!policy) {
    return {
      backupable_type: 'machine',
      backupable_id: '',
      frequency: 'diario',
      retention_count: 7,
      last_run_at: '',
      next_run_at: '',
    }
  }
  return {
    backupable_type: toTargetType(policy.backupable_type) ?? 'machine',
    backupable_id: String(policy.backupable_id),
    frequency: policy.frequency,
    retention_count: policy.retention_count,
    last_run_at: toLocalInput(policy.last_run_at),
    next_run_at: toLocalInput(policy.next_run_at),
  }
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-sm text-destructive" role="alert">
      {message}
    </p>
  )
}

/**
 * Criação/edição de uma política de backup. Para editar, montar com `key={policy.id}`
 * para que os valores por omissão sejam recalculados.
 */
export function BackupPolicyFormDialog({
  open,
  onOpenChange,
  policy,
  targets,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` = criar nova política. */
  policy: BackupPolicy | null
  targets: BackupTargetOption[]
}) {
  const queryClient = useQueryClient()
  const isEdit = policy != null

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaultsFor(policy) })

  const selectedType = useWatch({ control, name: 'backupable_type' })
  const typeTargets = targets.filter((t) => t.type === selectedType)

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const common = {
        frequency: values.frequency,
        retention_count: values.retention_count,
        last_run_at: toIso(values.last_run_at),
        next_run_at: toIso(values.next_run_at),
      }
      return policy
        ? updateBackupPolicy(policy.id, common)
        : createBackupPolicy({
            ...common,
            backupable_type: values.backupable_type,
            backupable_id: Number(values.backupable_id),
          })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infra', 'backup-policies'] })
      queryClient.invalidateQueries({ queryKey: ['infra', 'alerts'] })
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar política de backup' : 'Nova política de backup'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'O recurso protegido não pode ser alterado — crie uma nova política se necessário.'
              : 'Associe a política a uma máquina ou a um deployment.'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bp-type">Tipo de recurso</Label>
              <Controller
                control={control}
                name="backupable_type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    disabled={isEdit}
                    onValueChange={(value) => {
                      field.onChange(value)
                      setValue('backupable_id', '')
                    }}
                  >
                    <SelectTrigger id="bp-type" onBlur={field.onBlur}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="machine">Máquina</SelectItem>
                      <SelectItem value="deployment">Deployment</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError id="bp-type-error" message={errors.backupable_type?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bp-target">Recurso</Label>
              <Controller
                control={control}
                name="backupable_id"
                render={({ field }) => (
                  <Select value={field.value} disabled={isEdit} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="bp-target"
                      onBlur={field.onBlur}
                      aria-invalid={!!errors.backupable_id}
                      aria-describedby={errors.backupable_id ? 'bp-target-error' : undefined}
                    >
                      <SelectValue placeholder="Seleccione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeTargets.map((target) => (
                        <SelectItem key={`${target.type}:${target.id}`} value={String(target.id)}>
                          {target.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError id="bp-target-error" message={errors.backupable_id?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bp-frequency">Frequência</Label>
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="bp-frequency" onBlur={field.onBlur}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((frequency) => (
                        <SelectItem key={frequency} value={frequency}>
                          {BACKUP_FREQUENCY_LABEL[frequency]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError id="bp-frequency-error" message={errors.frequency?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bp-retention">Retenção (nº de cópias)</Label>
              <Input
                id="bp-retention"
                type="number"
                min={1}
                step={1}
                aria-invalid={!!errors.retention_count}
                aria-describedby={errors.retention_count ? 'bp-retention-error' : undefined}
                {...register('retention_count', { valueAsNumber: true })}
              />
              <FieldError id="bp-retention-error" message={errors.retention_count?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bp-last-run">Última execução</Label>
              <Input id="bp-last-run" type="datetime-local" {...register('last_run_at')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bp-next-run">Próxima execução</Label>
              <Input id="bp-next-run" type="datetime-local" {...register('next_run_at')} />
            </div>
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive" role="alert">
              {mutationErrorMessage(mutation.error, 'Não foi possível guardar a política de backup.')}
            </p>
          )}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'A guardar…' : isEdit ? 'Guardar alterações' : 'Criar política'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
