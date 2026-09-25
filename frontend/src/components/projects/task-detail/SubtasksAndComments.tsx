import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Circle } from 'lucide-react'
import { addComment, createSubtask } from '@/api/tasks'
import { Avatar, AvatarFallback, initials } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FieldError, FormServerError } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { applyServerErrors, fieldA11y } from '@/lib/forms'
import { formatDateTime } from '@/lib/format'
import { HELP } from '@/lib/help'
import { PRIORITY_LABEL, PRIORITY_VARIANT } from '@/lib/labels'
import type { SubtaskSummary, TaskComment } from '@/types/projects'
import { SectionHeading } from './PeopleAndLabels'

const subtaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Indique o título da subtarefa.')
    .max(255, 'O título não pode ter mais de 255 caracteres.'),
})
type SubtaskValues = z.infer<typeof subtaskSchema>

export function SubtasksSection({
  taskId,
  subtasks,
  onOpenTask,
  onChanged,
  readOnly = false,
}: {
  taskId: number
  subtasks: SubtaskSummary[]
  onOpenTask: (taskId: number) => void
  onChanged: () => void
  readOnly?: boolean
}) {
  const inputId = `task-${taskId}-new-subtask`
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<SubtaskValues>({ resolver: zodResolver(subtaskSchema), defaultValues: { title: '' } })

  const mutation = useMutation({
    mutationFn: (values: SubtaskValues) => createSubtask(taskId, values.title),
    onSuccess: () => {
      reset({ title: '' })
      onChanged()
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['title'],
        fallback: 'Não foi possível criar a subtarefa.',
      }),
  })

  const done = subtasks.filter((s) => s.completed).length

  return (
    <section aria-labelledby={`task-${taskId}-subtasks`}>
      <SectionHeading id={`task-${taskId}-subtasks`} help={HELP.subtasks}>
        Subtarefas{' '}
        {subtasks.length > 0 && (
          <span className="font-normal text-muted-foreground">
            ({done}/{subtasks.length} concluídas)
          </span>
        )}
      </SectionHeading>
      {subtasks.length === 0 ? (
        <p className="mb-2 text-sm text-muted-foreground">Sem subtarefas.</p>
      ) : (
        <ul className="mb-2 flex flex-col divide-y divide-border rounded-md border border-border">
          {subtasks.map((subtask) => (
            <li key={subtask.id} className="flex items-center gap-2 p-2 text-sm">
              {subtask.completed ? (
                <CheckCircle2 className="h-4 w-4 text-success" aria-label="Concluída" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" aria-label="Por concluir" />
              )}
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onOpenTask(subtask.id)}
              >
                {subtask.title}
              </button>
              {subtask.column && <Badge variant="outline">{subtask.column.name}</Badge>}
              <Badge variant={PRIORITY_VARIANT[subtask.priority]}>
                {PRIORITY_LABEL[subtask.priority]}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {!readOnly && (
        <form
          className="flex flex-col gap-1"
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <Label htmlFor={inputId} className="sr-only">
            Título da nova subtarefa
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="Nova subtarefa…"
              {...fieldA11y(inputId, errors.title)}
              {...register('title')}
            />
            <Button type="submit" disabled={mutation.isPending}>
              Adicionar
            </Button>
          </div>
          <FieldError id={`${inputId}-error`} message={errors.title?.message} />
          <FormServerError message={errors.root?.server?.message} />
        </form>
      )}
    </section>
  )
}

const commentSchema = z.object({
  body: z.string().trim().min(1, 'Escreva o comentário antes de enviar.'),
})
type CommentValues = z.infer<typeof commentSchema>

export function CommentsSection({
  taskId,
  comments,
  onChanged,
}: {
  taskId: number
  comments: TaskComment[]
  onChanged: () => void
}) {
  const inputId = `task-${taskId}-new-comment`
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CommentValues>({ resolver: zodResolver(commentSchema), defaultValues: { body: '' } })

  const mutation = useMutation({
    mutationFn: (values: CommentValues) => addComment(taskId, values.body),
    onSuccess: () => {
      reset({ body: '' })
      onChanged()
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['body'],
        fallback: 'Não foi possível publicar o comentário.',
      }),
  })

  const ordered = [...comments].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id,
  )

  return (
    <section aria-labelledby={`task-${taskId}-comments`}>
      <h3 id={`task-${taskId}-comments`} className="mb-2 text-sm font-semibold">
        Comentários ({comments.length})
      </h3>
      {ordered.length === 0 ? (
        <p className="mb-3 text-sm text-muted-foreground">Ainda sem comentários.</p>
      ) : (
        <ul className="mb-3 flex flex-col gap-3">
          {ordered.map((comment) => (
            <li key={comment.id} className="flex gap-2 text-sm">
              <Avatar className="h-7 w-7">
                <AvatarFallback>{comment.user ? initials(comment.user.name) : '?'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 rounded-md bg-muted p-2">
                <p className="mb-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {comment.user?.name ?? 'Utilizador removido'}
                  </span>
                  {' · '}
                  <time dateTime={comment.created_at}>{formatDateTime(comment.created_at)}</time>
                </p>
                <p className="whitespace-pre-wrap break-words">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-col gap-2"
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <Label htmlFor={inputId} className="sr-only">
          Novo comentário
        </Label>
        <Textarea
          placeholder="Escreva um comentário…"
          {...fieldA11y(inputId, errors.body)}
          {...register('body')}
        />
        <FieldError id={`${inputId}-error`} message={errors.body?.message} />
        <FormServerError message={errors.root?.server?.message} />
        <Button type="submit" disabled={mutation.isPending} className="self-end">
          {mutation.isPending ? 'A publicar…' : 'Comentar'}
        </Button>
      </form>
    </section>
  )
}
