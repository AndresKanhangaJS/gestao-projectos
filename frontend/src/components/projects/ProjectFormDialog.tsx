import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createProject } from '@/api/projects'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { FormField, FormServerError } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { SelectField } from '@/components/ui/SelectField'
import { Textarea } from '@/components/ui/Textarea'
import { applyServerErrors, emptyToNull, fieldA11y } from '@/lib/forms'
import type { Workspace } from '@/types/projects'

const schema = z.object({
  workspace_id: z.string().min(1, 'Seleccione o workspace.'),
  key: z
    .string()
    .trim()
    .min(1, 'A chave é obrigatória.')
    .max(20, 'A chave não pode ter mais de 20 caracteres.')
    .regex(/^[A-Za-z0-9_-]+$/, 'Use apenas letras, números, hífen ou underscore.'),
  name: z.string().trim().min(1, 'O nome é obrigatório.').max(255, 'O nome não pode ter mais de 255 caracteres.'),
  description: z.string(),
})
type FormValues = z.infer<typeof schema>

/** Montar só quando aberto (os valores por omissão dependem da lista de workspaces). */
export function ProjectFormDialog({
  open,
  onOpenChange,
  workspaces,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaces: Workspace[]
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      workspace_id: workspaces.length === 1 ? String(workspaces[0].id) : '',
      key: '',
      name: '',
      description: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createProject({
        workspace_id: Number(values.workspace_id),
        key: values.key.toUpperCase(),
        name: values.name,
        description: emptyToNull(values.description),
      }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onOpenChange(false)
      navigate(`/projects/${project.id}`)
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['workspace_id', 'key', 'name', 'description'],
        fallback: 'Não foi possível criar o projecto.',
      }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo projecto</DialogTitle>
          <DialogDescription>É criado automaticamente um quadro Kanban com colunas por omissão.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <FormField id="p-workspace" label="Workspace" error={errors.workspace_id}>
            <SelectField
              control={control}
              name="workspace_id"
              id="p-workspace"
              invalid={!!errors.workspace_id}
              options={workspaces.map((w) => ({ value: String(w.id), label: w.name }))}
            />
          </FormField>
          <FormField id="p-key" label="Chave (ex.: PROJ)" error={errors.key}>
            <Input maxLength={20} className="uppercase" {...fieldA11y('p-key', errors.key)} {...register('key')} />
          </FormField>
          <FormField id="p-name" label="Nome" error={errors.name}>
            <Input {...fieldA11y('p-name', errors.name)} {...register('name')} />
          </FormField>
          <FormField id="p-description" label="Descrição" error={errors.description}>
            <Textarea {...fieldA11y('p-description', errors.description)} {...register('description')} />
          </FormField>
          <FormServerError message={errors.root?.server?.message} />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'A criar…' : 'Criar projecto'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
