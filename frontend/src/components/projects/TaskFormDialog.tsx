import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listSprints } from '@/api/sprints'
import { createTask } from '@/api/tasks'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { FormField, FormServerError } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { SelectField } from '@/components/ui/SelectField'
import { Textarea } from '@/components/ui/Textarea'
import { applyServerErrors, emptyToNull, fieldA11y } from '@/lib/forms'
import { PRIORITY_LABEL, TASK_TYPE_LABEL, optionKeys } from '@/lib/labels'
import type { BoardColumn } from '@/types/projects'
import { LabelPicker } from './LabelPicker'
import { projectSprintsKey, projectTasksKey } from './queryKeys'

const taskFormSchema = z.object({
  title: z.string().trim().min(1, 'O título é obrigatório.').max(255, 'O título não pode ter mais de 255 caracteres.'),
  description: z.string(),
  type: z.enum(['epic', 'story', 'task', 'bug'], { error: 'Seleccione o tipo.' }),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], { error: 'Seleccione a prioridade.' }),
  board_column_id: z.string().min(1, 'Seleccione a coluna.'),
  due_at: z.string(),
  sprint_id: z.string(),
  label_ids: z.array(z.number()),
})
type FormValues = z.infer<typeof taskFormSchema>

const FIELDS = ['title', 'description', 'type', 'priority', 'board_column_id', 'due_at', 'sprint_id', 'label_ids'] as const

/** Criação de tarefa. Montar só quando aberto (valores por omissão dependem das colunas). */
export function TaskFormDialog({
  projectId,
  columns,
  defaultColumnId,
  open,
  onOpenChange,
}: {
  projectId: number
  columns: BoardColumn[]
  defaultColumnId?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const sprintsQuery = useQuery({ queryKey: projectSprintsKey(projectId), queryFn: () => listSprints(projectId) })
  const firstColumn = defaultColumnId ?? columns[0]?.id

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'task',
      priority: 'medium',
      board_column_id: firstColumn != null ? String(firstColumn) : '',
      due_at: '',
      sprint_id: '',
      label_ids: [],
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createTask({
        project_id: projectId,
        title: values.title,
        description: emptyToNull(values.description),
        type: values.type,
        priority: values.priority,
        board_column_id: Number(values.board_column_id),
        due_at: values.due_at || null,
        sprint_id: values.sprint_id ? Number(values.sprint_id) : null,
        label_ids: values.label_ids,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectTasksKey(projectId) })
      queryClient.invalidateQueries({ queryKey: projectSprintsKey(projectId) })
      onOpenChange(false)
    },
    onError: (error) =>
      applyServerErrors(error, setError, { fields: FIELDS, fallback: 'Não foi possível criar a tarefa.' }),
  })

  const sprints = (sprintsQuery.data ?? []).filter((s) => s.status !== 'completed')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <FormField id="task-title" label="Título" error={errors.title}>
            <Input {...fieldA11y('task-title', errors.title)} {...register('title')} />
          </FormField>
          <FormField id="task-description" label="Descrição" error={errors.description}>
            <Textarea {...fieldA11y('task-description', errors.description)} {...register('description')} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="task-type" label="Tipo" error={errors.type}>
              <SelectField
                control={control}
                name="type"
                id="task-type"
                invalid={!!errors.type}
                options={optionKeys(TASK_TYPE_LABEL).map((k) => ({ value: k, label: TASK_TYPE_LABEL[k] }))}
              />
            </FormField>
            <FormField id="task-priority" label="Prioridade" error={errors.priority}>
              <SelectField
                control={control}
                name="priority"
                id="task-priority"
                invalid={!!errors.priority}
                options={optionKeys(PRIORITY_LABEL).map((k) => ({ value: k, label: PRIORITY_LABEL[k] }))}
              />
            </FormField>
            <FormField id="task-column" label="Coluna" error={errors.board_column_id}>
              <SelectField
                control={control}
                name="board_column_id"
                id="task-column"
                invalid={!!errors.board_column_id}
                options={columns.map((c) => ({ value: String(c.id), label: c.name }))}
              />
            </FormField>
            <FormField id="task-due" label="Prazo" error={errors.due_at}>
              <Input type="date" {...fieldA11y('task-due', errors.due_at)} {...register('due_at')} />
            </FormField>
            <FormField id="task-sprint" label="Sprint" error={errors.sprint_id} className="sm:col-span-2">
              <SelectField
                control={control}
                name="sprint_id"
                id="task-sprint"
                emptyLabel="Backlog (sem sprint)"
                invalid={!!errors.sprint_id}
                options={sprints.map((s) => ({ value: String(s.id), label: s.name }))}
              />
            </FormField>
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Etiquetas</legend>
            <Controller
              control={control}
              name="label_ids"
              render={({ field }) => (
                <LabelPicker projectId={projectId} idPrefix="task-create" value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.label_ids?.message && (
              <p className="text-sm text-destructive" role="alert">
                {errors.label_ids.message}
              </p>
            )}
          </fieldset>
          <FormServerError message={errors.root?.server?.message} />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'A criar…' : 'Criar tarefa'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
