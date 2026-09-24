import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Columns3, LayoutGrid, Plus } from 'lucide-react'
import { listProjectBoards } from '@/api/boards'
import { getProject } from '@/api/projects'
import { getProjectActivity, listTasks } from '@/api/tasks'
import { ActivityList } from '@/components/projects/ActivityList'
import { BacklogView } from '@/components/projects/BacklogView'
import { BoardFormDialog } from '@/components/projects/BoardFormDialog'
import { ColumnsManagerDialog } from '@/components/projects/ColumnsManagerDialog'
import { KanbanView } from '@/components/projects/KanbanView'
import { TaskFormDialog } from '@/components/projects/TaskFormDialog'
import { TaskListView } from '@/components/projects/TaskListView'
import { TaskDetailDialog } from '@/components/projects/task-detail/TaskDetailDialog'
import { projectActivityKey, projectBoardsKey, projectKey, projectTasksKey } from '@/components/projects/queryKeys'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { isForbidden } from '@/lib/errors'

const VIEWS = ['kanban', 'list', 'backlog', 'activity'] as const
type ProjectView = (typeof VIEWS)[number]

function parseView(value: string | null): ProjectView {
  return VIEWS.find((view) => view === value) ?? 'kanban'
}

export default function KanbanBoardPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = Number(projectId)
  const [searchParams, setSearchParams] = useSearchParams()
  const view = parseView(searchParams.get('view'))
  const openTaskId = searchParams.get('task') ? Number(searchParams.get('task')) : null
  const selectedBoardParam = searchParams.get('board') ? Number(searchParams.get('board')) : null

  const [boardDialogOpen, setBoardDialogOpen] = useState(false)
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)

  const projectQuery = useQuery({ queryKey: projectKey(id), queryFn: () => getProject(id), enabled: !!id })
  const boardsQuery = useQuery({ queryKey: projectBoardsKey(id), queryFn: () => listProjectBoards(id), enabled: !!id })
  const tasksQuery = useQuery({ queryKey: projectTasksKey(id), queryFn: () => listTasks(id), enabled: !!id })

  function updateParams(mutate: (params: URLSearchParams) => void) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        mutate(params)
        return params
      },
      { replace: true },
    )
  }

  const changeView = (next: string) =>
    updateParams((p) => (next === 'kanban' ? p.delete('view') : p.set('view', next)))
  const setOpenTask = (taskId: number | null) =>
    updateParams((p) => (taskId == null ? p.delete('task') : p.set('task', String(taskId))))
  const selectBoard = (boardId: number) => updateParams((p) => p.set('board', String(boardId)))

  if (projectQuery.isLoading || boardsQuery.isLoading || tasksQuery.isLoading) return <LoadingState />
  if (projectQuery.isError || boardsQuery.isError || tasksQuery.isError) {
    const error = projectQuery.error ?? boardsQuery.error ?? tasksQuery.error
    return (
      <ErrorState
        message={isForbidden(error) ? 'Não tem acesso a este projecto.' : 'Não foi possível carregar o projecto.'}
      />
    )
  }

  const project = projectQuery.data
  const boards = boardsQuery.data ?? []
  const board =
    boards.find((b) => b.id === selectedBoardParam) ?? boards.find((b) => b.is_default) ?? boards[0] ?? null
  const columns = [...(board?.columns ?? [])].sort((a, b) => a.position - b.position || a.id - b.id)
  const columnIds = new Set(columns.map((c) => c.id))
  const allTasks = tasksQuery.data ?? []
  // Com vários quadros, cada vista de quadro mostra só as tarefas das suas colunas.
  const tasks = boards.length > 1 ? allTasks.filter((t) => columnIds.has(t.board_column_id)) : allTasks
  const openTask = (task: { id: number }) => setOpenTask(task.id)

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold">
        {project?.key} · {project?.name}
      </h1>
      {board && (
        <div className="flex flex-wrap items-center gap-2">
          {boards.length > 1 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="board-select" className="text-sm">
                Quadro
              </Label>
              <Select value={String(board.id)} onValueChange={(value) => selectBoard(Number(value))}>
                <SelectTrigger id="board-select" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                      {b.is_default ? ' (por omissão)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setBoardDialogOpen(true)}>
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Novo quadro
          </Button>
          <Button variant="outline" size="sm" onClick={() => setColumnsDialogOpen(true)}>
            <Columns3 className="h-4 w-4" aria-hidden="true" />
            Gerir colunas
          </Button>
          <Button size="sm" disabled={columns.length === 0} onClick={() => setTaskDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova tarefa
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-full flex-col gap-4">
      {header}

      {!board ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium">Este projecto ainda não tem nenhum quadro.</p>
          <p className="text-sm text-muted-foreground">Crie um quadro Kanban para começar a organizar as tarefas.</p>
          <Button onClick={() => setBoardDialogOpen(true)}>
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Criar quadro
          </Button>
        </div>
      ) : columns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium">O quadro “{board.name}” ainda não tem colunas.</p>
          <Button onClick={() => setColumnsDialogOpen(true)}>
            <Columns3 className="h-4 w-4" aria-hidden="true" />
            Adicionar colunas
          </Button>
        </div>
      ) : (
        <Tabs value={view} onValueChange={changeView} className="flex flex-1 flex-col">
          <TabsList aria-label="Vistas do projecto" className="self-start">
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="backlog">Backlog</TabsTrigger>
            <TabsTrigger value="activity">Actividade</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="flex flex-1 flex-col">
            {tasks.length === 0 && (
              <EmptyState title="Ainda não há tarefas neste quadro" description="Use “Nova tarefa” para criar a primeira." />
            )}
            <KanbanView projectId={id} columns={columns} tasks={tasks} onOpenTask={openTask} />
          </TabsContent>
          <TabsContent value="list">
            <TaskListView columns={columns} tasks={tasks} onOpenTask={openTask} />
          </TabsContent>
          <TabsContent value="backlog">
            <BacklogView projectId={id} columns={columns} tasks={tasks} onOpenTask={openTask} />
          </TabsContent>
          <TabsContent value="activity">
            <ActivityList
              queryKey={projectActivityKey(id)}
              fetchPage={(page) => getProjectActivity(id, page)}
              showTask
              onOpenTask={setOpenTask}
            />
          </TabsContent>
        </Tabs>
      )}

      <TaskDetailDialog taskId={openTaskId} onClose={() => setOpenTask(null)} onOpenTask={setOpenTask} />
      {boardDialogOpen && (
        <BoardFormDialog
          open
          projectId={id}
          isFirstBoard={boards.length === 0}
          onOpenChange={setBoardDialogOpen}
          onCreated={(created) => selectBoard(created.id)}
        />
      )}
      {board && (
        <ColumnsManagerDialog
          projectId={id}
          board={board}
          open={columnsDialogOpen}
          onOpenChange={setColumnsDialogOpen}
        />
      )}
      {taskDialogOpen && board && (
        <TaskFormDialog open projectId={id} columns={columns} onOpenChange={setTaskDialogOpen} />
      )}
    </div>
  )
}
