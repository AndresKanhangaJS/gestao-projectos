import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { syncAssignees, toggleWatch, updateTask } from '@/api/tasks'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { mutationErrorMessage } from '@/lib/errors'
import { HELP } from '@/lib/help'
import type { Task, UserSummary } from '@/types/projects'
import { AssigneePicker } from '../AssigneePicker'
import { LabelChip, LabelPicker } from '../LabelPicker'

export function MutationError({ error, fallback }: { error: unknown; fallback?: string }) {
  if (!error) return null
  return (
    <p className="text-sm text-destructive" role="alert">
      {mutationErrorMessage(error, fallback)}
    </p>
  )
}

/** Título de secção do detalhe da tarefa, com ajuda contextual opcional. */
export function SectionHeading({
  id,
  children,
  help,
}: {
  id: string
  children: React.ReactNode
  help?: { label: string; text: string }
}) {
  return (
    <div className="mb-2 flex items-center gap-1">
      <h3 id={id} className="text-sm font-semibold">
        {children}
      </h3>
      {help && <InfoTooltip label={help.label} text={help.text} />}
    </div>
  )
}

/**
 * Responsáveis: só membros do workspace do projecto que não sejam leitores (a API rejeita
 * outros com 422); cada alteração sincroniza imediatamente. Em leitura, mostra só os nomes.
 */
export function AssigneesSection({
  task,
  onAssigneesChanged,
  readOnly = false,
}: {
  task: Task
  /** Recebe a lista actualizada devolvida pela API. */
  onAssigneesChanged: (assignees: UserSummary[]) => void
  readOnly?: boolean
}) {
  const mutation = useMutation({
    mutationFn: (userIds: number[]) => syncAssignees(task.id, userIds),
    onSuccess: onAssigneesChanged,
  })
  const assigned = task.assignees ?? []
  const headingId = `task-${task.id}-assignees`

  return (
    <section aria-labelledby={headingId}>
      <SectionHeading id={headingId} help={HELP.assignees}>
        Responsáveis
      </SectionHeading>
      {readOnly ? (
        assigned.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem responsáveis.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {assigned.map((a) => (
              <Badge key={a.id} variant="secondary">
                {a.name}
              </Badge>
            ))}
          </div>
        )
      ) : (
        <AssigneePicker
          projectId={task.project_id}
          idPrefix={`task-${task.id}`}
          value={assigned.map((a) => a.id)}
          current={assigned}
          disabled={mutation.isPending}
          onChange={(ids) => mutation.mutate(ids)}
        />
      )}
      <MutationError
        error={mutation.error}
        fallback="Não foi possível actualizar os responsáveis."
      />
    </section>
  )
}

/** Etiquetas da tarefa (selecção/criação de etiquetas do projecto); grava via `label_ids`. */
export function LabelsSection({
  task,
  onUpdated,
  readOnly = false,
}: {
  task: Task
  onUpdated: (task: Task) => void
  readOnly?: boolean
}) {
  const mutation = useMutation({
    mutationFn: (labelIds: number[]) => updateTask(task.id, { label_ids: labelIds }),
    onSuccess: onUpdated,
  })
  const headingId = `task-${task.id}-labels`
  const labels = task.labels ?? []

  return (
    <section aria-labelledby={headingId}>
      <SectionHeading id={headingId} help={HELP.labels}>
        Etiquetas
      </SectionHeading>
      {readOnly ? (
        labels.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem etiquetas.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {labels.map((label) => (
              <LabelChip key={label.id} label={label} />
            ))}
          </div>
        )
      ) : (
        <LabelPicker
          projectId={task.project_id}
          idPrefix={`task-${task.id}`}
          value={labels.map((l) => l.id)}
          onChange={(ids) => mutation.mutate(ids)}
          disabled={mutation.isPending}
        />
      )}
      <MutationError error={mutation.error} fallback="Não foi possível actualizar as etiquetas." />
    </section>
  )
}

/** Botão "Seguir"/"Deixar de seguir": quem segue recebe notificações da tarefa. */
export function WatchButton({
  task,
  onWatchersChanged,
}: {
  task: Task
  onWatchersChanged: (watchers: UserSummary[]) => void
}) {
  const { user } = useAuth()
  const watching = !!user && (task.watchers ?? []).some((w) => w.id === user.id)
  const mutation = useMutation({
    mutationFn: () => toggleWatch(task.id),
    onSuccess: onWatchersChanged,
  })
  const count = task.watchers?.length ?? 0

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant={watching ? 'secondary' : 'outline'}
          aria-pressed={watching}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {watching ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
          {watching ? 'Deixar de seguir' : 'Seguir'}
          <span className="text-xs text-muted-foreground">({count})</span>
        </Button>
        <InfoTooltip {...HELP.watch} />
      </div>
      <MutationError error={mutation.error} fallback="Não foi possível alterar o seguimento." />
    </div>
  )
}
