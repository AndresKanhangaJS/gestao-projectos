import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { listWorkspaces } from '@/api/workspaces'
import { getProjectLinkOptions, listProjects, type ProjectFilters } from '@/api/projects'
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog'
import { WorkspaceFormDialog } from '@/components/projects/WorkspaceFormDialog'
import { WorkspaceMembersDialog } from '@/components/projects/WorkspaceMembersDialog'
import { ProjectLinkBadges } from '@/components/projects/ProjectLinkBadges'
import { projectLinkOptionsKey, projectsKey, workspacesKey } from '@/components/projects/queryKeys'
import { Combobox } from '@/components/ui/Combobox'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Spinner'
import { HELP, WORKSPACE_ROLE_LABEL } from '@/lib/help'
import { NO_PERMISSION_REASON, canCreateProjectIn, permissionsOf } from '@/lib/projectPermissions'
import type { Workspace } from '@/types/projects'
import { WORKSPACE_CREATE_ROLES } from '@/lib/roles'
import { useHasRole } from '@/hooks/useHasRole'

const NO_WORKSPACE_REASON =
  'Só administradores e gestores de projecto podem criar workspaces. Peça a um deles que o adicione como membro de um workspace.'

function positiveInt(value: string | null): number | undefined {
  const n = Number(value)
  return value && Number.isInteger(n) && n > 0 ? n : undefined
}

/** Clientes (sem repetições, por nome) dos softwares indicados, para o filtro por cliente. */
function uniqueClients(products: { clients: { id: number; name: string }[] }[]) {
  const byId = new Map<number, string>()
  for (const product of products) for (const c of product.clients) byId.set(c.id, c.name)
  return [...byId.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'pt-PT'))
    .map(([id, name]) => ({ value: String(id), label: name }))
}

export default function ProjectsListPage() {
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false)
  const [newProjectWorkspace, setNewProjectWorkspace] = useState<Workspace | null>(null)
  const [membersWorkspaceId, setMembersWorkspaceId] = useState<number | null>(null)
  const canCreateWorkspace = useHasRole(...WORKSPACE_CREATE_ROLES)

  const [searchParams, setSearchParams] = useSearchParams()
  const filters: ProjectFilters = {
    client_id: positiveInt(searchParams.get('client_id')),
    software_product_id: positiveInt(searchParams.get('software_product_id')),
  }
  const filtering = filters.client_id != null || filters.software_product_id != null

  const workspacesQuery = useQuery({ queryKey: workspacesKey, queryFn: listWorkspaces })
  const projectsQuery = useQuery({
    queryKey: [...projectsKey, 'list', filters],
    queryFn: () => listProjects(filters),
  })
  const optionsQuery = useQuery({ queryKey: projectLinkOptionsKey, queryFn: getProjectLinkOptions })

  function setFilter(name: keyof ProjectFilters, value: string) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (value) params.set(name, value)
        else params.delete(name)
        // Ao mudar de software, um cliente que não o tenha deixa de fazer sentido.
        if (name === 'software_product_id' && value) {
          const product = optionsQuery.data?.software_products.find((p) => String(p.id) === value)
          const client = params.get('client_id')
          if (client && !product?.clients.some((c) => String(c.id) === client))
            params.delete('client_id')
        }
        return params
      },
      { replace: true },
    )
  }

  const linkProducts = optionsQuery.data?.software_products ?? []
  const softwareFilterOptions = linkProducts.map((p) => ({ value: String(p.id), label: p.name }))
  const clientFilterOptions = uniqueClients(
    filters.software_product_id != null
      ? linkProducts.filter((p) => p.id === filters.software_product_id)
      : linkProducts,
  )

  if (workspacesQuery.isLoading || projectsQuery.isLoading) return <LoadingState />
  if (workspacesQuery.isError || projectsQuery.isError) return <ErrorState />

  const workspaces = workspacesQuery.data ?? []
  const projects = projectsQuery.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <h1 className="text-xl font-semibold">Projectos</h1>
          <InfoTooltip {...HELP.structure} />
        </div>
        <div className="flex items-center gap-2">
          {canCreateWorkspace ? (
            <Button variant="outline" onClick={() => setNewWorkspaceOpen(true)}>
              Novo workspace
            </Button>
          ) : (
            <InfoTooltip icon="lock" label="Novo workspace" text={NO_WORKSPACE_REASON} />
          )}
        </div>
      </div>

      {workspaces.length > 0 && (
        <div
          role="search"
          aria-label="Filtrar projectos"
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex w-64 flex-col gap-1.5">
            <Label htmlFor="filter-software">Software</Label>
            <Combobox
              id="filter-software"
              value={filters.software_product_id != null ? String(filters.software_product_id) : ''}
              onChange={(value) => setFilter('software_product_id', value)}
              options={softwareFilterOptions}
              emptyLabel="Todos os softwares"
              placeholder="Todos os softwares"
            />
          </div>
          <div className="flex w-64 flex-col gap-1.5">
            <Label htmlFor="filter-client">Cliente</Label>
            <Combobox
              id="filter-client"
              value={filters.client_id != null ? String(filters.client_id) : ''}
              onChange={(value) => setFilter('client_id', value)}
              options={clientFilterOptions}
              emptyLabel="Todos os clientes"
              placeholder="Todos os clientes"
            />
          </div>
          {filtering && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchParams({}, { replace: true })}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {filtering && projects.length === 0 && workspaces.length > 0 && (
        <EmptyState
          title="Nenhum projecto com estes filtros"
          description="Experimente outro cliente ou software, ou limpe os filtros."
        />
      )}

      {workspaces.length === 0 ? (
        <EmptyState
          title="Ainda não existem workspaces"
          description={
            canCreateWorkspace
              ? 'Comece por criar um workspace (a sua equipa) e depois um projecto dentro dele.'
              : 'Ainda não é membro de nenhum workspace. ' + NO_WORKSPACE_REASON
          }
        />
      ) : (
        workspaces.map((workspace) => {
          const workspaceProjects = projects.filter((p) => p.workspace_id === workspace.id)
          // Com filtros, os workspaces sem resultados não se mostram.
          if (filtering && workspaceProjects.length === 0) return null
          const can = permissionsOf(workspace)
          const headingId = `workspace-${workspace.id}-title`
          return (
            <section key={workspace.id} aria-labelledby={headingId} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id={headingId} className="text-base font-semibold">
                    {workspace.name}
                  </h2>
                  <InfoTooltip {...HELP.workspace} />
                  {workspace.my_role && (
                    <Badge variant="secondary">
                      O meu papel: {WORKSPACE_ROLE_LABEL[workspace.my_role]}
                    </Badge>
                  )}
                  {workspace.members_count != null && (
                    <span className="text-xs text-muted-foreground">
                      {workspace.members_count} membro(s)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {can.manage_members && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMembersWorkspaceId(workspace.id)}
                    >
                      <Users className="h-4 w-4" aria-hidden="true" />
                      Membros
                    </Button>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Button
                      size="sm"
                      disabled={!canCreateProjectIn(workspace)}
                      onClick={() => setNewProjectWorkspace(workspace)}
                      aria-label={`Novo projecto em ${workspace.name}`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Novo projecto
                    </Button>
                    {!canCreateProjectIn(workspace) && (
                      <InfoTooltip
                        icon="lock"
                        label={`Novo projecto em ${workspace.name}`}
                        text={NO_PERMISSION_REASON.create_project}
                      />
                    )}
                  </span>
                </div>
              </div>
              {workspaceProjects.length === 0 ? (
                <EmptyState
                  title="Este workspace ainda não tem projectos"
                  description={
                    canCreateProjectIn(workspace)
                      ? 'Use “Novo projecto” para criar o primeiro.'
                      : 'Um gestor do workspace pode criar o primeiro projecto.'
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {workspaceProjects.map((project) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Card className="h-full transition-shadow hover:shadow-md">
                        <CardHeader>
                          <CardTitle>
                            {project.key} · {project.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                          <ProjectLinkBadges project={project} linked={false} />
                          <span>{project.description ?? 'Sem descrição.'}</span>
                          {project.active_sprint !== undefined && (
                            <span className="text-xs">
                              {project.active_sprint
                                ? `Sprint activo: ${project.active_sprint.name}`
                                : 'Sem sprint activo'}
                            </span>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )
        })
      )}

      <WorkspaceFormDialog open={newWorkspaceOpen} onOpenChange={setNewWorkspaceOpen} />
      {newProjectWorkspace && (
        <ProjectFormDialog
          open
          onOpenChange={(open) => !open && setNewProjectWorkspace(null)}
          workspaces={[newProjectWorkspace]}
        />
      )}
      {membersWorkspaceId != null && (
        <WorkspaceMembersDialog
          workspaceId={membersWorkspaceId}
          open
          onOpenChange={(open) => !open && setMembersWorkspaceId(null)}
        />
      )}
    </div>
  )
}
