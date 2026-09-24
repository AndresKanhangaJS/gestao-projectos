import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSprint } from '@/api/sprints'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { mutationErrorMessage } from '@/lib/errors'
import { projectSprintsKey } from './queryKeys'

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'O nome do sprint é obrigatório.')
      .max(255, 'O nome não pode ter mais de 255 caracteres.'),
    goal: z.string().trim(),
    starts_at: z.string(),
    ends_at: z.string(),
  })
  .refine((values) => !values.starts_at || !values.ends_at || values.ends_at >= values.starts_at, {
    path: ['ends_at'],
    message: 'A data de fim tem de ser igual ou posterior à data de início.',
  })

type FormValues = z.infer<typeof schema>

const DEFAULT_VALUES: FormValues = { name: '', goal: '', starts_at: '', ends_at: '' }

export function SprintFormDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createSprint(projectId, {
        name: values.name,
        goal: values.goal || null,
        starts_at: values.starts_at || null,
        ends_at: values.ends_at || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectSprintsKey(projectId) })
      reset(DEFAULT_VALUES)
      onOpenChange(false)
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset(DEFAULT_VALUES)
      mutation.reset()
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo sprint</DialogTitle>
          <DialogDescription>O sprint é criado no estado "Planeado".</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sprint-name">Nome</Label>
            <Input
              id="sprint-name"
              placeholder="Sprint 1"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'sprint-name-error' : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p id="sprint-name-error" className="text-sm text-destructive" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sprint-starts">Início</Label>
              <Input id="sprint-starts" type="date" {...register('starts_at')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sprint-ends">Fim</Label>
              <Input
                id="sprint-ends"
                type="date"
                aria-invalid={!!errors.ends_at}
                aria-describedby={errors.ends_at ? 'sprint-ends-error' : undefined}
                {...register('ends_at')}
              />
              {errors.ends_at && (
                <p id="sprint-ends-error" className="text-sm text-destructive" role="alert">
                  {errors.ends_at.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sprint-goal">Objectivo</Label>
            <Textarea id="sprint-goal" placeholder="O que se pretende entregar neste sprint?" {...register('goal')} />
          </div>
          {mutation.isError && (
            <p className="text-sm text-destructive" role="alert">
              {mutationErrorMessage(mutation.error, 'Não foi possível criar o sprint.')}
            </p>
          )}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'A criar…' : 'Criar sprint'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
