import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { completeSprint } from '@/api/sprints'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { FormServerError } from '@/components/ui/FormField'
import { applyServerErrors } from '@/lib/forms'
import type { Sprint, Task } from '@/types/projects'
import { invalidateSprints } from './invalidation'

const schema = z.object({ destination: z.enum(['backlog', 'next']) })
type FormValues = z.infer<typeof schema>

/**
 * Concluir um sprint: pergunta o que fazer às tarefas por terminar (voltar ao backlog do projecto
 * ou passar para o próximo sprint planeado) e envia a escolha à API numa única chamada
 * (`POST sprints/{sprint}/complete`), que conclui o sprint e move as tarefas de forma atómica.
 * A lista de pendentes mostrada é só informativa; quem decide o que mover é a API.
 */
export function CompleteSprintDialog({
  projectId,
  sprint,
  pendingTasks,
  nextSprint,
  open,
  onOpenChange,
}: {
  projectId: number
  sprint: Sprint
  /** Tarefas do sprint fora de uma coluna de conclusão (só para mostrar ao utilizador). */
  pendingTasks: Task[]
  /** Próximo sprint planeado (se existir). */
  nextSprint: Sprint | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { destination: 'backlog' },
  })

  const mutation = useMutation({
    mutationFn: ({ destination }: FormValues) =>
      completeSprint(
        sprint.id,
        destination === 'next' && nextSprint
          ? { move_unfinished_to: 'sprint', target_sprint_id: nextSprint.id }
          : { move_unfinished_to: 'backlog' },
      ),
    onSuccess: () => onOpenChange(false),
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['destination'],
        aliases: { move_unfinished_to: 'destination', target_sprint_id: 'destination' },
        fallback:
          'Não foi possível concluir o sprint. Verifique o estado das tarefas e tente novamente.',
      }),
    onSettled: () => invalidateSprints(queryClient, projectId),
  })

  const count = pendingTasks.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir “{sprint.name}”?</DialogTitle>
          <DialogDescription>
            Ao concluir, escolha se as tarefas pendentes (fora da coluna de conclusão) voltam ao
            backlog ou passam para o próximo sprint planeado.{' '}
            {count === 0
              ? 'De momento todas as tarefas deste sprint parecem concluídas.'
              : `${count} tarefa(s) ainda não estão concluídas.`}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          {
            <>
              {count > 0 && (
                <ul className="max-h-40 overflow-y-auto rounded-md border border-border p-2 text-sm">
                  {pendingTasks.map((task) => (
                    <li key={task.id} className="truncate">
                      {task.title}
                    </li>
                  ))}
                </ul>
              )}
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">Tarefas por terminar</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    value="backlog"
                    className="h-4 w-4"
                    {...register('destination')}
                  />
                  Voltar ao backlog do projecto
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    value="next"
                    className="h-4 w-4"
                    disabled={!nextSprint}
                    {...register('destination')}
                  />
                  {nextSprint
                    ? `Passar para o próximo sprint planeado: “${nextSprint.name}”`
                    : 'Passar para o próximo sprint (não há nenhum sprint planeado)'}
                </label>
              </fieldset>
            </>
          }
          <FormServerError message={errors.root?.server?.message ?? errors.destination?.message} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'A concluir…' : 'Concluir sprint'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
