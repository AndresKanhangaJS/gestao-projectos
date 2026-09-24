import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { listSprints } from '@/api/sprints'
import { updateTask } from '@/api/tasks'
import { Button } from '@/components/ui/Button'
import { FormField, FormServerError } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { SelectField } from '@/components/ui/SelectField'
import { Textarea } from '@/components/ui/Textarea'
import { applyServerErrors, emptyToNull, fieldA11y } from '@/lib/forms'
import { PRIORITY_LABEL, TASK_TYPE_LABEL, optionKeys } from '@/lib/labels'
import type { Task } from '@/types/projects'
import { projectSprintsKey } from '../queryKeys'

const schema = z
  .object({
    title: z.string().trim().min(1, 'O título é obrigatório.').max(255, 'O título não pode ter mais de 255 caracteres.'),
    description: z.string(),
    type: z.enum(['epic', 'story', 'task', 'bug'], { error: 'Seleccione o tipo.' }),
    priority: z.enum(['low', 'medium', 'high', 'urgent'], { error: 'Seleccione a prioridade.' }),
    sprint_id: z.string(),
    estimate: z.string().regex(/^(\d+([.,]\d+)?)?$/, 'Indique um número positivo.'),
    starts_at: z.string(),
    due_at: z.string(),
  })
  .refine((v) => !v.starts_at || !v.due_at || v.due_at >= v.starts_at, {
    path: ['due_at'],
    message: 'O prazo tem de ser igual ou posterior à data de início.',
  })
type FormValues = z.infer<typeof schema>

const FIELDS = ['title', 'description', 'type', 'priority', 'sprint_id', 'estimate', 'starts_at', 'due_at'] as const

function toValues(task: Task): FormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    type: task.type,
    priority: task.priority,
    sprint_id: task.sprint_id != null ? String(task.sprint_id) : '',
    estimate: task.estimate != null ? String(task.estimate) : '',
    starts_at: task.starts_at ?? '',
    due_at: task.due_at ?? '',
  }
}

/** Edição dos campos da tarefa. Montar com `key={task.id}` para recalcular os valores. */
export function TaskFieldsForm({ task, onSaved }: { task: Task; onSaved: (task: Task) => void }) {
  const sprintsQuery = useQuery({
    queryKey: projectSprintsKey(task.project_id),
    queryFn: () => listSprints(task.project_id),
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(task) })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateTask(task.id, {
        title: values.title,
        description: emptyToNull(values.description),
        type: values.type,
        priority: values.priority,
        sprint_id: values.sprint_id ? Number(values.sprint_id) : null,
        estimate: values.estimate ? Number(values.estimate.replace(',', '.')) : null,
        starts_at: values.starts_at || null,
        due_at: values.due_at || null,
      }),
    onSuccess: (updated) => {
      reset(toValues(updated))
      onSaved(updated)
    },
    onError: (error) =>
      applyServerErrors(error, setError, { fields: FIELDS, fallback: 'Não foi possível guardar a tarefa.' }),
  })

  const sprints = (sprintsQuery.data ?? []).filter((s) => s.status !== 'completed' || s.id === task.sprint_id)
  const id = (name: string) => `task-${task.id}-${name}`

  return (
    <form
      className="flex flex-col gap-3"
      noValidate
      aria-label="Editar tarefa"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <FormField id={id('title')} label="Título" error={errors.title}>
        <Input {...fieldA11y(id('title'), errors.title)} {...register('title')} />
      </FormField>
      <FormField id={id('description')} label="Descrição" error={errors.description}>
        <Textarea {...fieldA11y(id('description'), errors.description)} {...register('description')} />
      </FormField>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField id={id('type')} label="Tipo" error={errors.type}>
          <SelectField
            control={control}
            name="type"
            id={id('type')}
            invalid={!!errors.type}
            options={optionKeys(TASK_TYPE_LABEL).map((k) => ({ value: k, label: TASK_TYPE_LABEL[k] }))}
          />
        </FormField>
        <FormField id={id('priority')} label="Prioridade" error={errors.priority}>
          <SelectField
            control={control}
            name="priority"
            id={id('priority')}
            invalid={!!errors.priority}
            options={optionKeys(PRIORITY_LABEL).map((k) => ({ value: k, label: PRIORITY_LABEL[k] }))}
          />
        </FormField>
        <FormField id={id('sprint')} label="Sprint" error={errors.sprint_id}>
          <SelectField
            control={control}
            name="sprint_id"
            id={id('sprint')}
            emptyLabel="Backlog (sem sprint)"
            invalid={!!errors.sprint_id}
            options={sprints.map((s) => ({ value: String(s.id), label: s.name }))}
          />
        </FormField>
        <FormField id={id('starts')} label="Início" error={errors.starts_at}>
          <Input type="date" {...fieldA11y(id('starts'), errors.starts_at)} {...register('starts_at')} />
        </FormField>
        <FormField id={id('due')} label="Prazo" error={errors.due_at}>
          <Input type="date" {...fieldA11y(id('due'), errors.due_at)} {...register('due_at')} />
        </FormField>
        <FormField id={id('estimate')} label="Estimativa" error={errors.estimate}>
          <Input inputMode="decimal" {...fieldA11y(id('estimate'), errors.estimate)} {...register('estimate')} />
        </FormField>
      </div>
      <FormServerError message={errors.root?.server?.message} />
      <div className="flex items-center justify-end gap-2">
        {mutation.isSuccess && !isDirty && (
          <span className="text-xs text-muted-foreground" aria-live="polite">
            Alterações guardadas.
          </span>
        )}
        <Button type="button" variant="ghost" size="sm" disabled={!isDirty} onClick={() => reset(toValues(task))}>
          Repor
        </Button>
        <Button type="submit" size="sm" disabled={!isDirty || mutation.isPending}>
          {mutation.isPending ? 'A guardar…' : 'Guardar alterações'}
        </Button>
      </div>
    </form>
  )
}
