import { useState, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Columns3, LayoutGrid, Pencil, Plus, Users } from 'lucide-react'
import { listProjectBoards } from '@/api/boards'
import { getProject } from '@/api/projects'
import { getProjectActivity, listTasks } from '@/api/tasks'
import { ActivityList } from '@/components/projects/ActivityList'
import { BacklogView } from '@/components/projects/BacklogView'
import { BoardFormDialog } from '@/components/projects/BoardFormDialog'
import { ColumnsManagerDialog } from '@/components/projects/ColumnsManagerDialog'
import { KanbanView } from '@/components/projects/KanbanView'
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog'
import { ProjectHowItWorks } from '@/components/projects/ProjectHowItWorks'
import { ProjectLinkBadges } from '@/components/projects/ProjectLinkBadges'
import { TaskFormDialog } from '@/components/projects/TaskFormDialog'
import { TaskListView } from '@/components/projects/TaskListView'
import { WorkspaceMembersDialog } from '@/components/projects/WorkspaceMembersDialog'
import { resolveSprintFilter } from '@/components/projects/sprintFilter'
import { TaskDetailDialog } from '@/components/projects/task-detail/TaskDetailDialog'
import {
  projectActivityKey,
  projectBoardsKey,
  projectKey,
  projectTasksFilterKey,
  projectTasksKey,
} from '@/components/projects/queryKeys'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { isForbidden } from '@/lib/errors'
import { formatDateRange } from '@/lib/format'
import { HELP } from '@/lib/help'
import {
  NO_PERMISSION_REASON,
  canEditProject,
  canEditTasks,
  permissionsOf,
} from '@/lib/projectPermissions'

const VIEWS = ['kanban', 'list', 'backlog', 'activity'] as const
type ProjectView = (typeof VIEWS)[number]

function parseView(value: string | null): ProjectView {
  return VIEWS.find((view) => view === value) ?? 'kanban'
}

/** Botão desactivado com a explicação ao lado quando falta permissão. */
function Restricted({
  allowed,
  reason,
  label,
  children,
}: {
  allowed: boolean
  reason: string
  label: string
  children: ReactNode
}) {
  return (
    <span className="flex items-center gap-0.5">
      {children}
      {!allowed && <InfoTooltip icon="lock" label={label} text={reason} />}
    </span>
  )
}

export default function KanbanBoardPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = Number(projectId)
  const [searchParams, setSearchParams] = useSearchParams()
  const view = parseView(searchParams.get('view'))
  const openTaskId = searchParams.get('task') ? Number(searchParams.get('task')) : null
  const selectedBoardParam = searchParams.get('board') ? Number(searchParams.get('board')) : null
  const membersOpen = searchParams.get('members') === '1'

  const [boardDialogOpen, setBoardDialogOpen] = useState(false)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)

  const projectQuery = useQuery({
    queryKey: projectKey(id),
    queryFn: () => getProject(id),
    enabled: !!id,
  })
  const boardsQuery = useQuery({
    queryKey: projectBoardsKey(id),
    queryFn: () => listProjectBoards(id),
    enabled: !!id,
  })
  const tasksQuery = useQuery({
    queryKey: projectTasksKey(id),
    queryFn: () => listTasks(id),
    enabled: !!id,
  })

  const activeSprint = projectQuery.data?.active_sprint ?? null
  const sprintFilter = resolveSprintFilter(searchParams.get('sprint'), activeSprint)
  // "Todas" partilha a lista completa; os outros filtros pedem à API (`?sprint=`).
  const kanbanQuery = useQuery({
    queryKey: projectTasksFilterKey(id, sprintFilter),
    queryFn: () => listTasks(id, { sprint: sprintFilter }),
    enabled: !!id && projectQuery.isSuccess && sprintFilter !== 'all',
  })

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
  const changeSprintFilter = (next: string) => updateParams((p) => p.set('sprint', next))
  const setMembersOpen = (open: boolean) =>
    updateParams((p) => (open ? p.set('members', '1') : p.delete('members')))

  if (projectQuery.isLoading || boardsQuery.isLoading || tasksQuery.isLoading)
    return <LoadingState />
  if (projectQuery.isError || boardsQuery.isError || tasksQuery.isError) {
    const error = projectQuery.error ?? boardsQuery.error ?? tasksQuery.error
    return (
      <ErrorState
        message={
          isForbidden(error)
            ? 'Não tem acesso a este projecto.'
            : 'Não foi possível carregar o projecto.'
        }
      />
    )
  }

  const project = projectQuery.data
  const can = permissionsOf(project)
  const boards = boardsQuery.data ?? []
  const board =
    boards.find((b) => b.id === selectedBoardParam) ??
    boards.find((b) => b.is_default) ??
    boards[0] ??
    null
  const columns = [...(board?.columns ?? [])].sort((a, b) => a.position - b.position || a.id - b.id)
  const allColumns = boards.flatMap((b) => b.columns ?? [])
  const columnIds = new Set(columns.map((c) => c.id))
  const allTasks = tasksQuery.data ?? []
  // Com vários quadros, o Kanban e a Lista mostram só as tarefas das colunas do quadro escolhido.
  const onBoard = <T extends { board_column_id: number }>(list: T[]) =>
    boards.length > 1 ? list.filter((t) => columnIds.has(t.board_column_id)) : list
  const boardTasks = onBoard(allTasks)
  const kanbanTasks = sprintFilter === 'all' ? boardTasks : onBoard(kanbanQuery.data ?? [])
  const openTask = (task: { id: number }) => setOpenTask(task.id)
  const newTaskSprintId = sprintFilter === 'active' ? (activeSprint?.id ?? null) : null

  const kanbanEmpty =
    sprintFilter === 'active'
      ? {
          title: `O sprint activo “${activeSprint?.name ?? ''}” ainda não tem tarefas`,
          description:
            'No separador Backlog, passe tarefas do backlog do projecto para este sprint, ou crie uma nova.',
        }
      : sprintFilter === 'backlog'
        ? {
            title: 'O backlog do projecto está vazio',
            description: 'Todas as tarefas já estão planeadas em sprints.',
          }
        : {
            title: 'Ainda não há tarefas neste quadro',
            description: 'Use “Nova tarefa” para criar a primeira.',
          }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <h1 className="text-xl font-semibold">
            {project?.key} · {project?.name}
          </h1>
          <InfoTooltip {...HELP.structure} />
          {project && canEditProject(can) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Editar projecto"
              onClick={() => setProjectDialogOpen(true)}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
        {project && <ProjectLinkBadges project={project} />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {board && boards.length > 1 && (
          <div className="flex items-center gap-1">
            <Label htmlFor="board-select" className="text-sm">
              Quadro
            </Label>
            <InfoTooltip {...HELP.board} />
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
        {can.manage_members && (
          <Button variant="outline" size="sm" onClick={() => setMembersOpen(true)}>
            <Users className="h-4 w-4" aria-hidden="true" />
            Membros
          </Button>
        )}
        {can.manage_board && (
          <>
            <Button variant="outline" size="sm" onClick={() => setBoardDialogOpen(true)}>
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              Novo quadro
            </Button>
            {board && (
              <Button variant="outline" size="sm" onClick={() => setColumnsDialogOpen(true)}>
                <Columns3 className="h-4 w-4" aria-hidden="true" />
                Gerir colunas
              </Button>
            )}
          </>
        )}
        {board && (
          <Restricted
            allowed={can.create_task}
            reason={NO_PERMISSION_REASON.create_task}
            label="Nova tarefa"
          >
            <Button
              size="sm"
              disabled={columns.length === 0 || !can.create_task}
              onClick={() => setTaskDialogOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nova tarefa
            </Button>
          </Restricted>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-full flex-col gap-4">
      {header}
      <ProjectHowItWorks can={can} />

      {!board ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium">Este projecto ainda não tem nenhum quadro.</p>
          {can.manage_board ? (
            <>
              <p className="text-sm text-muted-foreground">
                Crie um quadro Kanban para começar a organizar as tarefas.
              </p>
              <Button onClick={() => setBoardDialogOpen(true)}>
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                Criar quadro
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Peça a um gestor do workspace para criar o quadro.
            </p>
          )}
        </div>
      ) : columns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium">O quadro “{board.name}” ainda não tem colunas.</p>
          {can.manage_board ? (
            <Button onClick={() => setColumnsDialogOpen(true)}>
              <Columns3 className="h-4 w-4" aria-hidden="true" />
              Adicionar colunas
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Peça a um gestor do workspace para adicionar colunas.
            </p>
          )}
        </div>
      ) : (
        <Tabs value={view} onValueChange={changeView} className="flex flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-1 self-start">
            <TabsList aria-label="Vistas do projecto">
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="list">Lista</TabsTrigger>
              <TabsTrigger value="backlog">Backlog</TabsTrigger>
              <TabsTrigger value="activity">Actividade</TabsTrigger>
            </TabsList>
            <span className="flex items-center" role="group" aria-label="Ajuda sobre as vistas">
              <InfoTooltip {...HELP.viewKanban} />
              <InfoTooltip {...HELP.viewList} />
              <InfoTooltip {...HELP.viewBacklog} />
              <InfoTooltip {...HELP.viewActivity} />
            </span>
          </div>

          <TabsContent value="kanban" className="flex flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="kanban-sprint-filter" className="text-sm">
                Mostrar
              </Label>
              <Select value={sprintFilter} onValueChange={changeSprintFilter}>
                <SelectTrigger id="kanban-sprint-filter" className="w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeSprint && (
                    <SelectItem value="active">Sprint activo: {activeSprint.name}</SelectItem>
                  )}
                  <SelectItem value="all">Todas as tarefas</SelectItem>
                  <SelectItem value="backlog">Só backlog</SelectItem>
                </SelectContent>
              </Select>
              <InfoTooltip {...HELP.kanbanFilter} />
              {sprintFilter === 'active' &&
                activeSprint &&
                (activeSprint.starts_at || activeSprint.ends_at) && (
                  <span className="text-xs text-muted-foreground">
                    Decorre {formatDateRange(activeSprint.starts_at, activeSprint.ends_at)}
                    {activeSprint.goal && <> · {activeSprint.goal}</>}
                  </span>
                )}
            </div>
            {!activeSprint && (
              <div
                role="status"
                className="flex flex-wrap items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm"
              >
                <span>
                  Sem sprint activo, por isso estão a ser mostradas todas as tarefas. Planeie um
                  sprint no Backlog.
                </span>
                <Button
                  size="sm"
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => changeView('backlog')}
                >
                  Ir para o Backlog
                </Button>
              </div>
            )}
            {sprintFilter !== 'all' && kanbanQuery.isLoading ? (
              <LoadingState label="A carregar tarefas…" />
            ) : sprintFilter !== 'all' && kanbanQuery.isError ? (
              <ErrorState message="Não foi possível carregar as tarefas." />
            ) : (
              <>
                {kanbanTasks.length === 0 && <EmptyState {...kanbanEmpty} />}
                <KanbanView
                  projectId={id}
                  columns={columns}
                  tasks={kanbanTasks}
                  onOpenTask={openTask}
                  canMove={canEditTasks(can)}
                />
              </>
            )}
          </TabsContent>
          <TabsContent value="list">
            <TaskListView
              projectId={id}
              columns={columns}
              tasks={boardTasks}
              onOpenTask={openTask}
            />
          </TabsContent>
          <TabsContent value="backlog">
            <BacklogView
              projectId={id}
              columns={allColumns}
              boardColumns={columns}
              tasks={allTasks}
              can={can}
              onOpenTask={openTask}
            />
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

      <TaskDetailDialog
        taskId={openTaskId}
        onClose={() => setOpenTask(null)}
        onOpenTask={setOpenTask}
      />
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
        <TaskFormDialog
          open
          projectId={id}
          columns={columns}
          defaultSprintId={view === 'kanban' ? newTaskSprintId : null}
          onOpenChange={setTaskDialogOpen}
        />
      )}
      {projectDialogOpen && project && (
        <ProjectFormDialog open project={project} onOpenChange={setProjectDialogOpen} />
      )}
      {membersOpen && project && can.manage_members && (
        <WorkspaceMembersDialog
          workspaceId={project.workspace_id}
          open
          onOpenChange={setMembersOpen}
        />
      )}
    </div>
  )
}
