import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSprint, updateSprint } from '@/api/sprints'
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
import { HELP } from '@/lib/help'
import type { Sprint } from '@/types/projects'
import { invalidateSprints } from './invalidation'

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'O nome do sprint é obrigatório.')
      .max(255, 'O nome não pode ter mais de 255 caracteres.'),
    goal: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
  })
  .refine((values) => !values.starts_at || !values.ends_at || values.ends_at >= values.starts_at, {
    path: ['ends_at'],
    message: 'A data de fim tem de ser igual ou posterior à data de início.',
  })

type FormValues = z.infer<typeof schema>

function toValues(sprint?: Sprint | null): FormValues {
  return {
    name: sprint?.name ?? '',
    goal: sprint?.goal ?? '',
    starts_at: sprint?.starts_at ?? '',
    ends_at: sprint?.ends_at ?? '',
  }
}

/**
 * Criar (sem `sprint`) ou editar (com `sprint`) um sprint: nome, datas e objectivo.
 * O estado (planeado/activo/concluído) muda-se com "Iniciar sprint"/"Concluir sprint" no Backlog.
 * Montar só quando aberto (os valores por omissão dependem do sprint).
 */
export function SprintFormDialog({
  projectId,
  sprint = null,
  open,
  onOpenChange,
}: {
  projectId: number
  sprint?: Sprint | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const editing = sprint != null
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(sprint) })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        goal: emptyToNull(values.goal),
        starts_at: values.starts_at || null,
        ends_at: values.ends_at || null,
      }
      return sprint ? updateSprint(sprint.id, payload) : createSprint(projectId, payload)
    },
    onSuccess: () => {
      invalidateSprints(queryClient, projectId)
      onOpenChange(false)
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['name', 'goal', 'starts_at', 'ends_at'],
        fallback: editing
          ? 'Não foi possível guardar o sprint.'
          : 'Não foi possível criar o sprint.',
      }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar sprint' : 'Novo sprint'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Altere o nome, as datas ou o objectivo do sprint.'
              : 'Um sprint é um período curto (ex.: 2 semanas). É criado como “Planeado”; depois junte-lhe tarefas e inicie-o.'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <FormField id="sprint-name" label="Nome" error={errors.name} help={HELP.sprint}>
            <Input
              placeholder="Sprint 1"
              {...fieldA11y('sprint-name', errors.name)}
              {...register('name')}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="sprint-starts" label="Início" error={errors.starts_at}>
              <Input
                type="date"
                {...fieldA11y('sprint-starts', errors.starts_at)}
                {...register('starts_at')}
              />
            </FormField>
            <FormField id="sprint-ends" label="Fim" error={errors.ends_at}>
              <Input
                type="date"
                {...fieldA11y('sprint-ends', errors.ends_at)}
                {...register('ends_at')}
              />
            </FormField>
          </div>
          <FormField id="sprint-goal" label="Objectivo" error={errors.goal}>
            <Textarea
              placeholder="O que se pretende entregar neste sprint?"
              {...fieldA11y('sprint-goal', errors.goal)}
              {...register('goal')}
            />
          </FormField>
          <FormServerError message={errors.root?.server?.message} />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'A guardar…' : editing ? 'Guardar alterações' : 'Criar sprint'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
