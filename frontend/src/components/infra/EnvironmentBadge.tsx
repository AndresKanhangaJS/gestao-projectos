import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { MachineEnvironment } from '@/types/infra'

export function EnvironmentBadge({ environment }: { environment: MachineEnvironment }) {
  return environment === 'tradicional' ? (
    <Badge variant="warning" className="gap-1">
      <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Tradicional
    </Badge>
  ) : (
    <Badge variant="success">Docker</Badge>
  )
}
