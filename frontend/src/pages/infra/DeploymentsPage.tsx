import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { listDeployments } from '@/api/infra'
import { DeploymentFormDialog } from '@/components/infra/DeploymentFormDialog'
import { DeploymentsTable } from '@/components/infra/DeploymentsTable'
import { deploymentsKey } from '@/components/infra/queryKeys'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import { useInfraPermissions } from '@/hooks/useHasRole'

export default function DeploymentsPage() {
  const { canWrite } = useInfraPermissions()
  const [creating, setCreating] = useState(false)
  const { data, isLoading, isError } = useQuery({ queryKey: deploymentsKey, queryFn: () => listDeployments() })

  if (isLoading) return <LoadingState />
  if (isError) return <ErrorState message="Não foi possível carregar os deployments." />

  const deployments = data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Deployments</h1>
        {canWrite && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo deployment
          </Button>
        )}
      </div>

      {deployments.length === 0 ? (
        <EmptyState title="Ainda não existem deployments registados" />
      ) : (
        <DeploymentsTable deployments={deployments} canWrite={canWrite} />
      )}

      {creating && <DeploymentFormDialog deployment={null} onClose={() => setCreating(false)} />}
    </div>
  )
}
