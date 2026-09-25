import type { ProjectPermissions } from '@/types/projects'

/**
 * Permissões usadas quando a API ainda não devolve `can` (versões antigas): não esconde nada e
 * deixa a API decidir (403). A autorização real é sempre feita pelo backend.
 */
export const PERMISSIVE: ProjectPermissions = {
  create_task: true,
  delete_task: true,
  manage_board: true,
  manage_sprints: true,
  manage_members: true,
  create_label: true,
}

/** Enquanto o projecto/workspace carrega, não mostra acções de escrita. */
export const NO_PERMISSIONS: ProjectPermissions = {
  create_task: false,
  delete_task: false,
  manage_board: false,
  manage_sprints: false,
  manage_members: false,
  create_label: false,
}

/** Permissões de um recurso com `can` opcional (ver `PERMISSIVE`). */
export function permissionsOf(
  resource: { can?: ProjectPermissions } | null | undefined,
): ProjectPermissions {
  if (!resource) return NO_PERMISSIONS
  return resource.can ?? PERMISSIVE
}

/**
 * Editar tarefas (campos, mover no Kanban, responsáveis, etiquetas…) não tem flag própria no
 * contrato: quem pode criar tarefas pode editá-las; quem não pode (ex.: "viewer") vê em leitura.
 */
export function canEditTasks(can: ProjectPermissions): boolean {
  return can.create_task
}

/** Criar etiquetas: `can.create_label` (ou `create_task` se a API não o enviar). Editar/apagar = `manage_board`. */
export function canCreateLabels(can: ProjectPermissions): boolean {
  return can.create_label ?? can.create_task
}

/**
 * Criar projectos num workspace: `can.create_project`. Se a API não enviar `can` (ou a flag),
 * não esconde nada e deixa a API decidir.
 */
export function canCreateProjectIn(workspace: { can?: ProjectPermissions }): boolean {
  return workspace.can?.create_project ?? true
}

/** Editar o projecto (dados e ligação ao cliente): `can.update_project`, ou gestores (`manage_board`). */
export function canEditProject(can: ProjectPermissions): boolean {
  return can.update_project ?? can.manage_board
}

/** Mensagens mostradas junto a acções desactivadas por falta de permissão. */
export const NO_PERMISSION_REASON = {
  create_task:
    'Só membros, gestores e donos do workspace podem criar tarefas. O seu papel é só de leitura.',
  edit_task:
    'Só membros, gestores e donos do workspace podem alterar tarefas. O seu papel é só de leitura (pode comentar).',
  delete_task: 'Só gestores do workspace podem apagar tarefas.',
  manage_board: 'Só gestores do workspace podem criar quadros e gerir colunas.',
  manage_sprints: 'Só gestores do workspace podem criar, iniciar ou concluir sprints.',
  manage_members: 'Só gestores do workspace podem adicionar ou remover membros.',
  create_project: 'Só gestores e donos do workspace podem criar projectos aqui.',
} as const
