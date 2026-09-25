import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { createLabel, listLabels } from '@/api/labels'
import { Button } from '@/components/ui/Button'
import { FieldError, FormServerError } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Label as FieldLabel } from '@/components/ui/Label'
import { Spinner } from '@/components/ui/Spinner'
import { applyServerErrors, fieldA11y } from '@/lib/forms'
import { canCreateLabels } from '@/lib/projectPermissions'
import { cn } from '@/lib/utils'
import type { Label } from '@/types/projects'
import { projectLabelsKey } from './queryKeys'
import { useProjectPermissions } from './useProjectData'

const DEFAULT_COLOR = '#6366f1'

const newLabelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'O nome da etiqueta é obrigatório.')
    .max(255, 'O nome não pode ter mais de 255 caracteres.'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.'),
})
type NewLabelValues = z.infer<typeof newLabelSchema>

export function LabelChip({
  label,
  className,
}: {
  label: Pick<Label, 'name' | 'color'>
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs',
        className,
      )}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: label.color ?? 'currentColor' }}
        aria-hidden="true"
      />
      {label.name}
    </span>
  )
}

/**
 * Selecção múltipla de etiquetas do projecto (botões com `aria-pressed`) e criação rápida de
 * uma nova etiqueta. Não usa `<form>` para poder viver dentro de outros formulários.
 */
export function LabelPicker({
  projectId,
  value,
  onChange,
  idPrefix,
  disabled,
}: {
  projectId: number
  value: number[]
  onChange: (ids: number[]) => void
  idPrefix: string
  disabled?: boolean
}) {
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const labelsQuery = useQuery({
    queryKey: projectLabelsKey(projectId),
    queryFn: () => listLabels(projectId),
  })
  const selected = new Set(value)
  const canCreate = canCreateLabels(useProjectPermissions(projectId))

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<NewLabelValues>({
    resolver: zodResolver(newLabelSchema),
    defaultValues: { name: '', color: DEFAULT_COLOR },
  })

  const createMutation = useMutation({
    mutationFn: (values: NewLabelValues) => createLabel(projectId, values),
    onSuccess: (label) => {
      queryClient.setQueryData<Label[]>(projectLabelsKey(projectId), (old) => [
        ...(old ?? []),
        label,
      ])
      queryClient.invalidateQueries({ queryKey: projectLabelsKey(projectId) })
      onChange([...value, label.id])
      reset({ name: '', color: DEFAULT_COLOR })
      setCreating(false)
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['name', 'color'],
        fallback: 'Não foi possível criar a etiqueta.',
      }),
  })

  const submitNew = handleSubmit((values) => createMutation.mutate(values))

  function toggle(id: number) {
    onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  const labels = labelsQuery.data ?? []

  return (
    <div className="flex flex-col gap-2">
      {labelsQuery.isLoading ? (
        <Spinner />
      ) : labelsQuery.isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar as etiquetas.</p>
      ) : labels.length === 0 ? (
        <p className="text-sm text-muted-foreground">O projecto ainda não tem etiquetas.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Etiquetas">
          {labels.map((label) => {
            const isSelected = selected.has(label.id)
            return (
              <button
                key={label.id}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                onClick={() => toggle(label.id)}
                className={cn(
                  'rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                  isSelected ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100',
                )}
              >
                <LabelChip
                  label={label}
                  className={isSelected ? 'bg-muted font-medium' : undefined}
                />
              </button>
            )
          })}
        </div>
      )}

      {creating ? (
        <div className="flex flex-col gap-1.5 rounded-md border border-dashed border-border p-2">
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <FieldLabel htmlFor={`${idPrefix}-new-label-name`} className="text-xs">
                Nova etiqueta
              </FieldLabel>
              <Input
                className="h-8"
                {...fieldA11y(`${idPrefix}-new-label-name`, errors.name)}
                {...register('name')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void submitNew()
                  }
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor={`${idPrefix}-new-label-color`} className="text-xs">
                Cor
              </FieldLabel>
              <Input
                type="color"
                className="h-8 w-12 p-1"
                {...fieldA11y(`${idPrefix}-new-label-color`, errors.color)}
                {...register('color')}
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => void submitNew()}
              disabled={createMutation.isPending}
            >
              Criar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
          </div>
          <FieldError id={`${idPrefix}-new-label-name-error`} message={errors.name?.message} />
          <FieldError id={`${idPrefix}-new-label-color-error`} message={errors.color?.message} />
          <FormServerError message={errors.root?.server?.message} />
        </div>
      ) : canCreate ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="self-start"
          disabled={disabled}
          onClick={() => setCreating(true)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nova etiqueta
        </Button>
      ) : null}
    </div>
  )
}
