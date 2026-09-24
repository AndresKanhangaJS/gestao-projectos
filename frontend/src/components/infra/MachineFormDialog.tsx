import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createMachine, updateMachine } from '@/api/infra'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { FormField, FormServerError } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { SelectField } from '@/components/ui/SelectField'
import { Textarea } from '@/components/ui/Textarea'
import { applyServerErrors, emptyToNull, fieldA11y } from '@/lib/forms'
import { MACHINE_ACCESS_TYPE_LABEL, MACHINE_ENVIRONMENT_LABEL, optionKeys } from '@/lib/labels'
import type { Machine, MachineAccessType } from '@/types/infra'
import { infraRootKey } from './queryKeys'

const schema = z.object({
  name: z.string().trim().min(1, 'O nome é obrigatório.').max(255, 'O nome não pode ter mais de 255 caracteres.'),
  ip_address: z.union([z.literal(''), z.ipv4('Endereço IP inválido.'), z.ipv6('Endereço IP inválido.')]),
  operating_system: z.string().max(255, 'Máximo de 255 caracteres.'),
  access_type: z.union([z.literal(''), z.enum(['ssh', 'rdp', 'web'])]),
  access_user: z.string().max(255, 'Máximo de 255 caracteres.'),
  environment: z.enum(['docker', 'tradicional'], { error: 'Seleccione o ambiente.' }),
  notes: z.string(),
})
type FormValues = z.infer<typeof schema>
const FIELDS = ['name', 'ip_address', 'operating_system', 'access_type', 'access_user', 'environment', 'notes'] as const

export function MachineFormDialog({
  machine,
  open,
  onOpenChange,
}: {
  machine: Machine | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: machine?.name ?? '',
      ip_address: machine?.ip_address ?? '',
      operating_system: machine?.operating_system ?? '',
      access_type: machine?.access_type ?? '',
      access_user: machine?.access_user ?? '',
      environment: machine?.environment ?? 'docker',
      notes: machine?.notes ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        ip_address: emptyToNull(values.ip_address),
        operating_system: emptyToNull(values.operating_system),
        access_type: (values.access_type || null) as MachineAccessType | null,
        access_user: emptyToNull(values.access_user),
        environment: values.environment,
        notes: emptyToNull(values.notes),
      }
      return machine ? updateMachine(machine.id, payload) : createMachine(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: infraRootKey })
      onOpenChange(false)
    },
    onError: (error) =>
      applyServerErrors(error, setError, { fields: FIELDS, fallback: 'Não foi possível guardar a máquina.' }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{machine ? 'Editar máquina' : 'Nova máquina'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="m-name" label="Nome" error={errors.name}>
              <Input placeholder="Máquina 32" {...fieldA11y('m-name', errors.name)} {...register('name')} />
            </FormField>
            <FormField id="m-ip" label="IP" error={errors.ip_address}>
              <Input placeholder="10.10.10.32" {...fieldA11y('m-ip', errors.ip_address)} {...register('ip_address')} />
            </FormField>
            <FormField id="m-os" label="Sistema operativo" error={errors.operating_system}>
              <Input {...fieldA11y('m-os', errors.operating_system)} {...register('operating_system')} />
            </FormField>
            <FormField id="m-env" label="Ambiente" error={errors.environment}>
              <SelectField
                control={control}
                name="environment"
                id="m-env"
                invalid={!!errors.environment}
                options={optionKeys(MACHINE_ENVIRONMENT_LABEL).map((k) => ({
                  value: k,
                  label: MACHINE_ENVIRONMENT_LABEL[k],
                }))}
              />
            </FormField>
            <FormField id="m-access-type" label="Tipo de acesso" error={errors.access_type}>
              <SelectField
                control={control}
                name="access_type"
                id="m-access-type"
                emptyLabel="Não definido"
                invalid={!!errors.access_type}
                options={optionKeys(MACHINE_ACCESS_TYPE_LABEL).map((k) => ({
                  value: k,
                  label: MACHINE_ACCESS_TYPE_LABEL[k],
                }))}
              />
            </FormField>
            <FormField id="m-access-user" label="Utilizador de acesso" error={errors.access_user}>
              <Input {...fieldA11y('m-access-user', errors.access_user)} {...register('access_user')} />
            </FormField>
          </div>
          <FormField id="m-notes" label="Notas" error={errors.notes}>
            <Textarea {...fieldA11y('m-notes', errors.notes)} {...register('notes')} />
          </FormField>
          <FormServerError message={errors.root?.server?.message} />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'A guardar…' : machine ? 'Guardar alterações' : 'Criar máquina'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
