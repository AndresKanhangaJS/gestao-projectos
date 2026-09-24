import { useMutation, useQuery } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { getProject } from '@/api/projects'
import { syncAssignees, toggleWatch, updateTask } from '@/api/tasks'
import { getWorkspace } from '@/api/workspaces'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Label } from '@/components/ui/Label'
import { Spinner } from '@/components/ui/Spinner'
import { mutationErrorMessage } from '@/lib/errors'
import type { Task, UserSummary } from '@/types/projects'
import { LabelPicker } from '../LabelPicker'
import { projectKey, workspaceKey } from '../queryKeys'

export function MutationError({ error, fallback }: { error: unknown; fallback?: string }) {
  if (!error) return null
  return (
    <p className="text-sm text-destructive" role="alert">
      {mutationErrorMessage(error, fallback)}
    </p>
  )
}

/** Responsáveis: membros do workspace do projecto, com checkbox que sincroniza imediatamente. */
export function AssigneesSection({ task, onUpdated }: { task: Task; onUpdated: (task: Task) => void }) {
  const projectQuery = useQuery({ queryKey: projectKey(task.project_id), queryFn: () => getProject(task.project_id) })
  const workspaceId = projectQuery.data?.workspace_id
  const workspaceQuery = useQuery({
    queryKey: workspaceKey(workspaceId ?? 0),
    queryFn: () => getWorkspace(workspaceId as number),
    enabled: workspaceId != null,
  })

  const mutation = useMutation({
    mutationFn: (userIds: number[]) => syncAssignees(task.id, userIds),
    onSuccess: onUpdated,
  })

  const assigned = task.assignees ?? []
  const assignedIds = new Set(assigned.map((a) => a.id))
  // Candidatos = membros do workspace + responsáveis actuais que já não sejam membros.
  const candidates: UserSummary[] = [
    ...(workspaceQuery.data?.members ?? []),
    ...assigned.filter((a) => !(workspaceQuery.data?.members ?? []).some((m) => m.id === a.id)),
  ]

  function toggle(userId: number, checked: boolean) {
    const next = checked ? [...assignedIds, userId] : [...assignedIds].filter((id) => id !== userId)
    mutation.mutate(next)
  }

  return (
    <section aria-labelledby={`task-${task.id}-assignees`}>
      <h3 id={`task-${task.id}-assignees`} className="mb-2 text-sm font-semibold">
        Responsáveis
      </h3>
      {projectQuery.isLoading || workspaceQuery.isLoading ? (
        <Spinner />
      ) : candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem membros disponíveis no workspace.</p>
      ) : (
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {candidates.map((user) => {
            const inputId = `task-${task.id}-assignee-${user.id}`
            return (
              <li key={user.id} className="flex items-center gap-1.5">
                <Checkbox
                  id={inputId}
                  checked={assignedIds.has(user.id)}
                  disabled={mutation.isPending}
                  onCheckedChange={(checked) => toggle(user.id, checked === true)}
                />
                <Label htmlFor={inputId} className="font-normal">
                  {user.name}
                </Label>
              </li>
            )
          })}
        </ul>
      )}
      {workspaceQuery.isError && assigned.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {assigned.map((a) => (
            <Badge key={a.id} variant="secondary">
              {a.name}
            </Badge>
          ))}
        </div>
      )}
      <MutationError error={mutation.error} fallback="Não foi possível actualizar os responsáveis." />
    </section>
  )
}

/** Etiquetas da tarefa (selecção/criação de etiquetas do projecto); grava via `label_ids`. */
export function LabelsSection({ task, onUpdated }: { task: Task; onUpdated: (task: Task) => void }) {
  const mutation = useMutation({
    mutationFn: (labelIds: number[]) => updateTask(task.id, { label_ids: labelIds }),
    onSuccess: onUpdated,
  })

  return (
    <section aria-labelledby={`task-${task.id}-labels`}>
      <h3 id={`task-${task.id}-labels`} className="mb-2 text-sm font-semibold">
        Etiquetas
      </h3>
      <LabelPicker
        projectId={task.project_id}
        idPrefix={`task-${task.id}`}
        value={(task.labels ?? []).map((l) => l.id)}
        onChange={(ids) => mutation.mutate(ids)}
        disabled={mutation.isPending}
      />
      <MutationError error={mutation.error} fallback="Não foi possível actualizar as etiquetas." />
    </section>
  )
}

/** Botão "Seguir"/"Deixar de seguir" (observadores recebem notificações da tarefa). */
export function WatchButton({
  task,
  onWatchersChanged,
}: {
  task: Task
  onWatchersChanged: (watchers: UserSummary[]) => void
}) {
  const { user } = useAuth()
  const watching = !!user && (task.watchers ?? []).some((w) => w.id === user.id)
  const mutation = useMutation({ mutationFn: () => toggleWatch(task.id), onSuccess: onWatchersChanged })
  const count = task.watchers?.length ?? 0

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={watching ? 'secondary' : 'outline'}
        aria-pressed={watching}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {watching ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        {watching ? 'Deixar de seguir' : 'Seguir'}
        <span className="text-xs text-muted-foreground">({count})</span>
      </Button>
      <MutationError error={mutation.error} fallback="Não foi possível alterar o seguimento." />
    </div>
  )
}
