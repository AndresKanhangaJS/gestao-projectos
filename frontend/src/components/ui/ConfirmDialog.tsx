import type { ReactNode } from 'react'
import { Button } from './Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './Dialog'

/** Confirmação antes de acções destrutivas (apagar). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Apagar',
  pendingLabel = 'A apagar…',
  onConfirm,
  isPending = false,
  error,
  confirmVariant = 'destructive',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  pendingLabel?: string
  onConfirm: () => void
  isPending?: boolean
  error?: string | null
  /** `default` para confirmações não destrutivas (ex.: reactivar uma conta). */
  confirmVariant?: 'destructive' | 'default'
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent role="alertdialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {error && (
          <p className="mb-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={isPending}>
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
