import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listWorkspaces } from '@/api/workspaces'
import { listProjects } from '@/api/projects'
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog'
import { WorkspaceFormDialog } from '@/components/projects/WorkspaceFormDialog'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Spinner'

export default function ProjectsListPage() {
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false)
  const [newProjectOpen, setNewProjectOpen] = useState(false)

  const workspacesQuery = useQuery({ queryKey: ['workspaces'], queryFn: listWorkspaces })
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: () => listProjects() })

  if (workspacesQuery.isLoading || projectsQuery.isLoading) return <LoadingState />
  if (workspacesQuery.isError || projectsQuery.isError) return <ErrorState />

  const workspaces = workspacesQuery.data ?? []
  const projects = projectsQuery.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projectos</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNewWorkspaceOpen(true)}>
            Novo workspace
          </Button>
          <Button disabled={workspaces.length === 0} onClick={() => setNewProjectOpen(true)}>
            Novo projecto
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="Ainda não existem projectos" description="Crie um workspace e um projecto para começar." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
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
                <CardContent className="text-sm text-muted-foreground">
                  {project.description ?? 'Sem descrição.'}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <WorkspaceFormDialog open={newWorkspaceOpen} onOpenChange={setNewWorkspaceOpen} />
      {newProjectOpen && <ProjectFormDialog open onOpenChange={setNewProjectOpen} workspaces={workspaces} />}
    </div>
  )
}
