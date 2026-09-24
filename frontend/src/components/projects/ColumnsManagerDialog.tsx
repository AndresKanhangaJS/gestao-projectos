import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Check, Trash2 } from 'lucide-react'
import { createColumn, deleteColumn, reorderColumns, updateColumn } from '@/api/boards'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { FieldError, FormServerError } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { mutationErrorMessage } from '@/lib/errors'
import { applyServerErrors, fieldA11y } from '@/lib/forms'
import type { Board, BoardColumn } from '@/types/projects'
import { projectBoardsKey, projectTasksKey } from './queryKeys'

const nameSchema = z.object({
  name: z.string().trim().min(1, 'O nome da coluna é obrigatório.').max(255, 'O nome não pode ter mais de 255 caracteres.'),
})
type NameValues = z.infer<typeof nameSchema>

function sortColumns(columns: BoardColumn[]): BoardColumn[] {
  return [...columns].sort((a, b) => a.position - b.position || a.id - b.id)
}

function ColumnRow({
  column,
  index,
  total,
  busy,
  onMove,
  onDelete,
  onChanged,
}: {
  column: BoardColumn
  index: number
  total: number
  busy: boolean
  onMove: (from: number, to: number) => void
  onDelete: (column: BoardColumn) => void
  onChanged: () => void
}) {
  const inputId = `column-${column.id}-name`
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
    reset,
  } = useForm<NameValues>({ resolver: zodResolver(nameSchema), defaultValues: { name: column.name } })

  const renameMutation = useMutation({
    mutationFn: (values: NameValues) => updateColumn(column.id, { name: values.name }),
    onSuccess: (updated) => {
      reset({ name: updated.name })
      onChanged()
    },
    onError: (error) =>
      applyServerErrors(error, setError, { fields: ['name'], fallback: 'Não foi possível renomear a coluna.' }),
  })

  const doneMutation = useMutation({
    mutationFn: (isDone: boolean) => updateColumn(column.id, { is_done_column: isDone }),
    onSuccess: onChanged,
  })

  return (
    <li className="flex flex-col gap-1 rounded-md border border-border p-2">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-0 flex-1 items-center gap-2"
          noValidate
          onSubmit={handleSubmit((values) => renameMutation.mutate(values))}
        >
          <Label htmlFor={inputId} className="sr-only">
            Nome da coluna
          </Label>
          <Input {...fieldA11y(inputId, errors.name)} {...register('name')} className="h-8" />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            disabled={!isDirty || renameMutation.isPending}
            aria-label={`Guardar nome da coluna ${column.name}`}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>
        <div className="flex items-center gap-1.5">
          <Checkbox
            id={`column-${column.id}-done`}
            checked={column.is_done_column}
            disabled={doneMutation.isPending}
            onCheckedChange={(checked) => doneMutation.mutate(checked === true)}
          />
          <Label htmlFor={`column-${column.id}-done`} className="text-xs font-normal">
            Concluído
          </Label>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={busy || index === 0}
          onClick={() => onMove(index, index - 1)}
          aria-label={`Mover coluna ${column.name} para cima (mais à esquerda no quadro)`}
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={busy || index === total - 1}
          onClick={() => onMove(index, index + 1)}
          aria-label={`Mover coluna ${column.name} para baixo (mais à direita no quadro)`}
        >
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive"
          onClick={() => onDelete(column)}
          aria-label={`Apagar coluna ${column.name}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <FieldError id={`${inputId}-error`} message={errors.name?.message} />
      <FormServerError message={errors.root?.server?.message} />
      {doneMutation.isError && (
        <p className="text-sm text-destructive" role="alert">
          {mutationErrorMessage(doneMutation.error)}
        </p>
      )}
    </li>
  )
}

function NewColumnForm({ board, nextPosition, onCreated }: { board: Board; nextPosition: number; onCreated: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<NameValues>({ resolver: zodResolver(nameSchema), defaultValues: { name: '' } })

  const mutation = useMutation({
    mutationFn: (values: NameValues) => createColumn(board.id, { name: values.name, position: nextPosition }),
    onSuccess: () => {
      reset({ name: '' })
      onCreated()
    },
    onError: (error) =>
      applyServerErrors(error, setError, { fields: ['name'], fallback: 'Não foi possível criar a coluna.' }),
  })

  return (
    <form className="flex flex-col gap-1.5" noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <Label htmlFor="new-column-name">Nova coluna</Label>
      <div className="flex gap-2">
        <Input placeholder="Ex.: Em revisão" {...fieldA11y('new-column-name', errors.name)} {...register('name')} />
        <Button type="submit" disabled={mutation.isPending}>
          Adicionar
        </Button>
      </div>
      <FieldError id="new-column-name-error" message={errors.name?.message} />
      <FormServerError message={errors.root?.server?.message} />
    </form>
  )
}

/**
 * Gestão das colunas de um quadro: criar, renomear, marcar como "concluído", reordenar
 * (botões acessíveis por teclado) e apagar (com confirmação).
 */
export function ColumnsManagerDialog({
  projectId,
  board,
  open,
  onOpenChange,
}: {
  projectId: number
  board: Board
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [toDelete, setToDelete] = useState<BoardColumn | null>(null)
  const columns = sortColumns(board.columns ?? [])
  const boardsKey = projectBoardsKey(projectId)

  const refresh = () => queryClient.invalidateQueries({ queryKey: boardsKey })

  const reorderMutation = useMutation({
    mutationFn: reorderColumns,
    onMutate: async (ordered) => {
      await queryClient.cancelQueries({ queryKey: boardsKey })
      const previous = queryClient.getQueryData<Board[]>(boardsKey)
      queryClient.setQueryData<Board[]>(boardsKey, (old) =>
        (old ?? []).map((b) =>
          b.id === board.id ? { ...b, columns: ordered.map((c, index) => ({ ...c, position: index })) } : b,
        ),
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(boardsKey, context.previous)
    },
    onSettled: refresh,
  })

  function move(from: number, to: number) {
    const ordered = [...columns]
    const [moved] = ordered.splice(from, 1)
    ordered.splice(to, 0, moved)
    reorderMutation.mutate(ordered)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Colunas de “{board.name}”</DialogTitle>
          <DialogDescription>
            Renomeie, reordene com as setas ou marque a coluna que representa trabalho concluído.
          </DialogDescription>
        </DialogHeader>

        {columns.length === 0 ? (
          <p className="mb-4 text-sm text-muted-foreground">Este quadro ainda não tem colunas.</p>
        ) : (
          <ol className="mb-4 flex flex-col gap-2" aria-label="Colunas do quadro">
            {columns.map((column, index) => (
              <ColumnRow
                key={column.id}
                column={column}
                index={index}
                total={columns.length}
                busy={reorderMutation.isPending}
                onMove={move}
                onDelete={setToDelete}
                onChanged={refresh}
              />
            ))}
          </ol>
        )}
        {reorderMutation.isError && (
          <p className="mb-2 text-sm text-destructive" role="alert">
            {mutationErrorMessage(reorderMutation.error, 'Não foi possível reordenar as colunas.')}
          </p>
        )}

        <NewColumnForm board={board} nextPosition={columns.length} onCreated={refresh} />

        <DeleteConfirmDialog
          key={toDelete?.id ?? 'none'}
          item={toDelete}
          onClose={() => setToDelete(null)}
          title={`Apagar a coluna “${toDelete?.name ?? ''}”?`}
          description="Só é possível apagar colunas sem tarefas. Mova as tarefas para outra coluna antes de apagar."
          remove={(column) => deleteColumn(column.id)}
          onDeleted={() => {
            refresh()
            queryClient.invalidateQueries({ queryKey: projectTasksKey(projectId) })
          }}
          // Um 422 da API (coluna com tarefas) é mostrado tal como vem em `errors.column`.
          errorFallback="Não foi possível apagar a coluna."
        />
      </DialogContent>
    </Dialog>
  )
}
