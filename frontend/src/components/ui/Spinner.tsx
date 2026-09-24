import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn('h-4 w-4 animate-spin text-muted-foreground', className)} aria-hidden="true" />
  )
}

export function LoadingState({ label = 'A carregar…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}

export function ErrorState({ message = 'Ocorreu um erro ao carregar os dados.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
      <p className="text-sm font-medium text-destructive">{message}</p>
    </div>
  )
}
