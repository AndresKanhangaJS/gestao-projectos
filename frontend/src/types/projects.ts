import type { User } from './auth'

export type TaskType = 'epic' | 'story' | 'task' | 'bug'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ProjectStatus = 'active' | 'archived'
export type SprintStatus = 'planned' | 'active' | 'completed'
export type WorkspaceRole = 'owner' | 'manager' | 'member' | 'viewer'
export type TaskRelationType = 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates'
/** Filtro de sprint de `GET /projects/{project}/tasks?sprint=`. */
export type TaskSprintFilter = 'active' | 'backlog' | 'all'

/**
 * Permissões do utilizador autenticado sobre o workspace/projecto, calculadas pelo backend
 * (`can` em `ProjectResource`/`WorkspaceResource`). Servem só para UX; a API continua a validar.
 */
export interface ProjectPermissions {
  create_task: boolean
  delete_task: boolean
  manage_board: boolean
  manage_sprints: boolean
  manage_members: boolean
  /** Criar etiquetas (= create_task). Opcional: versões antigas da API não o enviam. */
  create_label?: boolean
  /** Só em `WorkspaceResource.can`: criar projectos neste workspace. */
  create_project?: boolean
  /** Editar os dados do projecto (nome, descrição, ligação ao cliente). Opcional na API. */
  update_project?: boolean
}

/** Referência curta (id + nome) usada nas ligações projecto ↔ software/cliente/módulos. */
export interface NamedRef {
  id: number
  name: string
}

/** Resposta de `GET /projects/link-options`: o que se pode ligar a um projecto. */
export interface ProjectLinkOptions {
  software_products: {
    id: number
    name: string
    modules: NamedRef[]
    /** Clientes com este software instalado e os módulos activos na instalação. */
    clients: { id: number; name: string; all_modules: boolean; module_ids: number[] }[]
  }[]
}

/** Projecto resumido nas vistas de Infra (overview de cliente e de software). */
export interface ProjectSummaryRef {
  id: number
  key: string
  name: string
  status: ProjectStatus
  workspace_id: number
}

/** Resumo de utilizador devolvido pelo `UserSummaryResource` (id, nome e, por vezes, email). */
export interface UserSummary {
  id: number
  name: string
  email?: string
}

/** Membro de workspace (`WorkspaceResource.members`), com o papel no workspace. */
export interface WorkspaceMember extends UserSummary {
  role?: WorkspaceRole | null
}

export interface Workspace {
  id: number
  name: string
  slug: string
  description: string | null
  owner?: UserSummary | null
  my_role?: WorkspaceRole | null
  can?: ProjectPermissions
  members?: WorkspaceMember[]
  members_count?: number
  projects_count?: number
  created_at: string
}

export interface Project {
  id: number
  workspace_id: number
  key: string
  name: string
  description: string | null
  status: ProjectStatus
  my_role?: WorkspaceRole | null
  can?: ProjectPermissions
  active_sprint?: ActiveSprintSummary | null
  /** Ligação opcional a um produto de software, a um cliente que o usa e a módulos. */
  software_product?: NamedRef | null
  client?: NamedRef | null
  modules?: NamedRef[]
  tasks_count?: number
  created_at: string
}

/** Resumo do sprint activo incluído em `ProjectResource.active_sprint`. */
export interface ActiveSprintSummary {
  id: number
  name: string
  starts_at: string | null
  ends_at: string | null
  goal: string | null
}

export interface Board {
  id: number
  project_id: number
  name: string
  is_default: boolean
  columns?: BoardColumn[]
}

export interface BoardColumn {
  id: number
  board_id: number
  name: string
  position: number
  color: string | null
  is_done_column: boolean
  tasks_count?: number
}

export interface Sprint {
  id: number
  project_id: number
  name: string
  goal: string | null
  starts_at: string | null
  ends_at: string | null
  status: SprintStatus
  tasks_count?: number
  created_at?: string
}

export interface Label {
  id: number
  project_id?: number
  name: string
  color: string | null
}

export interface TaskComment {
  id: number
  task_id?: number
  body: string
  user: UserSummary | null
  created_at: string
}

export interface TaskRelation {
  id: number
  task_id: number
  related_task_id: number
  type: TaskRelationType
  related_task?: Task
}

export interface TaskAttachment {
  id: number
  task_id: number
  original_name: string
  /** Endpoint autenticado de download: usar `downloadAttachment` (blob via axios), nunca link directo. */
  download_url?: string
  uploader?: UserSummary | null
  created_at: string
}

/** Subtarefa resumida (`SubtaskResource`), incluída em `GET tasks/{task}`. */
export interface SubtaskSummary {
  id: number
  title: string
  type: TaskType
  priority: TaskPriority
  board_column_id: number
  column: { id: number; name: string; is_done_column: boolean } | null
  completed: boolean
  position: number
}

export interface Task {
  id: number
  project_id: number
  board_column_id: number
  sprint_id: number | null
  parent_id: number | null
  /** O TaskResource devolve o objecto `reporter` (quando carregado), não `reporter_id`. */
  reporter?: UserSummary | null
  type: TaskType
  priority: TaskPriority
  title: string
  description: string | null
  estimate: number | null
  starts_at: string | null
  due_at: string | null
  position: number
  assignees?: UserSummary[]
  watchers?: UserSummary[]
  labels?: Label[]
  /** Só presentes em `GET tasks/{task}`. */
  comments?: TaskComment[]
  subtasks?: SubtaskSummary[]
  column?: { id: number; name: string; is_done_column: boolean } | null
  comments_count?: number
  subtasks_count?: number
  attachments_count?: number
  created_at: string
}

export interface ActivityEntry {
  id: number
  action: string
  description: string
  actor: UserSummary | null
  task?: { id: number; title: string | null; deleted: boolean }
  changes: Record<string, unknown> | null
  created_at: string
}

/** Resposta de `GET /projects/dashboard`. `by_status` é opcional (versões recentes da API). */
export interface DashboardData {
  projects_count: number
  tasks_count: number
  tasks_by_priority: Record<string, number>
  tasks_by_type: Record<string, number>
  projects_by_status: Record<string, number>
  overdue_tasks_count: number
  tasks_per_assignee: { id: number; name: string; total: number }[]
  by_status?: { name: string; is_done_column?: boolean; total: number }[] | Record<string, number>
}

// Re-exportado por conveniência para quem só precisa do tipo base.
export type { User }
