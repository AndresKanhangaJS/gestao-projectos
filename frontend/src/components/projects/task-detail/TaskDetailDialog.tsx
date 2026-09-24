import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { deleteTask, getTask, getTaskActivity } from '@/api/tasks'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { ErrorState, LoadingState } from '@/components/ui/Spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { isForbidden } from '@/lib/errors'
import { PRIORITY_LABEL, PRIORITY_VARIANT, TASK_TYPE_LABEL } from '@/lib/labels'
import type { Task, UserSummary } from '@/types/projects'
import { ActivityList } from '../ActivityList'
import { projectActivityKey, projectTasksKey, taskActivityKey, taskKey } from '../queryKeys'
import { AttachmentsSection } from './AttachmentsSection'
import { AssigneesSection, LabelsSection, WatchButton } from './PeopleAndLabels'
import { RelationsSection } from './RelationsSection'
import { SubtasksSection, CommentsSection } from './SubtasksAndComments'
import { TaskFieldsForm } from './TaskFieldsForm'

/**
 * Detalhe de uma tarefa: edição de campos, responsáveis, etiquetas, seguir, subtarefas,
 * relações, anexos, comentários e separador de actividade.
 */
export function TaskDetailDialog({
  taskId,
  onClose,
  onOpenTask,
}: {
  taskId: number | null
  onClose: () => void
  /** Abre outra tarefa (subtarefa ou tarefa relacionada) no mesmo diálogo. */
  onOpenTask?: (taskId: number) => void
}) {
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null)

  const taskQuery = useQuery({
    queryKey: taskKey(taskId ?? 0),
    queryFn: () => getTask(taskId as number),
    enabled: taskId != null,
  })
  const task = taskQuery.data

  function invalidateRelated(projectId: number, id: number) {
    queryClient.invalidateQueries({ queryKey: taskKey(id) })
    queryClient.invalidateQueries({ queryKey: projectTasksKey(projectId) })
    queryClient.invalidateQueries({ queryKey: taskActivityKey(id) })
    queryClient.invalidateQueries({ queryKey: projectActivityKey(projectId) })
  }

  /** As respostas de escrita não incluem comentários/subtarefas/observadores — preserva-os. */
  function handleUpdated(updated: Task) {
    queryClient.setQueryData<Task>(taskKey(updated.id), (old) =>
      old
        ? { ...old, ...updated, comments: old.comments, subtasks: old.subtasks, watchers: updated.watchers ?? old.watchers }
        : updated,
    )
    invalidateRelated(updated.project_id, updated.id)
  }

  function handleWatchers(watchers: UserSummary[]) {
    if (!task) return
    queryClient.setQueryData<Task>(taskKey(task.id), (old) => (old ? { ...old, watchers } : old))
  }

  const openTask = (id: number) => onOpenTask?.(id)

  return (
    <Dialog open={taskId != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {taskQuery.isLoading ? (
          <>
            <DialogTitle className="sr-only">A carregar tarefa</DialogTitle>
            <LoadingState />
          </>
        ) : taskQuery.isError || !task ? (
          <>
            <DialogTitle className="sr-only">Erro</DialogTitle>
            <ErrorState
              message={
                isForbidden(taskQuery.error)
                  ? 'Não tem permissão para ver esta tarefa.'
                  : 'Não foi possível carregar a tarefa.'
              }
            />
          </>
        ) : (
          <>
            <DialogHeader className="pr-8">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{TASK_TYPE_LABEL[task.type]}</Badge>
                  <Badge variant={PRIORITY_VARIANT[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
                  {task.column && <Badge variant="secondary">{task.column.name}</Badge>}
                  {task.parent_id != null && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => openTask(task.parent_id as number)}
                    >
                      Ver tarefa-mãe
                    </button>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <WatchButton task={task} onWatchersChanged={handleWatchers} />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setConfirmDelete(task)}
                    aria-label="Apagar tarefa"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <DialogTitle>
                #{task.id} · {task.title}
              </DialogTitle>
              <DialogDescription>
                Criada por {task.reporter?.name ?? '—'}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details">
              <TabsList aria-label="Secções da tarefa">
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="activity">Actividade</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex flex-col gap-6 pt-2">
                <TaskFieldsForm key={task.id} task={task} onSaved={handleUpdated} />
                <AssigneesSection task={task} onUpdated={handleUpdated} />
                <LabelsSection task={task} onUpdated={handleUpdated} />
                <SubtasksSection
                  taskId={task.id}
                  subtasks={task.subtasks ?? []}
                  onOpenTask={openTask}
                  onChanged={() => invalidateRelated(task.project_id, task.id)}
                />
                <RelationsSection taskId={task.id} projectId={task.project_id} onOpenTask={openTask} />
                <AttachmentsSection taskId={task.id} onChanged={() => invalidateRelated(task.project_id, task.id)} />
                <CommentsSection
                  taskId={task.id}
                  comments={task.comments ?? []}
                  onChanged={() => invalidateRelated(task.project_id, task.id)}
                />
              </TabsContent>

              <TabsContent value="activity" className="pt-2">
                <ActivityList queryKey={taskActivityKey(task.id)} fetchPage={(page) => getTaskActivity(task.id, page)} />
              </TabsContent>
            </Tabs>

            <DeleteConfirmDialog
              item={confirmDelete}
              onClose={() => setConfirmDelete(null)}
              title="Apagar tarefa?"
              description={confirmDelete ? `A tarefa “${confirmDelete.title}” será removida.` : undefined}
              remove={(t) => deleteTask(t.id)}
              onDeleted={(t) => {
                queryClient.removeQueries({ queryKey: taskKey(t.id) })
                queryClient.invalidateQueries({ queryKey: projectTasksKey(t.project_id) })
                queryClient.invalidateQueries({ queryKey: projectActivityKey(t.project_id) })
                onClose()
              }}
              errorFallback="Não foi possível apagar a tarefa."
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
