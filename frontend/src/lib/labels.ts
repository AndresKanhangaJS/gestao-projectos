import type { SprintStatus, TaskPriority, TaskRelationType, TaskType } from '@/types/projects'
import type {
  BackupFrequency,
  ClientSoftwareStatus,
  ClientStatus,
  CredentialType,
  DeploymentComponent,
  DeploymentStatus,
  MachineAccessType,
  MachineEnvironment,
} from '@/types/infra'

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

/** Ordem usada para ordenar por prioridade (maior = mais prioritário). */
export const PRIORITY_RANK: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2, urgent: 3 }

export const PRIORITY_VARIANT: Record<TaskPriority, 'secondary' | 'warning' | 'destructive'> = {
  low: 'secondary',
  medium: 'secondary',
  high: 'warning',
  urgent: 'destructive',
}

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  epic: 'Épico',
  story: 'História',
  task: 'Tarefa',
  bug: 'Bug',
}

export const TASK_RELATION_LABEL: Record<TaskRelationType, string> = {
  blocks: 'Bloqueia',
  blocked_by: 'Bloqueada por',
  relates_to: 'Relacionada com',
  duplicates: 'Duplica',
}

export const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  planned: 'Planeado',
  active: 'Activo',
  completed: 'Concluído',
}

/** Opção "sem sprint" em todos os selectores de sprint (formulários e Backlog). */
export const BACKLOG_OPTION_LABEL = 'Backlog do projecto (sem sprint)'

/**
 * Nome de um sprint num selector. Sprints concluídos não aceitam tarefas (a API responde 422):
 * só aparecem quando são o sprint actual da tarefa, identificados como tal.
 */
export function sprintOptionLabel(sprint: { name: string; status: SprintStatus }): string {
  return sprint.status === 'completed' ? `${sprint.name} (concluído)` : sprint.name
}

export const BACKUP_FREQUENCY_LABEL: Record<BackupFrequency, string> = {
  diario: 'Diário',
  semanal: 'Semanal',
  mensal: 'Mensal',
}

export const CREDENTIAL_TYPE_LABEL: Record<CredentialType, string> = {
  ssh: 'SSH',
  rdp: 'RDP',
  web: 'Web',
  database: 'Base de dados',
}

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
}

export const CLIENT_SOFTWARE_STATUS_LABEL: Record<ClientSoftwareStatus, string> = {
  desenvolvimento: 'Desenvolvimento',
  desenvolvimento_local: 'Desenvolvimento local',
  testes: 'Testes',
  producao: 'Produção',
  manutencao: 'Manutenção',
  descontinuado: 'Descontinuado',
}

export const MACHINE_ENVIRONMENT_LABEL: Record<MachineEnvironment, string> = {
  docker: 'Docker',
  tradicional: 'Tradicional',
}

export const MACHINE_ACCESS_TYPE_LABEL: Record<MachineAccessType, string> = {
  ssh: 'SSH',
  rdp: 'RDP',
  web: 'Web',
}

export const DEPLOYMENT_COMPONENT_LABEL: Record<DeploymentComponent, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  full: 'Full-stack',
  worker: 'Worker',
}

export const DEPLOYMENT_STATUS_LABEL: Record<DeploymentStatus, string> = {
  activo: 'Activo',
  testes: 'Testes',
  parado: 'Parado',
}

/** Chaves de um Record de rótulos, tipadas (para gerar opções de Select). */
export function optionKeys<K extends string>(record: Record<K, string>): K[] {
  return Object.keys(record) as K[]
}
