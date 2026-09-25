import { useQuery } from '@tanstack/react-query'
import { getProject } from '@/api/projects'
import { getWorkspace } from '@/api/workspaces'
import { permissionsOf } from '@/lib/projectPermissions'
import type { ProjectPermissions, WorkspaceMember } from '@/types/projects'
import { projectKey, workspaceKey } from './queryKeys'

/** Projecto em cache partilhada (`projectKey`); inclui `can`, `my_role` e `active_sprint`. */
export function useProject(projectId: number) {
  return useQuery({
    queryKey: projectKey(projectId),
    queryFn: () => getProject(projectId),
    enabled: projectId > 0,
  })
}

/** Permissões do utilizador no projecto (sem permissões enquanto carrega). */
export function useProjectPermissions(projectId: number): ProjectPermissions {
  return permissionsOf(useProject(projectId).data)
}

/** Membros do workspace a que o projecto pertence (candidatos a responsáveis). */
export function useProjectMembers(projectId: number): {
  members: WorkspaceMember[]
  workspaceId: number | undefined
  isLoading: boolean
  isError: boolean
} {
  const projectQuery = useProject(projectId)
  const workspaceId = projectQuery.data?.workspace_id
  const workspaceQuery = useQuery({
    queryKey: workspaceKey(workspaceId ?? 0),
    queryFn: () => getWorkspace(workspaceId as number),
    enabled: workspaceId != null,
  })
  return {
    members: workspaceQuery.data?.members ?? [],
    workspaceId,
    isLoading: projectQuery.isLoading || workspaceQuery.isLoading,
    isError: projectQuery.isError || workspaceQuery.isError,
  }
}
