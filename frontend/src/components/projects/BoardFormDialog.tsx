import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createBoard } from '@/api/boards'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { FormField, FormServerError } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { applyServerErrors, fieldA11y } from '@/lib/forms'
import type { Board } from '@/types/projects'
import { projectBoardsKey } from './queryKeys'

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome do quadro é obrigatório.')
    .max(255, 'O nome não pode ter mais de 255 caracteres.'),
  is_default: z.boolean(),
  with_default_columns: z.boolean(),
})
type FormValues = z.infer<typeof schema>

/** Criação de um quadro Kanban. Montar só quando aberto. */
export function BoardFormDialog({
  projectId,
  isFirstBoard,
  open,
  onOpenChange,
  onCreated,
}: {
  projectId: number
  isFirstBoard: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (board: Board) => void
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: isFirstBoard ? 'Quadro principal' : '',
      is_default: isFirstBoard,
      with_default_columns: true,
    },
  })

  const mutation = useMutation({
    // As colunas base são criadas pela API (`with_default_columns`), nunca no cliente.
    mutationFn: (values: FormValues) =>
      createBoard(projectId, {
        name: values.name,
        is_default: values.is_default,
        with_default_columns: values.with_default_columns,
      }),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: projectBoardsKey(projectId) })
      onOpenChange(false)
      onCreated?.(board)
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['name', 'is_default', 'with_default_columns'],
        fallback: 'Não foi possível criar o quadro.',
      }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo quadro</DialogTitle>
          <DialogDescription>
            Um quadro organiza as tarefas do projecto por colunas. Normalmente basta um quadro por
            projecto; crie outro só para fluxos diferentes (ex.: suporte).
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <FormField id="board-name" label="Nome" error={errors.name}>
            <Input {...fieldA11y('board-name', errors.name)} {...register('name')} />
          </FormField>
          <div className="flex items-center gap-2">
            <input
              id="board-default"
              type="checkbox"
              className="h-4 w-4"
              {...register('is_default')}
            />
            <Label htmlFor="board-default">Quadro por omissão do projecto</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="board-starter"
              type="checkbox"
              className="h-4 w-4"
              {...register('with_default_columns')}
            />
            <Label htmlFor="board-starter">
              Criar colunas base (Por fazer, Em curso, Em revisão, Concluído)
            </Label>
          </div>
          <FormServerError message={errors.root?.server?.message} />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'A criar…' : 'Criar quadro'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
