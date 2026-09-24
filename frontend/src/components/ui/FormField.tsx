import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Label } from './Label'

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-sm text-destructive" role="alert">
      {message}
    </p>
  )
}

/**
 * Label + controlo + mensagem de erro (junto ao campo). O controlo deve receber
 * `fieldA11y(id, error)` (lib/forms) para ficar associado à label e ao erro.
 */
export function FormField({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string
  label: ReactNode
  error?: { message?: string }
  hint?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError id={`${id}-error`} message={error?.message} />
    </div>
  )
}

/** Erro global do formulário (ex.: 403, erro de rede, ou 422 sem campo correspondente). */
export function FormServerError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  )
}
