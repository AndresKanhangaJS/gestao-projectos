import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { InfoTooltip } from './InfoTooltip'
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
  help,
  className,
  children,
}: {
  id: string
  label: ReactNode
  error?: { message?: string }
  hint?: ReactNode
  /** Ajuda contextual (ícone "?") mostrada ao lado da label, fora do `<label>`. */
  help?: { label: string; text: ReactNode }
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {help ? (
        <div className="flex items-center gap-1">
          <Label htmlFor={id}>{label}</Label>
          <InfoTooltip label={help.label} text={help.text} />
        </div>
      ) : (
        <Label htmlFor={id}>{label}</Label>
      )}
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
