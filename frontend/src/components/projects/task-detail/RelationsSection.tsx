import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { createRelation, deleteRelation, listRelations, listTasks } from '@/api/tasks'
import { Button } from '@/components/ui/Button'
import { FormField, FormServerError } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { SelectField } from '@/components/ui/SelectField'
import { Spinner } from '@/components/ui/Spinner'
import { applyServerErrors } from '@/lib/forms'
import { HELP } from '@/lib/help'
import { TASK_RELATION_LABEL, optionKeys } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { TaskRelation } from '@/types/projects'
import { projectTasksKey, taskRelationsKey } from '../queryKeys'
import { MutationError, SectionHeading } from './PeopleAndLabels'

const schema = z.object({
  type: z.enum(['blocks', 'blocked_by', 'relates_to', 'duplicates'], {
    error: 'Seleccione o tipo de relação.',
  }),
  related_task_id: z.string().min(1, 'Escolha a tarefa relacionada.'),
})
type FormValues = z.infer<typeof schema>

const MAX_RESULTS = 8

export function RelationsSection({
  taskId,
  projectId,
  onOpenTask,
  readOnly = false,
}: {
  taskId: number
  projectId: number
  onOpenTask: (taskId: number) => void
  readOnly?: boolean
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const relationsQuery = useQuery({
    queryKey: taskRelationsKey(taskId),
    queryFn: () => listRelations(taskId),
  })
  const tasksQuery = useQuery({
    queryKey: projectTasksKey(projectId),
    queryFn: () => listTasks(projectId),
  })

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'relates_to', related_task_id: '' },
  })
  const selectedId = useWatch({ control, name: 'related_task_id' })

  const refresh = () => queryClient.invalidateQueries({ queryKey: taskRelationsKey(taskId) })

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      createRelation(taskId, {
        type: values.type,
        related_task_id: Number(values.related_task_id),
      }),
    onSuccess: () => {
      reset({ type: 'relates_to', related_task_id: '' })
      setSearch('')
      refresh()
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['type', 'related_task_id'],
        fallback: 'Não foi possível adicionar a relação.',
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (relation: TaskRelation) => deleteRelation(taskId, relation.id),
    onSuccess: refresh,
  })

  const relations = relationsQuery.data ?? []
  const tasksById = new Map((tasksQuery.data ?? []).map((t) => [t.id, t]))
  const term = search.trim().toLowerCase()
  const results = term
    ? (tasksQuery.data ?? [])
        .filter(
          (t) => t.id !== taskId && (t.title.toLowerCase().includes(term) || String(t.id) === term),
        )
        .slice(0, MAX_RESULTS)
    : []
  const selectedTask = selectedId ? tasksById.get(Number(selectedId)) : undefined
  const searchId = `task-${taskId}-relation-search`

  return (
    <section aria-labelledby={`task-${taskId}-relations`}>
      <SectionHeading id={`task-${taskId}-relations`} help={HELP.relations}>
        Relações
      </SectionHeading>
      {relationsQuery.isLoading ? (
        <Spinner />
      ) : relationsQuery.isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar as relações.</p>
      ) : relations.length === 0 ? (
        <p className="mb-2 text-sm text-muted-foreground">Sem relações com outras tarefas.</p>
      ) : (
        <ul className="mb-2 flex flex-col divide-y divide-border rounded-md border border-border">
          {relations.map((relation) => {
            const title =
              relation.related_task?.title ??
              tasksById.get(relation.related_task_id)?.title ??
              `#${relation.related_task_id}`
            return (
              <li key={relation.id} className="flex items-center gap-2 p-2 text-sm">
                <span className="text-muted-foreground">{TASK_RELATION_LABEL[relation.type]}</span>
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onOpenTask(relation.related_task_id)}
                >
                  {title}
                </button>
                {!readOnly && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(relation)}
                    aria-label={`Remover relação "${TASK_RELATION_LABEL[relation.type]}" com ${title}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <MutationError error={deleteMutation.error} fallback="Não foi possível remover a relação." />

      {!readOnly && (
        <form
          className="flex flex-col gap-2 rounded-md border border-dashed border-border p-2"
          noValidate
          aria-label="Adicionar relação"
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_1fr]">
            <FormField id={`task-${taskId}-relation-type`} label="Tipo" error={errors.type}>
              <SelectField
                control={control}
                name="type"
                id={`task-${taskId}-relation-type`}
                invalid={!!errors.type}
                options={optionKeys(TASK_RELATION_LABEL).map((k) => ({
                  value: k,
                  label: TASK_RELATION_LABEL[k],
                }))}
              />
            </FormField>
            <FormField
              id={searchId}
              label="Pesquisar tarefa do projecto"
              error={errors.related_task_id}
            >
              <Input
                id={searchId}
                value={search}
                placeholder="Título ou número…"
                autoComplete="off"
                aria-invalid={errors.related_task_id ? true : undefined}
                aria-describedby={errors.related_task_id ? `${searchId}-error` : undefined}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setValue('related_task_id', '')
                }}
              />
            </FormField>
          </div>
          {results.length > 0 && !selectedTask && (
            <ul
              className="flex flex-col rounded-md border border-border"
              aria-label="Resultados da pesquisa"
            >
              {results.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full truncate px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
                    )}
                    onClick={() => {
                      setValue('related_task_id', String(t.id), { shouldValidate: true })
                      setSearch(t.title)
                    }}
                  >
                    #{t.id} · {t.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {term && results.length === 0 && !selectedTask && (
            <p className="text-xs text-muted-foreground">Nenhuma tarefa encontrada.</p>
          )}
          <FormServerError message={errors.root?.server?.message} />
          <Button type="submit" size="sm" className="self-end" disabled={createMutation.isPending}>
            Adicionar relação
          </Button>
        </form>
      )}
    </section>
  )
}
