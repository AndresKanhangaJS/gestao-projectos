import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSoftwareProduct, updateSoftwareProduct } from '@/api/infra'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { FormField, FormServerError } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { applyServerErrors, emptyToNull, fieldA11y } from '@/lib/forms'
import type { SoftwareProduct } from '@/types/infra'
import { infraRootKey } from './queryKeys'

const schema = z.object({
  name: z.string().trim().min(1, 'O nome é obrigatório.').max(255, 'O nome não pode ter mais de 255 caracteres.'),
  category: z.string().max(255, 'Máximo de 255 caracteres.'),
  description: z.string(),
})
type FormValues = z.infer<typeof schema>

export function SoftwareProductFormDialog({
  product,
  open,
  onOpenChange,
}: {
  product: SoftwareProduct | null
  open: boolean
  onOpenChange: (open: boolean) => void
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
      name: product?.name ?? '',
      category: product?.category ?? '',
      description: product?.description ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        category: emptyToNull(values.category),
        description: emptyToNull(values.description),
      }
      return product ? updateSoftwareProduct(product.id, payload) : createSoftwareProduct(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: infraRootKey })
      onOpenChange(false)
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['name', 'category', 'description'],
        fallback: 'Não foi possível guardar o produto.',
      }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? 'Editar produto de software' : 'Novo produto de software'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <FormField id="sp-name" label="Nome" error={errors.name}>
            <Input {...fieldA11y('sp-name', errors.name)} {...register('name')} />
          </FormField>
          <FormField id="sp-category" label="Categoria" error={errors.category}>
            <Input {...fieldA11y('sp-category', errors.category)} {...register('category')} />
          </FormField>
          <FormField id="sp-description" label="Descrição" error={errors.description}>
            <Textarea {...fieldA11y('sp-description', errors.description)} {...register('description')} />
          </FormField>
          <FormServerError message={errors.root?.server?.message} />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'A guardar…' : product ? 'Guardar alterações' : 'Criar produto'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
