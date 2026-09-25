import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listSprints } from '@/api/sprints'
import { createTask } from '@/api/tasks'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { FormField, FormServerError } from '@/components/ui/FormField'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Input } from '@/components/ui/Input'
import { SelectField } from '@/components/ui/SelectField'
import { Textarea } from '@/components/ui/Textarea'
import { applyServerErrors, emptyToNull, fieldA11y } from '@/lib/forms'
import { HELP } from '@/lib/help'
import { BACKLOG_OPTION_LABEL, PRIORITY_LABEL, TASK_TYPE_LABEL, optionKeys } from '@/lib/labels'
import type { BoardColumn } from '@/types/projects'
import { AssigneePicker } from './AssigneePicker'
import { LabelPicker } from './LabelPicker'
import { invalidateProjectTasks } from './invalidation'
import { projectSprintsKey } from './queryKeys'

const taskFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'O título é obrigatório.')
      .max(255, 'O título não pode ter mais de 255 caracteres.'),
    description: z.string(),
    type: z.enum(['epic', 'story', 'task', 'bug'], { error: 'Seleccione o tipo.' }),
    priority: z.enum(['low', 'medium', 'high', 'urgent'], { error: 'Seleccione a prioridade.' }),
    board_column_id: z.string().min(1, 'Seleccione a coluna.'),
    sprint_id: z.string(),
    starts_at: z.string(),
    due_at: z.string(),
    estimate: z.string().regex(/^(\d+([.,]\d+)?)?$/, 'Indique um número positivo.'),
    assignee_ids: z.array(z.number()),
    label_ids: z.array(z.number()),
  })
  .refine((v) => !v.starts_at || !v.due_at || v.due_at >= v.starts_at, {
    path: ['due_at'],
    message: 'O prazo tem de ser igual ou posterior à data de início.',
  })
type FormValues = z.infer<typeof taskFormSchema>

const FIELDS = [
  'title',
  'description',
  'type',
  'priority',
  'board_column_id',
  'sprint_id',
  'starts_at',
  'due_at',
  'estimate',
  'assignee_ids',
  'label_ids',
] as const

/**
 * Criação de tarefa. Montar só quando aberto (valores por omissão dependem das colunas).
 * `defaultSprintId` pré-preenche o sprint (ex.: "Nova tarefa" numa secção do Backlog ou no Kanban
 * filtrado pelo sprint activo); `null`/omitido = backlog do projecto.
 */
export function TaskFormDialog({
  projectId,
  columns,
  defaultColumnId,
  defaultSprintId = null,
  open,
  onOpenChange,
}: {
  projectId: number
  columns: BoardColumn[]
  defaultColumnId?: number
  defaultSprintId?: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const sprintsQuery = useQuery({
    queryKey: projectSprintsKey(projectId),
    queryFn: () => listSprints(projectId),
  })
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
      sprint_id: defaultSprintId != null ? String(defaultSprintId) : '',
      starts_at: '',
      due_at: '',
      estimate: '',
      assignee_ids: [],
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
        sprint_id: values.sprint_id ? Number(values.sprint_id) : null,
        starts_at: values.starts_at || null,
        due_at: values.due_at || null,
        estimate: values.estimate ? Number(values.estimate.replace(',', '.')) : null,
        assignee_ids: values.assignee_ids,
        label_ids: values.label_ids,
      }),
    onSuccess: () => {
      invalidateProjectTasks(queryClient, projectId)
      onOpenChange(false)
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: FIELDS,
        fallback: 'Não foi possível criar a tarefa.',
      }),
  })

  const sprints = (sprintsQuery.data ?? []).filter((s) => s.status !== 'completed')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>
            Sem sprint, a tarefa fica no backlog do projecto até ser planeada.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <FormField id="task-title" label="Título" error={errors.title}>
            <Input {...fieldA11y('task-title', errors.title)} {...register('title')} />
          </FormField>
          <FormField id="task-description" label="Descrição" error={errors.description}>
            <Textarea
              {...fieldA11y('task-description', errors.description)}
              {...register('description')}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="task-type" label="Tipo" error={errors.type} help={HELP.taskType}>
              <SelectField
                control={control}
                name="type"
                id="task-type"
                invalid={!!errors.type}
                options={optionKeys(TASK_TYPE_LABEL).map((k) => ({
                  value: k,
                  label: TASK_TYPE_LABEL[k],
                }))}
              />
            </FormField>
            <FormField
              id="task-priority"
              label="Prioridade"
              error={errors.priority}
              help={HELP.priority}
            >
              <SelectField
                control={control}
                name="priority"
                id="task-priority"
                invalid={!!errors.priority}
                options={optionKeys(PRIORITY_LABEL).map((k) => ({
                  value: k,
                  label: PRIORITY_LABEL[k],
                }))}
              />
            </FormField>
            <FormField
              id="task-column"
              label="Coluna"
              error={errors.board_column_id}
              help={HELP.column}
            >
              <SelectField
                control={control}
                name="board_column_id"
                id="task-column"
                invalid={!!errors.board_column_id}
                options={columns.map((c) => ({ value: String(c.id), label: c.name }))}
              />
            </FormField>
            <FormField id="task-sprint" label="Sprint" error={errors.sprint_id} help={HELP.sprint}>
              <SelectField
                control={control}
                name="sprint_id"
                id="task-sprint"
                emptyLabel={BACKLOG_OPTION_LABEL}
                invalid={!!errors.sprint_id}
                options={sprints.map((s) => ({ value: String(s.id), label: s.name }))}
              />
            </FormField>
            <FormField id="task-starts" label="Início" error={errors.starts_at}>
              <Input
                type="date"
                {...fieldA11y('task-starts', errors.starts_at)}
                {...register('starts_at')}
              />
            </FormField>
            <FormField id="task-due" label="Prazo" error={errors.due_at} help={HELP.dueDate}>
              <Input
                type="date"
                {...fieldA11y('task-due', errors.due_at)}
                {...register('due_at')}
              />
            </FormField>
            <FormField
              id="task-estimate"
              label="Estimativa"
              error={errors.estimate}
              help={HELP.estimate}
            >
              <Input
                inputMode="decimal"
                {...fieldA11y('task-estimate', errors.estimate)}
                {...register('estimate')}
              />
            </FormField>
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 flex items-center gap-1 text-sm font-medium">
              Responsáveis <InfoTooltip {...HELP.assignees} />
            </legend>
            <Controller
              control={control}
              name="assignee_ids"
              render={({ field }) => (
                <AssigneePicker
                  projectId={projectId}
                  idPrefix="task-create"
                  value={field.value}
                  onChange={field.onChange}
                  onNavigate={() => onOpenChange(false)}
                />
              )}
            />
            {errors.assignee_ids?.message && (
              <p className="text-sm text-destructive" role="alert">
                {errors.assignee_ids.message}
              </p>
            )}
          </fieldset>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 flex items-center gap-1 text-sm font-medium">
              Etiquetas <InfoTooltip {...HELP.labels} />
            </legend>
            <Controller
              control={control}
              name="label_ids"
              render={({ field }) => (
                <LabelPicker
                  projectId={projectId}
                  idPrefix="task-create"
                  value={field.value}
                  onChange={field.onChange}
                />
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
