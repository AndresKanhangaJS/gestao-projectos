import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient, updateClient } from '@/api/infra'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { FormField, FormServerError } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { SelectField } from '@/components/ui/SelectField'
import { Textarea } from '@/components/ui/Textarea'
import { applyServerErrors, emptyToNull, fieldA11y } from '@/lib/forms'
import { CLIENT_STATUS_LABEL, optionKeys } from '@/lib/labels'
import type { Client } from '@/types/infra'
import { infraRootKey } from './queryKeys'

const schema = z.object({
  name: z.string().trim().min(1, 'O nome é obrigatório.').max(255, 'O nome não pode ter mais de 255 caracteres.'),
  contact_name: z.string().max(255, 'Máximo de 255 caracteres.'),
  contact_email: z.union([z.literal(''), z.email('Introduza um email válido.')]),
  contact_phone: z.string().max(50, 'Máximo de 50 caracteres.'),
  status: z.enum(['active', 'inactive'], { error: 'Seleccione o estado.' }),
  notes: z.string(),
})
type FormValues = z.infer<typeof schema>
const FIELDS = ['name', 'contact_name', 'contact_email', 'contact_phone', 'status', 'notes'] as const

/** Criar (client = null) ou editar um cliente. Montar só quando aberto, com `key` do cliente. */
export function ClientFormDialog({
  client,
  open,
  onOpenChange,
}: {
  client: Client | null
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
      name: client?.name ?? '',
      contact_name: client?.contact_name ?? '',
      contact_email: client?.contact_email ?? '',
      contact_phone: client?.contact_phone ?? '',
      status: client?.status ?? 'active',
      notes: client?.notes ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        contact_name: emptyToNull(values.contact_name),
        contact_email: emptyToNull(values.contact_email),
        contact_phone: emptyToNull(values.contact_phone),
        status: values.status,
        notes: emptyToNull(values.notes),
      }
      return client ? updateClient(client.id, payload) : createClient(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: infraRootKey })
      onOpenChange(false)
    },
    onError: (error) =>
      applyServerErrors(error, setError, { fields: FIELDS, fallback: 'Não foi possível guardar o cliente.' }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <FormField id="c-name" label="Nome" error={errors.name}>
            <Input {...fieldA11y('c-name', errors.name)} {...register('name')} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="c-contact-name" label="Pessoa de contacto" error={errors.contact_name}>
              <Input {...fieldA11y('c-contact-name', errors.contact_name)} {...register('contact_name')} />
            </FormField>
            <FormField id="c-status" label="Estado" error={errors.status}>
              <SelectField
                control={control}
                name="status"
                id="c-status"
                invalid={!!errors.status}
                options={optionKeys(CLIENT_STATUS_LABEL).map((k) => ({ value: k, label: CLIENT_STATUS_LABEL[k] }))}
              />
            </FormField>
            <FormField id="c-email" label="Email de contacto" error={errors.contact_email}>
              <Input type="email" {...fieldA11y('c-email', errors.contact_email)} {...register('contact_email')} />
            </FormField>
            <FormField id="c-phone" label="Telefone" error={errors.contact_phone}>
              <Input type="tel" {...fieldA11y('c-phone', errors.contact_phone)} {...register('contact_phone')} />
            </FormField>
          </div>
          <FormField id="c-notes" label="Notas" error={errors.notes}>
            <Textarea {...fieldA11y('c-notes', errors.notes)} {...register('notes')} />
          </FormField>
          <FormServerError message={errors.root?.server?.message} />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'A guardar…' : client ? 'Guardar alterações' : 'Criar cliente'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
