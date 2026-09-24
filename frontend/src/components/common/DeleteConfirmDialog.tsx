import type { ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { mutationErrorMessage } from '@/lib/errors'

/**
 * Confirmação + mutação de remoção para um item. Aberto quando `item` não é `null`.
 * Usar com `key` do item para limpar o estado de erro entre itens.
 */
export function DeleteConfirmDialog<T>({
  item,
  onClose,
  title,
  description,
  remove,
  onDeleted,
  errorFallback = 'Não foi possível apagar.',
}: {
  item: T | null
  onClose: () => void
  title: string
  description?: ReactNode
  remove: (item: T) => Promise<void>
  onDeleted?: (item: T) => void
  errorFallback?: string
}) {
  const mutation = useMutation({
    mutationFn: remove,
    onSuccess: (_result, deleted) => {
      onDeleted?.(deleted)
      onClose()
    },
  })

  return (
    <ConfirmDialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) {
          mutation.reset()
          onClose()
        }
      }}
      title={title}
      description={description}
      onConfirm={() => item !== null && mutation.mutate(item)}
      isPending={mutation.isPending}
      error={mutation.isError ? mutationErrorMessage(mutation.error, errorFallback) : null}
    />
  )
}
