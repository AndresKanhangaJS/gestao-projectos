import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createWorkspace } from '@/api/workspaces'
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
import { Textarea } from '@/components/ui/Textarea'
import { applyServerErrors, emptyToNull, fieldA11y } from '@/lib/forms'

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome é obrigatório.')
    .max(255, 'O nome não pode ter mais de 255 caracteres.'),
  description: z.string(),
})
type FormValues = z.infer<typeof schema>
const DEFAULTS: FormValues = { name: '', description: '' }

export function WorkspaceFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createWorkspace({ name: values.name, description: emptyToNull(values.description) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      reset(DEFAULTS)
      onOpenChange(false)
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['name', 'description'],
        fallback: 'Não foi possível criar o workspace.',
      }),
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset(DEFAULTS)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo workspace</DialogTitle>
          <DialogDescription>
            Um workspace é a equipa: agrupa projectos e define quem tem acesso. Fica como dono e
            pode depois adicionar membros.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <FormField id="ws-name" label="Nome" error={errors.name}>
            <Input {...fieldA11y('ws-name', errors.name)} {...register('name')} />
          </FormField>
          <FormField id="ws-description" label="Descrição" error={errors.description}>
            <Textarea
              {...fieldA11y('ws-description', errors.description)}
              {...register('description')}
            />
          </FormField>
          <FormServerError message={errors.root?.server?.message} />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'A criar…' : 'Criar workspace'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
