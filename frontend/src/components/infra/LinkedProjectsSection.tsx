import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Spinner'
import type { ProjectSummaryRef } from '@/types/projects'

/**
 * Projectos (módulo Gestão de Projectos) ligados a este cliente ou software. A ligação faz-se no
 * formulário do projecto ("Relação com o cliente"). Só mostra o que a API devolve no overview.
 */
export function LinkedProjectsSection({
  projects,
  description,
  emptyDescription,
}: {
  projects: ProjectSummaryRef[]
  description: string
  emptyDescription: string
}) {
  return (
    <Card role="region" aria-labelledby="linked-projects-title">
      <CardHeader>
        <CardTitle id="linked-projects-title">Projectos</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <EmptyState title="Sem projectos ligados" description={emptyDescription} />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {projects.map((project) => (
              <li key={project.id} className="flex items-center justify-between gap-2 p-2 text-sm">
                <Link
                  to={`/projects/${project.id}`}
                  className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {project.key} · {project.name}
                </Link>
                <Badge variant={project.status === 'active' ? 'success' : 'secondary'}>
                  {project.status === 'active' ? 'Activo' : 'Arquivado'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
