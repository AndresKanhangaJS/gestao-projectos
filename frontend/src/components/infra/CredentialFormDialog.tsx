import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCredential, toTargetType, updateCredential } from '@/api/infra'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { FormField, FormServerError } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { ComboboxField } from '@/components/ui/ComboboxField'
import { SelectField } from '@/components/ui/SelectField'
import { Textarea } from '@/components/ui/Textarea'
import { applyServerErrors, emptyToNull, fieldA11y } from '@/lib/forms'
import { CREDENTIAL_TYPE_LABEL, optionKeys } from '@/lib/labels'
import type { Credential, UpdateCredentialPayload } from '@/types/infra'
import { credentialsKey } from './queryKeys'

export interface CredentialTargetOption {
  type: 'machine' | 'deployment'
  id: number
  label: string
}

const schema = z.object({
  target: z.string().min(1, 'Seleccione a que recurso pertence a credencial.'),
  type: z.enum(['ssh', 'rdp', 'web', 'database'], { error: 'Seleccione o tipo.' }),
  username: z.string().max(255, 'Máximo de 255 caracteres.'),
  secret: z.string(),
  notes: z.string(),
})
type FormValues = z.infer<typeof schema>

const targetValue = (t: { type: string; id: number }) => `${t.type}:${t.id}`

/**
 * Criar/editar credencial. O segredo é só de escrita: nunca é pré-preenchido e, na edição,
 * um campo vazio significa "manter o actual" (o campo não é enviado).
 */
export function CredentialFormDialog({
  credential,
  targets,
  onClose,
}: {
  credential: Credential | null
  targets: CredentialTargetOption[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const isEdit = credential != null
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      target: credential
        ? targetValue({
            type: toTargetType(credential.credentialable_type) ?? '',
            id: credential.credentialable_id,
          })
        : targets.length === 1
          ? targetValue(targets[0])
          : '',
      type: credential?.type ?? 'ssh',
      username: credential?.username ?? '',
      // Nunca pré-preenchido: a API não devolve o segredo e não o queremos no DOM.
      secret: '',
      notes: credential?.notes ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: UpdateCredentialPayload = {
        type: values.type,
        username: emptyToNull(values.username),
        notes: emptyToNull(values.notes),
      }
      if (values.secret !== '') payload.secret = values.secret
      if (credential) return updateCredential(credential.id, payload)
      const [type, id] = values.target.split(':')
      return createCredential({
        ...payload,
        credentialable_type: type === 'deployment' ? 'deployment' : 'machine',
        credentialable_id: Number(id),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialsKey })
      onClose()
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['target', 'type', 'username', 'secret', 'notes'],
        aliases: { credentialable_type: 'target', credentialable_id: 'target' },
        fallback: 'Não foi possível guardar a credencial.',
      }),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar credencial' : 'Nova credencial'}</DialogTitle>
          <DialogDescription>
            O segredo é guardado encriptado e nunca é mostrado nesta lista.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
        >
          <FormField id="cred-target" label="Associada a" error={errors.target}>
            <ComboboxField
              control={control}
              name="target"
              id="cred-target"
              disabled={isEdit}
              invalid={!!errors.target}
              placeholder="Pesquise máquina ou deployment…"
              options={targets.map((t) => ({ value: targetValue(t), label: t.label }))}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="cred-type" label="Tipo" error={errors.type}>
              <SelectField
                control={control}
                name="type"
                id="cred-type"
                invalid={!!errors.type}
                options={optionKeys(CREDENTIAL_TYPE_LABEL).map((k) => ({
                  value: k,
                  label: CREDENTIAL_TYPE_LABEL[k],
                }))}
              />
            </FormField>
            <FormField id="cred-username" label="Utilizador" error={errors.username}>
              <Input
                autoComplete="off"
                {...fieldA11y('cred-username', errors.username)}
                {...register('username')}
              />
            </FormField>
          </div>
          <FormField
            id="cred-secret"
            label={isEdit ? 'Novo segredo' : 'Segredo'}
            error={errors.secret}
            hint={isEdit ? 'Deixar vazio para manter o segredo actual.' : 'Opcional.'}
          >
            <Input
              type="password"
              autoComplete="new-password"
              placeholder={isEdit ? 'Deixar vazio para manter' : undefined}
              {...fieldA11y('cred-secret', errors.secret)}
              {...register('secret')}
            />
          </FormField>
          <FormField id="cred-notes" label="Notas" error={errors.notes}>
            <Textarea {...fieldA11y('cred-notes', errors.notes)} {...register('notes')} />
          </FormField>
          <FormServerError message={errors.root?.server?.message} />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'A guardar…' : isEdit ? 'Guardar alterações' : 'Criar credencial'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
